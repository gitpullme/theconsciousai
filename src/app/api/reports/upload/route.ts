import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadReceipt } from "@/services/queue";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Report upload request received");
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request format. The request body must be valid JSON." },
        { status: 400 }
      );
    }
    
    const { image, hospitalId } = body;

    if (!image) {
      console.log("Missing image in upload request");
      return NextResponse.json(
        { error: "Medical report image is required" },
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

    // Basic validation of image data
    if (typeof image !== 'string' || image.length < 100) {
      console.error("Invalid image data format or size");
      return NextResponse.json(
        { error: "Invalid image data format" },
        { status: 400 }
      );
    }

    console.log(`Processing report for user ${session.user.id} to hospital ${hospitalId}`);
    
    // Upload and process the report (uses the existing receipt service)
    const receipt = await uploadReceipt(session.user.id, image, hospitalId);
    console.log(`Report processed successfully: ${receipt.id}, position: ${receipt.queuePosition}`);

    return NextResponse.json({
      id: receipt.id,
      status: receipt.status,
      queuePosition: receipt.queuePosition,
      hospitalName: receipt.hospital?.name,
      severity: receipt.severity,
      aiAnalysis: receipt.aiAnalysis,
      doctor: receipt.doctor ? {
        name: receipt.doctor.name,
        specialty: receipt.doctor.specialty
      } : null
    });
  } catch (error) {
    console.error("Error processing report:", error);
    
    // Provide more informative error message based on error type
    if (error instanceof Error) {
      if (error.message.includes("Gemini API")) {
        return NextResponse.json(
          { error: "AI analysis service unavailable. Please try again later." },
          { status: 503 }
        );
      } else if (error.message.includes("database")) {
        return NextResponse.json(
          { error: "Database error occurred. Please try again later." },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to process report. Please try again or contact support." },
      { status: 500 }
    );
  }
} 