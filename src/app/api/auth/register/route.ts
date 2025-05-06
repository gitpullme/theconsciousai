import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user with the email already exists - only check necessary field
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true } // Only select ID for faster query
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Use a transaction to create user and account in one operation
    const result = await prisma.$transaction(async (tx) => {
      // Create user and account in a single query
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: "USER",
          // Create account as part of the user creation
          accounts: {
            create: {
              type: "credentials",
              provider: "credentials",
              providerAccountId: email,
              refresh_token: hashedPassword
            }
          }
        },
        // Select only required fields for response
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });
      
      return user;
    }, {
      timeout: 5000 // 5 second timeout for the transaction
    });

    return NextResponse.json({
      message: "User registered successfully",
      user: result,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
} 