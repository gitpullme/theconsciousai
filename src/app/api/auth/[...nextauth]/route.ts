import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

        // Get user and include accounts
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            accounts: true,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (expectedRole === "HOSPITAL" && user.role !== "HOSPITAL") {
          throw new Error("This account is not registered as a hospital administrator");
        } else if (expectedRole === "USER" && user.role === "HOSPITAL") {
          throw new Error("Please use the hospital admin login");
        }

        // Find credentials account with password stored in refresh_token
        const credentialsAccount = user.accounts.find(
          account => account.provider === "credentials"
        );

        if (!credentialsAccount || !credentialsAccount.refresh_token) {
          // If no credentials found, check if user can log in with Google
          const googleAccount = user.accounts.find(
            account => account.provider === "google"
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

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          state: user.state,
          hospital: user.hospital,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      if (session?.user) {
        if (token) {
          session.user.id = token.sub || "";
          session.user.role = token.role as string || "USER";
          session.user.state = token.state as string || null;
          session.user.hospital = token.hospital as string || null;
        } else if (user) {
          session.user.id = user.id;
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
          });
          if (dbUser) {
            session.user.role = dbUser.role;
            session.user.state = dbUser.state;
            session.user.hospital = dbUser.hospital;
          }
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.state = dbUser.state;
          token.hospital = dbUser.hospital;
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
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 