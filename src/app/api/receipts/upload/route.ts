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
    console.log("Receipt upload request received");
    const body = await request.json();
    const { image, hospitalId } = body;

    if (!image) {
      console.log("Missing image in upload request");
      return NextResponse.json(
        { error: "Medical receipt image is required" },
        { status: 400 }
      );
    }

    if (!hospitalId) {
      console.log("Missing hospitalId in upload request");
      return NextResponse.json(
        { error: "Hospital ID is required" },
        { status: 400 }
      );
    }

    console.log(`Processing receipt for user ${session.user.id} to hospital ${hospitalId}`);
    
    // Upload and process the receipt
    const receipt = await uploadReceipt(session.user.id, image, hospitalId);
    console.log(`Receipt processed successfully: ${receipt.id}, position: ${receipt.queuePosition}`);

    return NextResponse.json({
      id: receipt.id,
      status: receipt.status,
      queuePosition: receipt.queuePosition,
      hospitalName: receipt.hospital?.name,
      severity: receipt.severity,
      processedAt: receipt.processedAt
    });
  } catch (error) {
    console.error("Error processing receipt:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
} 