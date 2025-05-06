import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { serializeUserDataForEmergency } from "@/lib/utils";
import logEmergencyAlert from "@/middleware/emergencyAlertLogger";

// POST - Send emergency alert to the selected hospital
export async function POST(req: Request) {
  logEmergencyAlert("API called");
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);

    if (!session) {
      logEmergencyAlert("No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logEmergencyAlert(`User authenticated with ID ${session.user.id}, role ${session.user.role}, state ${session.user.state || 'not set'}`);

    // Verify user is a patient/regular user
    if (session.user.role === "HOSPITAL" || session.user.role === "ADMIN") {
      logEmergencyAlert(`User with role ${session.user.role} attempted to send alert`);
      return NextResponse.json({ error: "Only patients can send emergency alerts" }, { status: 403 });
    }

    // Parse request body to get hospitalId
    let hospitalId: string | null = null;
    let reqBody = {};
    try {
      const body = await req.json();
      hospitalId = body.hospitalId;
      reqBody = body;
      logEmergencyAlert(`Request body parsed successfully, hospitalId: ${hospitalId || 'not provided'}`);
    } catch (e) {
      logEmergencyAlert("Error parsing request body:", e);
    }

    const userId = session.user.id;
    const userState = session.user.state;

    if (!userState) {
      logEmergencyAlert(`User ${userId} does not have state information`);
      return NextResponse.json(
        { error: "User location not found. Please update your profile with your state." },
        { status: 400 }
      );
    }

    // Get the user's medical history
    try {
      logEmergencyAlert(`Fetching user data for ${userId}`);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          dateOfBirth: true,
          gender: true,
          receipts: {
            orderBy: { uploatedAt: 'desc' },
            take: 5, // Get the 5 most recent reports
            select: {
              id: true,
              condition: true,
              aiAnalysis: true,
              severity: true,
              uploatedAt: true
            }
          },
          appointments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              symptoms: true,
              status: true,
              createdAt: true,
              doctor: {
                select: {
                  name: true,
                  specialty: true
                }
              },
              hospital: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        logEmergencyAlert(`User ${userId} not found in database`);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      logEmergencyAlert(`User ${userId} data fetched successfully`);

      // Find the selected hospital
      let targetHospital;
      
      if (hospitalId) {
        // Find the specific hospital requested
        logEmergencyAlert(`Looking for hospital with ID: ${hospitalId}`);
        
        targetHospital = await prisma.hospital.findUnique({
          where: {
            id: hospitalId
          },
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            state: true,
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        });
        
        logEmergencyAlert(`Hospital search result: ${targetHospital ? `Found: ${targetHospital.name} in ${targetHospital.state}` : 'Not found'}`);
        
        // Verify the hospital exists
        if (!targetHospital) {
          logEmergencyAlert(`Hospital with ID ${hospitalId} not found`);
          return NextResponse.json(
            { error: `Hospital with ID ${hospitalId} not found` },
            { status: 404 }
          );
        }
        
        // Verify the hospital is in the user's state for security
        if (targetHospital.state !== userState) {
          logEmergencyAlert(`Hospital state (${targetHospital.state}) does not match user state (${userState})`);
          return NextResponse.json(
            { error: `Selected hospital is in ${targetHospital.state}, but you are in ${userState}` },
            { status: 400 }
          );
        }
      } else {
        // No hospital ID provided, find hospitals in the state
        logEmergencyAlert(`No hospital ID provided, searching for hospitals in ${userState}`);
        
        const hospitals = await prisma.hospital.findMany({
          where: {
            state: userState
          },
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            state: true,
            user: {
              select: {
                id: true,
                email: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        });

        logEmergencyAlert(`Found ${hospitals.length} hospitals in ${userState}`);

        if (hospitals.length === 0) {
          return NextResponse.json(
            { error: `No hospitals found in ${userState}` },
            { status: 404 }
          );
        }

        // Pick the first hospital in the state
        targetHospital = hospitals[0];
        logEmergencyAlert(`Selected first hospital: ${targetHospital.name} (${targetHospital.id})`);
      }
      
      if (!targetHospital || !targetHospital.id) {
        logEmergencyAlert(`No valid target hospital found for user in state ${userState}`);
        return NextResponse.json(
          { error: "Could not find a valid hospital to send the alert to" },
          { status: 404 }
        );
      }
      
      // Create emergency alert record
      logEmergencyAlert(`Creating alert for user ${userId} to hospital ${targetHospital.id}`);
      
      try {
        // Create patient info as a simple flat object
        const patientInfo = {
          name: user.name || "Unknown",
          contact: user.phone || user.email || "No contact provided",
          address: user.address || "",
          city: user.city || "",
          state: user.state || "",
          pincode: user.pincode || "",
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
          gender: user.gender || ""
        };
        
        // Prepare medical history as a simple object with arrays
        const medicalHistory = {
          recentReports: user.receipts.map(receipt => ({
            id: receipt.id,
            condition: receipt.condition || "Not specified",
            analysis: receipt.aiAnalysis || "No analysis available",
            severity: receipt.severity || 0,
            date: receipt.uploatedAt.toISOString()
          })),
          recentAppointments: user.appointments.map(app => ({
            id: app.id,
            symptoms: app.symptoms || "Not specified",
            status: app.status,
            date: app.createdAt.toISOString(),
            doctorName: app.doctor?.name || null,
            doctorSpecialty: app.doctor?.specialty || null,
            hospitalName: app.hospital?.name || null
          }))
        };
        
        logEmergencyAlert("Creating emergency alert with structured data");
        
        // Create the alert with properly structured data
        const emergencyAlert = await prisma.emergencyAlert.create({
          data: {
            userId,
            hospitalId: targetHospital.id,
            status: "PENDING",
            patientInfo,
            medicalHistory
          }
        });

        logEmergencyAlert(`Created alert ID ${emergencyAlert.id}`);
        
        // Return a simple response immediately
        return NextResponse.json({
          success: true,
          message: `Emergency alert sent to ${targetHospital.name}`,
          alertId: emergencyAlert.id,
          hospitalInfo: {
            name: targetHospital.name,
            city: targetHospital.city,
            address: targetHospital.address
          }
        });
      } catch (createError) {
        logEmergencyAlert("Error creating emergency alert:", createError);
        
        // Check for specific error types
        let errorMessage = "Failed to create emergency alert";
        
        if (createError instanceof Error) {
          const errorDetails = createError.message;
          logEmergencyAlert(`Error details: ${errorDetails}`);
          
          if (errorDetails.includes("invalid input syntax for type json")) {
            errorMessage = "Invalid JSON format in patient data";
          } else if (errorDetails.includes("Foreign key constraint")) {
            errorMessage = "Invalid hospital or user reference";
          } else if (errorDetails.includes("syntax error")) {
            errorMessage = "Database syntax error";
          }
        }
        
        return NextResponse.json(
          { 
            error: errorMessage, 
            details: createError instanceof Error ? createError.message : String(createError)
          },
          { status: 500 }
        );
      }
    } catch (dbError) {
      logEmergencyAlert("Database error:", dbError);
      
      // Add more specific error logging and handling
      let errorMessage = "Database error while processing emergency alert";
      let errorDetails = "";
      
      if (dbError instanceof Error) {
        errorDetails = dbError.message;
        
        // Log stack trace for debugging
        logEmergencyAlert("Error stack:", dbError.stack);
        
        // Check for specific Prisma errors
        if (errorDetails.includes("Foreign key constraint")) {
          errorMessage = "Invalid hospital or user reference";
        } else if (errorDetails.includes("invalid input syntax")) {
          errorMessage = "Invalid data format";
        } else if (errorDetails.includes("connect ETIMEDOUT")) {
          errorMessage = "Database connection timeout";
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: errorDetails,
          requestBody: reqBody
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logEmergencyAlert("Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Failed to send emergency alert", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 