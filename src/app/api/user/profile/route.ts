import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// This endpoint provides full user profile data that is no longer stored in the JWT
// to reduce header size and prevent 431 errors in browsers like Edge
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Fetch detailed user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        state: true,
        hospital: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        address: true,
        image: true,
        // Don't include sensitive data like accounts or passwords
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to load user profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { name, state, dateOfBirth, gender, phone, address } = data;

    console.log("Updating user profile:", {
      userId: session.user.id,
      data: { name, state, dateOfBirth, gender, phone, address }
    });

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Properly handle the dateOfBirth
    let parsedDateOfBirth = null;
    if (dateOfBirth) {
      try {
        parsedDateOfBirth = new Date(dateOfBirth);
        // Check if date is valid
        if (isNaN(parsedDateOfBirth.getTime())) {
          console.error("Invalid date format received:", dateOfBirth);
          return NextResponse.json(
            { error: "Invalid date format" },
            { status: 400 }
          );
        }
      } catch (e) {
        console.error("Error parsing date:", e);
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData = {
      name,
      state,
      dateOfBirth: parsedDateOfBirth,
      gender: gender || null,
      phone: phone || null,
      address: address || null,
    };
    
    console.log("Updating with processed data:", updateData);

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    console.log("Update successful, user data:", {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      state: updatedUser.state,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender
    });

    // Transform date fields to strings for JSON serialization
    const safeUser = {
      ...updatedUser,
      dateOfBirth: updatedUser.dateOfBirth ? updatedUser.dateOfBirth.toISOString() : null,
      createdAt: updatedUser.createdAt ? updatedUser.createdAt.toISOString() : null,
      updatedAt: updatedUser.updatedAt ? updatedUser.updatedAt.toISOString() : null,
    };

    return NextResponse.json({
      message: "Profile updated successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
} 