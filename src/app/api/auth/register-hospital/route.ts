import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, hospitalName, address, state, city, pincode } = body;

    // Basic validation
    if (!name || !email || !password || !hospitalName || !address || !state || !city || !pincode) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create transaction to create user, account, and hospital
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user with HOSPITAL role
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: "HOSPITAL",
          state: state,
          hospital: hospitalName,
        },
      });

      // 2. Create account with the hashed password
      await tx.account.create({
        data: {
          userId: user.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: email,
          refresh_token: hashedPassword, // Store password here
          access_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
          id_token: null,
          session_state: null,
        },
      });

      // 3. Create hospital entry
      const hospital = await tx.hospital.create({
        data: {
          name: hospitalName,
          address: `${address}, ${pincode}`, // Include pincode in address
          state,
          city,
        },
      });

      return { user, hospital };
    });

    const { user, hospital } = result;

    return NextResponse.json({
      message: "Hospital registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      hospital,
    });
  } catch (error) {
    console.error("Hospital registration error:", error);
    return NextResponse.json(
      { 
        message: "Error registering hospital",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 