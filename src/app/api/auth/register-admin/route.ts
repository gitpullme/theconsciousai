import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password, hospitalName, state, city, address } = await req.json();

    // Basic validation
    if (!name || !email || !password || !hospitalName || !state) {
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
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Check if state exists, create if not
    let stateRecord = await prisma.state.findUnique({
      where: { name: state },
    });

    if (!stateRecord) {
      stateRecord = await prisma.state.create({
        data: { name: state },
      });
    }

    // Create the hospital
    const hospital = await prisma.hospital.create({
      data: {
        name: hospitalName,
        state,
        city,
        address,
      },
    });

    // Create the admin user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: "HOSPITAL",
        state,
        hospital: hospital.id,
        // Store the hashed password in the database
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: email,
            // Fields required by NextAuth schema
            refresh_token: null,
            access_token: null,
            expires_at: null,
            token_type: null,
            scope: null,
            id_token: null,
            session_state: null,
          },
        },
      },
    });

    // Update the user's account with the hashed password
    await prisma.account.update({
      where: { 
        provider_providerAccountId: {
          provider: "credentials",
          providerAccountId: email,
        } 
      },
      data: {
        refresh_token: hashedPassword,
      },
    });

    return NextResponse.json(
      { 
        message: "Hospital administrator created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hospital: {
            id: hospital.id,
            name: hospital.name,
          },
        } 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin registration error:", error);
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
} 