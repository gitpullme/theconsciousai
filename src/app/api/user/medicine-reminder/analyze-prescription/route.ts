import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { analyzePrescription } from "@/services/gemini";
import { authOptions } from "@/lib/auth";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error("No user ID in session:", JSON.stringify(session));
      return NextResponse.json({ error: "Unauthorized: No user ID found in session" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`Processing prescription for user: ${userId}`);

    // Get the form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Check file type
    const fileType = file.type;
    if (!fileType.startsWith('image/') && fileType !== 'application/pdf') {
      return NextResponse.json({ error: "Invalid file type. Only images and PDFs are allowed" }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    console.log(`Processing ${fileType} file for prescription analysis (${Math.round(file.size / 1024)} KB)`);

    // Call the AI service to analyze the prescription
    const medications = await analyzePrescription(base64Image);

    return NextResponse.json({
      success: true,
      medications
    });
  } catch (error) {
    console.error("Error analyzing prescription:", error);
    return NextResponse.json(
      { error: "Failed to analyze prescription. Please try again." },
      { status: 500 }
    );
  }
} 