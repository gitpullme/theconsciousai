import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  console.log("Registration request received");
  try {
    const { name, email, password } = await req.json();
    console.log(`Registration attempt for email: ${email}`);

    // Basic validation
    if (!name || !email || !password) {
      console.log("Missing required fields:", { name: !!name, email: !!email, password: !!password });
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user with the email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    console.log("Hashing password...");
    const hashedPassword = await hash(password, 10);

    console.log("Creating user and account...");
    try {
      // Create the user without using transaction first to simplify
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          role: "USER",
        },
      });
      
      console.log(`User created with ID: ${newUser.id}`);
      
      // Then create account with the hashed password
      const newAccount = await prisma.account.create({
        data: {
          userId: newUser.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: email,
          refresh_token: hashedPassword,
          access_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
          id_token: null,
          session_state: null,
        },
      });
      
      console.log(`Account created with ID: ${newAccount.id}`);
      
      return NextResponse.json(
        { 
          message: "User created successfully",
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          } 
        },
        { status: 201 }
      );
    } catch (innerError) {
      console.error("Error during user/account creation:", innerError);
      throw innerError; // Rethrow to be caught by outer catch
    }
  } catch (error) {
    console.error("Registration error:", error);
    // Get more detailed error information to help debugging
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : "Unknown error during registration";
      
    console.error("Detailed error:", errorMessage);
    
    return NextResponse.json(
      { message: "An error occurred during registration", error: errorMessage },
      { status: 500 }
    );
  }
} 