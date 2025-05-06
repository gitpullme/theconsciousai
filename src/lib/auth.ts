import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Cache for reducing repeated user lookups during the same session
const userCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache TTL

// Helper function to get user with accounts, with caching
async function getUserWithAccounts(email: string) {
  const cacheKey = `user:${email}`;
  
  // Check cache first
  const cached = userCache.get(cacheKey);
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return cached.data;
  }
  
  // Not in cache or expired, fetch from database
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: true,
    },
  });
  
  // Store in cache
  if (user) {
    userCache.set(cacheKey, {
      data: user,
      timestamp: Date.now()
    });
  }
  
  return user;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const expectedRole = credentials.role || "USER";
        
        // Use the cached function instead of direct database query
        const user = await getUserWithAccounts(credentials.email);

        if (!user) {
          throw new Error("User not found");
        }

        // Quick role check first - avoid unnecessary password verification
        if (expectedRole === "HOSPITAL" && user.role !== "HOSPITAL") {
          throw new Error("This account is not registered as a hospital administrator");
        } else if (expectedRole === "USER" && user.role === "HOSPITAL") {
          throw new Error("Please use the hospital admin login");
        }

        // Find credentials account with password stored in refresh_token
        const credentialsAccount = user.accounts.find(
          (account: any) => account.provider === "credentials"
        );

        if (!credentialsAccount || !credentialsAccount.refresh_token) {
          // If no credentials found, check if user can log in with Google
          const googleAccount = user.accounts.find(
            (account: any) => account.provider === "google"
          );
          
          if (googleAccount) {
            throw new Error("Please log in with Google");
          } else {
            throw new Error("Invalid login method");
          }
        }

        // Compare the provided password with the stored hash in refresh_token
        const passwordMatch = await compare(
          credentials.password, 
          credentialsAccount.refresh_token
        );

        if (!passwordMatch) {
          throw new Error("Invalid credentials");
        }

        // Just return minimal user data needed for auth
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      if (session?.user) {
        if (token) {
          // Set the user ID - this is crucial for all API operations
          session.user.id = token.sub || "";
          session.user.role = token.role as string || "USER";
          
          // Include profile fields from token if they exist
          if (token.name) session.user.name = token.name as string;
          if (token.email) session.user.email = token.email as string;
          if (token.picture) session.user.image = token.picture as string;
          
          // Add all user profile fields
          if (token.state) session.user.state = token.state as string;
          if (token.dateOfBirth) session.user.dateOfBirth = token.dateOfBirth as string;
          if (token.gender) session.user.gender = token.gender as string;
          if (token.phone) session.user.phone = token.phone as string;
          if (token.address) session.user.address = token.address as string;
          
          // Add hospital info if applicable - IMPORTANT for hospital admins
          if (token.hospital) {
            session.user.hospital = token.hospital as string;
          }
        } else if (user) {
          session.user.id = user.id;
          session.user.role = user.role;
          
          // For database adapter flow
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              role: true,
              hospital: true,
              image: true,
              state: true,
              dateOfBirth: true,
              gender: true,
              phone: true,
              address: true
            }
          });
          
          if (dbUser) {
            session.user.role = dbUser.role;
            if (dbUser.hospital) session.user.hospital = dbUser.hospital;
            if (dbUser.image) session.user.image = dbUser.image;
            if (dbUser.state) session.user.state = dbUser.state;
            if (dbUser.dateOfBirth) session.user.dateOfBirth = dbUser.dateOfBirth as unknown as string;
            if (dbUser.gender) session.user.gender = dbUser.gender;
            if (dbUser.phone) session.user.phone = dbUser.phone;
            if (dbUser.address) session.user.address = dbUser.address;
          }
        }
      }
      
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        
        // For credential providers
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            hospital: true,
            image: true,
            state: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
            address: true
          }
        });

        if (dbUser) {
          token.role = dbUser.role;
          
          if (dbUser.hospital) {
            token.hospital = dbUser.hospital;
          }
          
          if (dbUser.image) {
            token.picture = dbUser.image;
          }
          
          // Add all profile fields to token
          if (dbUser.state) token.state = dbUser.state;
          if (dbUser.dateOfBirth) token.dateOfBirth = dbUser.dateOfBirth;
          if (dbUser.gender) token.gender = dbUser.gender;
          if (dbUser.phone) token.phone = dbUser.phone;
          if (dbUser.address) token.address = dbUser.address;
        }
      }
      
      // Handle token updates when session is updated by client
      if (trigger === "update" && session) {
        console.log("Updating JWT with session data:", session.user);
        
        // Update token with new user data from session
        if (session.user) {
          if (session.user.name) token.name = session.user.name;
          if (session.user.state) token.state = session.user.state;
          if (session.user.dateOfBirth) token.dateOfBirth = session.user.dateOfBirth;
          if (session.user.gender) token.gender = session.user.gender;
          if (session.user.phone) token.phone = session.user.phone;
          if (session.user.address) token.address = session.user.address;
          if (session.user.hospital) token.hospital = session.user.hospital;
        }
      }
      
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
}; 