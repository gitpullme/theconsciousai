import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Both hospital users and admin users can update hospital ID
    if (session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only hospital administrators and admins can update hospital assignments" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { hospitalId } = body;

    if (!hospitalId) {
      return NextResponse.json(
        { error: "Hospital ID is required" },
        { status: 400 }
      );
    }

    // Verify the hospital exists
    try {
      // @ts-ignore: Bypass TypeScript errors for Prisma client
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
      });

      if (!hospital) {
        return NextResponse.json(
          { error: "Hospital not found" },
          { status: 404 }
        );
      }
    } catch (dbError) {
      console.error("Database error checking hospital:", dbError);
      return NextResponse.json(
        { error: "Failed to verify hospital" },
        { status: 500 }
      );
    }

    // Update the user's hospital ID
    try {
      // @ts-ignore: Bypass TypeScript errors for Prisma client
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { hospital: hospitalId },
      });

      console.log(`Updated hospital ID for user ${session.user.id} to ${hospitalId}`);

      // If hospital ID was updated, fetch hospital details to return
      let hospitalDetails = null;
      if (hospitalId) {
        try {
          // @ts-ignore: Bypass TypeScript errors for Prisma client
          hospitalDetails = await prisma.hospital.findUnique({
            where: { id: hospitalId },
            select: {
              id: true,
              name: true,
              state: true,
              city: true,
              address: true
            }
          });
        } catch (error) {
          console.error("Error fetching hospital details:", error);
        }
      }

      return NextResponse.json({
        message: "Hospital updated successfully",
        user: {
          id: updatedUser.id,
          hospital: updatedUser.hospital,
        },
        hospitalDetails
      });
    } catch (dbError) {
      console.error("Database error updating user hospital:", dbError);
      return NextResponse.json(
        { error: "Failed to update hospital" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in update-hospital API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Add support for PUT method with the same implementation
export { POST as PUT }; 