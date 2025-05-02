import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { uploadReceipt } from "@/services/queue";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { image, hospitalId } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Medical receipt image is required" },
        { status: 400 }
      );
    }

    if (!hospitalId) {
      return NextResponse.json(
        { error: "Hospital ID is required" },
        { status: 400 }
      );
    }

    // Upload and process the receipt
    const receipt = await uploadReceipt(session.user.id, image, hospitalId);

    return NextResponse.json(receipt);
  } catch (error) {
    console.error("Error processing receipt:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
} 