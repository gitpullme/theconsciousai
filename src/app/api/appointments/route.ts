import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { analyzeSymptoms } from "@/services/ai";

// GET - Fetch appointments (different behavior based on user role)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Appointments API - User session:", {
      id: session.user.id,
      role: session.user.role,
      hospital: session.user.hospital
    });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userId = session.user.id;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10); // Default to 50 records
    const skip = (page - 1) * limit;

    // For hospital users, return all appointments for their hospital
    if (session.user.role === "HOSPITAL") {
      try {
        // Check if hospital ID is directly available on the session
        const hospitalId = session.user.hospital;
        
        if (!hospitalId) {
          console.error("Hospital user has no hospital ID in session:", {
            userId: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role
          });
          
          // Try to find the hospital ID from the user record if not in session
          const user = await prisma.user.findUnique({
            where: { id: session.user.id }
          });
          
          if (user && user.hospital) {
            console.log("Found hospital ID in user record:", user.hospital);
            return NextResponse.json(
              { error: "Hospital ID found in database but not in session. Please log out and log in again." },
              { status: 403 }
            );
          }
          
          return NextResponse.json(
            { error: "Hospital ID not found for this administrator" },
            { status: 404 }
          );
        }
        
        console.log("Fetching appointments for hospital ID:", hospitalId);
        
        // Build optimized where clause to reduce query complexity
        const whereClause: any = { hospitalId: hospitalId };
        if (status) {
          whereClause.status = status;
        }
        
        // Use a transaction to get both count and data in a single round-trip
        const [total, appointments] = await prisma.$transaction([
          // Get total count for pagination
          prisma.appointment.count({
            where: whereClause
          }),
          
          // Get appointments with pagination
          prisma.appointment.findMany({
            where: whereClause,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  phone: true,
                  gender: true,
                  dateOfBirth: true,
                },
              },
              doctor: true,
              hospital: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  state: true
                }
              },
            },
            orderBy: [
              { severity: "desc" },
              { preferredDate: "asc" },
            ],
            skip,
            take: limit
          })
        ]);

        console.log(`Found ${appointments.length} appointments for hospital ${hospitalId} (total: ${total})`);
        
        // Ensure all appointments have valid user data by directly accessing the database again in a separate query
        // Instead of trying to do complex Promise.all handling which may cause issues
        
        // Prepare appointments with guaranteed user data
        const processedAppointments = appointments.map(appointment => {
          if (!appointment.user) {
            // Create a placeholder for missing users
            return {
              ...appointment,
              user: {
                id: appointment.userId,
                name: `Patient ${appointment.userId.substring(0, 6)}...`,
                email: "Email not available",
                image: null
              }
            };
          }
          return appointment;
        });
        
        // Return with cache control headers for better performance
        const response = NextResponse.json({
          appointments: processedAppointments,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        });
        
        // Add cache headers - browser can cache for 10 seconds,
        // then use stale version for up to 60 seconds while revalidating
        response.headers.set('Cache-Control', 'max-age=10, stale-while-revalidate=60');
        
        return response;
      } catch (error) {
        console.error("Error fetching hospital appointments:", error);
        return NextResponse.json(
          { error: "Error fetching hospital appointments", details: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    } else {
      // For regular users, return only their appointments with pagination
      try {
        console.log(`Fetching appointments for user ID: ${userId}`);
        
        // Build optimized where clause
        const whereClause: any = { userId };
        if (status) {
          whereClause.status = status;
        }
        
        // Use a transaction to get both count and data in a single round-trip
        const [total, appointments] = await prisma.$transaction([
          // Get total count for pagination
          prisma.appointment.count({
            where: whereClause
          }),
          
          // Get appointments with pagination
          prisma.appointment.findMany({
            where: whereClause,
            include: {
              hospital: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  state: true,
                  address: true
                }
              },
              doctor: true,
            },
            orderBy: [
              { createdAt: "desc" },
            ],
            skip,
            take: limit
          })
        ]);

        console.log(`Found ${appointments.length} appointments for user ${userId} (total: ${total})`);
        
        // Return with cache control headers
        const response = NextResponse.json({
          appointments,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        });
        
        // Add cache headers for better performance
        response.headers.set('Cache-Control', 'max-age=10, stale-while-revalidate=60');
        
        return response;
      } catch (error) {
        console.error("Error fetching user appointments:", error);
        return NextResponse.json(
          { error: "Error fetching your appointments", details: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Unexpected error in appointments API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST - Create a new appointment
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Creating appointment - Session details:", {
      id: session?.user?.id,
      email: session?.user?.email,
      role: session?.user?.role,
      sessionObject: JSON.stringify(session)
    });
    
    if (!session.user || !session.user.id) {
      console.error("Invalid session structure - missing user ID:", session);
      return NextResponse.json(
        { error: "Authentication error: Invalid session structure. Please log out and log in again." },
        { status: 401 }
      );
    }

    console.log("Creating appointment for user:", session.user.id);
    
    const body = await req.json();
    let { hospitalId, preferredDate, symptoms } = body;

    if (!hospitalId || !preferredDate || !symptoms) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Convert preferredDate to a proper Date object if it's not already
    if (!(preferredDate instanceof Date)) {
      try {
        console.log("Converting preferred date from string:", preferredDate);
        preferredDate = new Date(preferredDate);
        
        if (isNaN(preferredDate.getTime())) {
          console.error("Invalid date format received:", body.preferredDate);
          throw new Error("Invalid date format");
        }
        
        console.log("Converted date:", preferredDate.toISOString());
      } catch (error) {
        console.error("Date conversion error:", error);
        return NextResponse.json(
          { error: "Invalid date format for preferredDate. Please use YYYY-MM-DD format." },
          { status: 400 }
        );
      }
    }
    
    // Validate that preferred date is in the future
    const now = new Date();
    if (preferredDate < now) {
      console.error("Appointment date is in the past:", preferredDate);
      return NextResponse.json(
        { error: "Appointment date must be in the future" },
        { status: 400 }
      );
    }
    
    console.log("Appointment request data validated, analyzing symptoms");

    // Validate hospital exists
    try {
      console.log("Validating hospital ID:", hospitalId);
      
      // @ts-ignore: Bypass TypeScript errors for Prisma client
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId }
      });
      
      if (!hospital) {
        console.error("Hospital not found:", hospitalId);
        
        // Check if any hospitals exist, for debugging
        // @ts-ignore: Bypass TypeScript errors for Prisma client
        const hospitals = await prisma.hospital.findMany({
          take: 5
        });
        
        if (hospitals.length === 0) {
          console.error("No hospitals found in database.");
          return NextResponse.json(
            { error: "No hospitals available in our system. Please contact support." },
            { status: 404 }
          );
        }
        
        console.log("Available hospitals:", hospitals);
        return NextResponse.json(
          { error: "Selected hospital not found. Please select a different hospital." },
          { status: 404 }
        );
      } else {
        console.log("Hospital validated successfully:", hospital.name);
      }
    } catch (dbError) {
      console.error("Error verifying hospital:", dbError);
      return NextResponse.json(
        { error: "Error verifying hospital. Please try again later." },
        { status: 500 }
      );
    }

    // Get AI analysis of symptoms with error handling
    let aiAnalysisResult;
    try {
      console.log("Starting symptom analysis");
      aiAnalysisResult = await analyzeSymptoms(symptoms);
      console.log("Symptom analysis complete:", {
        severity: aiAnalysisResult.severity,
        analysisLength: aiAnalysisResult.analysis?.length || 0
      });
    } catch (analysisError) {
      console.error("AI analysis error:", analysisError);
      // Use a fallback if AI fails
      aiAnalysisResult = {
        severity: 3,
        analysis: "1. Initial Assessment: Patient symptoms require medical attention.\n2. Severity: 3/10\n3. Priority Level: Medium\n4. Possible Conditions: To be determined by medical staff\n5. Recommendation: Please consult with a doctor for proper diagnosis.\n6. Specialist Recommendation: General Practitioner"
      };
      console.log("Using fallback analysis due to error");
    }
    
    // Determine specialty from AI analysis for auto-assignment
    let recommendedSpecialty = "General Medicine"; // Default specialty
    let doctorId = null;
    
    try {
      // Extract specialty from AI analysis
      const analysis = aiAnalysisResult.analysis.toLowerCase();
      
      // Look for direct specialty recommendations in the analysis
      const specialtyMatch = analysis.match(/specialist recommendation:?\s*([a-zA-Z\s]+)(?:\.|$|\n)/i);
      if (specialtyMatch && specialtyMatch[1]) {
        recommendedSpecialty = specialtyMatch[1].trim();
      } else {
        // Map common conditions to specialties
        if (analysis.includes('heart') || analysis.includes('chest pain') || analysis.includes('cardiac')) {
          recommendedSpecialty = 'Cardiology';
        } else if (analysis.includes('brain') || analysis.includes('headache') || analysis.includes('neural') || 
                analysis.includes('seizure') || analysis.includes('stroke')) {
          recommendedSpecialty = 'Neurology';
        } else if (analysis.includes('bone') || analysis.includes('fracture') || analysis.includes('joint') || 
                analysis.includes('sprain')) {
          recommendedSpecialty = 'Orthopedics';
        } else if (analysis.includes('child') || analysis.includes('infant') || analysis.includes('pediatric')) {
          recommendedSpecialty = 'Pediatrics';
        } else if (analysis.includes('skin') || analysis.includes('rash') || analysis.includes('acne')) {
          recommendedSpecialty = 'Dermatology';
        } else if (analysis.includes('eye') || analysis.includes('vision') || analysis.includes('sight')) {
          recommendedSpecialty = 'Ophthalmology';
        } else if (analysis.includes('mental') || analysis.includes('anxiety') || analysis.includes('depression')) {
          recommendedSpecialty = 'Psychiatry';
        } else if (analysis.includes('emergency') || analysis.includes('urgent') || analysis.includes('critical')) {
          recommendedSpecialty = 'Emergency Medicine';
        }
      }
      
      console.log(`Determined specialty from analysis: ${recommendedSpecialty}`);
      
      // Try to find an available doctor with the matching specialty
      // @ts-ignore: Bypass TypeScript errors for Prisma client
      const doctor = await prisma.doctor.findFirst({
        where: {
          hospitalId,
          specialty: recommendedSpecialty,
          available: true
        }
      });
      
      if (doctor) {
        doctorId = doctor.id;
        console.log(`Auto-assigned doctor: ${doctor.name} (${doctor.specialty})`);
      } else {
        // If no doctor with matching specialty is available, try to find any available doctor
        // @ts-ignore: Bypass TypeScript errors for Prisma client
        const anyDoctor = await prisma.doctor.findFirst({
          where: {
            hospitalId,
            available: true
          }
        });
        
        if (anyDoctor) {
          doctorId = anyDoctor.id;
          console.log(`No ${recommendedSpecialty} specialist available. Auto-assigned available doctor: ${anyDoctor.name} (${anyDoctor.specialty})`);
        } else {
          console.log("No available doctors found for auto-assignment");
        }
      }
    } catch (autoAssignError) {
      console.error("Error during doctor auto-assignment:", autoAssignError);
      // Continue without auto-assignment if it fails
    }
    
    // Extra validation for date to ensure it's properly parsed
    let parsedDate: Date;
    try {
      parsedDate = new Date(preferredDate);
      if (isNaN(parsedDate.getTime())) {
        console.error("Invalid date format after parsing:", preferredDate);
        return NextResponse.json(
          { error: "Invalid appointment date format. Please select a valid date." },
          { status: 400 }
        );
      }
      console.log("Successfully parsed date:", parsedDate.toISOString());
    } catch (dateError) {
      console.error("Error parsing date:", dateError);
      return NextResponse.json(
        { error: "Unable to process the selected date. Please try a different date." },
        { status: 400 }
      );
    }

    // Verify that user exists
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (!user) {
        console.error("User not found in database:", session.user.id);
        return NextResponse.json(
          { error: "User account not found. Please log out and log in again." },
          { status: 404 }
        );
      }
      
      console.log("User validated successfully");
    } catch (userError) {
      console.error("Error verifying user:", userError);
    }

    try {
      // Create the appointment with the validated date
      const appointmentData = {
        userId: session.user.id,
        hospitalId,
        preferredDate: parsedDate,
        symptoms,
        aiAnalysis: aiAnalysisResult.analysis,
        severity: aiAnalysisResult.severity,
        status: "PENDING",
        doctorId: doctorId,
      };
      
      console.log("Creating appointment with data:", appointmentData);
      
      // Verify userId is not null or undefined before proceeding
      if (!appointmentData.userId) {
        console.error("Cannot create appointment: userId is missing", { session });
        return NextResponse.json(
          { error: "Authentication issue: User ID is missing. Please try logging out and logging in again." },
          { status: 401 }
        );
      }
      
      // Verify Prisma is correctly connected and the schema is accessed
      try {
        console.log("Testing Prisma connection before appointment creation");
        // Test a simple query to verify database connection
        await prisma.$queryRaw`SELECT 1 as connection_test`;
        
        // Test that we can access the appointment model
        const totalAppointments = await prisma.appointment.count({
          where: { userId: session.user.id }
        });
        console.log(`User has ${totalAppointments} existing appointments`);
      } catch (connError) {
        console.error("Prisma connection test failed before appointment creation:", connError);
        return NextResponse.json(
          { error: "Database connection issue. Please try again later." },
          { status: 503 }
        );
      }
      
      try {
        // Try creating the appointment with a more specific approach to catch schema errors
        console.log("Attempting to create appointment with explicit fields");
        
        // @ts-ignore: Bypass TypeScript errors for Prisma client
        const appointment = await prisma.appointment.create({
          data: {
            userId: appointmentData.userId,
            hospitalId: appointmentData.hospitalId,
            preferredDate: appointmentData.preferredDate,
            symptoms: appointmentData.symptoms,
            aiAnalysis: appointmentData.aiAnalysis,
            severity: appointmentData.severity,
            status: "PENDING",
            doctorId: appointmentData.doctorId,
          },
          // Only include minimal necessary data in the response to improve speed
          select: {
            id: true,
            status: true,
            preferredDate: true,
            severity: true,
            createdAt: true
          }
        });
        
        console.log("Appointment created successfully with ID:", appointment.id);
        
        // Send the response immediately before doing any additional operations
        const response = NextResponse.json(appointment);
        
        // Continue with any background logging/operations after sending the response
        // These won't block the response from being sent
        Promise.resolve().then(async () => {
          try {
            // Log additional details or perform background operations
            console.log("Performing background operations after response sent");
            
            // Optional: Load full appointment details for logging purposes only
            const fullAppointment = await prisma.appointment.findUnique({
              where: { id: appointment.id },
              include: {
                doctor: true,
                hospital: true
              }
            });
            
            console.log("Full appointment details loaded for logging:", 
              fullAppointment ? { 
                id: fullAppointment.id,
                hospital: fullAppointment.hospital?.name,
                doctor: fullAppointment.doctor?.name
              } : "Not found");
          } catch (bgError) {
            // Just log background errors, they won't affect the response
            console.error("Background operation error (non-blocking):", bgError);
          }
        });
        
        return response;
      } catch (dbError: any) {
        console.error("Database error creating appointment:", dbError);
        console.error("Error details:", {
          name: dbError.name,
          code: dbError.code,
          message: dbError.message,
          meta: dbError.meta,
          stack: dbError.stack
        });
        
        // Log the exact data we tried to submit
        console.error("Appointment data that failed:", JSON.stringify(appointmentData, null, 2));
        
        // Try to get detailed database connection status
        try {
          await prisma.$queryRaw`SELECT 1`;
          console.log("Database connection is working");
        } catch (connError) {
          console.error("Database connection check failed:", connError);
        }
        
        // Check for specific error types
        if (dbError.code === 'P2002') {
          return NextResponse.json(
            { error: "You may already have a similar appointment scheduled. Please check your existing appointments." },
            { status: 400 }
          );
        } else if (dbError.code === 'P2003') {
          return NextResponse.json(
            { error: "Unable to create appointment: The selected hospital or doctor may not exist in our system." },
            { status: 400 }
          );
        } else if (dbError.code === 'P2025') {
          return NextResponse.json(
            { error: "Record not found: " + dbError.meta?.cause },
            { status: 404 }
          );
        }
        
        // Check for common errors with dates
        if (dbError.message && dbError.message.includes('date')) {
          return NextResponse.json(
            { error: "There was an issue with the appointment date. Please select a different date and try again." },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: "Failed to create appointment in database. Please try again or contact support." },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Unexpected error in appointment creation:", error);
      return NextResponse.json(
        { error: "An unexpected error occurred while creating your appointment. Please try again later." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in appointment creation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating your appointment. Please try again later." },
      { status: 500 }
    );
  }
} 