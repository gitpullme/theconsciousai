import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

// Define types for our medical history entries
interface PatientInfo {
  type: "PatientInformation";
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  age: string;
  state: string;
  phone: string;
  address: string;
}

interface MedicalRecord {
  type: "MedicalRecord";
  date: Date;
  formattedDate: string;
  condition: string;
  severity: number;
  severityText: string;
  hospital: string;
  doctor: string;
  analysis: string;
}

type MedicalHistoryEntry = PatientInfo | MedicalRecord;

export async function POST(req: Request) {
  try {
    const { message, patientId, history, userProfile } = await req.json();
    
    // Determine if we should use real user data or sample data
    let medicalHistory: MedicalHistoryEntry[] = [];
    let userDetails: Omit<PatientInfo, 'type'> = {
      name: "User",
      email: "",
      gender: "Not specified",
      dateOfBirth: "Not specified",
      age: "Unknown",
      state: "Not specified",
      phone: "Not specified",
      address: "Not specified"
    };
    
    if (userProfile) {
      // Format date of birth in a more readable way if available
      let formattedDOB = "Not specified";
      let age = "Unknown";
      
      if (userProfile.dateOfBirth) {
        try {
          const dob = new Date(userProfile.dateOfBirth);
          formattedDOB = dob.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Calculate age
          const today = new Date();
          let yearDiff = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            yearDiff--;
          }
          age = `${yearDiff} years`;
        } catch (e) {
          console.error("Error formatting date:", e);
        }
      }
      
      // Create detailed user profile information
      userDetails = {
          name: userProfile.name || "User",
          email: userProfile.email,
          gender: userProfile.gender || "Not specified",
        dateOfBirth: formattedDOB,
        age: age,
          state: userProfile.state || "Not specified",
          phone: userProfile.phone || "Not specified",
          address: userProfile.address || "Not specified"
      };
      
      // Add user profile to medical history
      medicalHistory.push({
        type: "PatientInformation",
        ...userDetails
      });
      
      // Try to fetch real medical reports if user is authenticated
      try {
        const userReports = await prisma.receipt.findMany({
          where: {
            userId: patientId,
            status: 'COMPLETED'
          },
          orderBy: {
            uploatedAt: 'desc'
          },
          take: 5, // Only get most recent 5 reports
          include: {
            hospital: true,
            doctor: true
          }
        });
        
        if (userReports && userReports.length > 0) {
          const reportsData: MedicalRecord[] = userReports.map(report => ({
            type: "MedicalRecord" as const,
            date: report.uploatedAt,
            formattedDate: new Date(report.uploatedAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            condition: report.condition || "Not specified",
            severity: report.severity || 0,
            severityText: report.severity ? `${report.severity}/10` : "Not specified",
            hospital: report.hospital?.name || "Not specified",
            doctor: report.doctor?.name || "Not specified",
            analysis: report.aiAnalysis || "No analysis available"
          }));
          
          medicalHistory = [...medicalHistory, ...reportsData];
        }
      } catch (error) {
        console.error("Error fetching user reports:", error);
      }
    }
    
    // Fallback to sample data if no real data is available
    if (medicalHistory.length <= 1) {
      // Add sample medical history data
      const sampleData: MedicalRecord[] = [
        {
          type: "MedicalRecord" as const,
          date: new Date('2023-12-15'),
          formattedDate: "December 15, 2023",
          condition: 'Seasonal Allergies',
          severity: 3,
          severityText: "3/10",
          hospital: 'City Medical Center',
          doctor: 'Dr. Smith',
          analysis: 'Patient Condition: Seasonal Allergies\nSeverity: 3/10\nPriority Level: Low\nRecommended Actions: Continue antihistamine medication, avoid known allergens'
        },
        {
          type: "MedicalRecord" as const,
          date: new Date('2023-10-02'),
          formattedDate: "October 2, 2023",
          condition: 'Mild Hypertension',
          severity: 4,
          severityText: "4/10",
          hospital: 'Community Hospital',
          doctor: 'Dr. Johnson',
          analysis: 'Patient Condition: Mild Hypertension\nSeverity: 4/10\nPriority Level: Medium\nRecommended Actions: Blood pressure monitoring, maintain healthy diet, regular exercise'
        }
      ];
      
      medicalHistory = [...medicalHistory, ...sampleData];
    }

    // Prepare the prompt for Gemini
    const prompt = `You are a medical AI assistant with access to a patient's profile and medical history.

PATIENT PROFILE:
${JSON.stringify(userDetails, null, 2)}

MEDICAL HISTORY:
${JSON.stringify(medicalHistory.filter(item => item.type === "MedicalRecord"), null, 2)}
    
CONVERSATION CONTEXT:
${JSON.stringify(history, null, 2)}
    
USER QUESTION:
${message}
    
INSTRUCTIONS:
1. Provide a helpful and accurate response based on the patient's profile, medical history, and conversation context.
2. If the question relates to the patient's specific conditions, refer to their medical history.
3. Use the patient's name and personal details when appropriate to make your response personalized.
4. Maintain a professional, empathetic, and supportive tone.
5. If asked about treatments, be clear that you are providing information and not medical advice.
6. If the patient's medical history doesn't contain information relevant to their question, acknowledge this and provide general information.

Your response:`;

    // Use the API key
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAdY9MhqAj1Y-3dQJ88slGjx4nMJn8xMwQ";

    // Call Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return NextResponse.json({ 
      response: response.data.candidates[0].content.parts[0].text 
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    if (axios.isAxiosError(error)) {
      console.error("API response error:", error.response?.data);
      console.error("API status code:", error.response?.status);
    }
    return NextResponse.json({ 
      error: 'Failed to process chat message' 
    }, { status: 500 });
  }
} 