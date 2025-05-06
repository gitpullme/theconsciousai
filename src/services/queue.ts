import prisma from '@/lib/prisma';
import { analyzeReceipt } from './gemini';
import type { Receipt } from '@/generated/prisma/client';

// Helper function to extract severity from AI analysis
function extractSeverity(aiAnalysis: string): number {
  // Try to find the explicit severity rating pattern (Severity: X/10)
  const severityMatch = aiAnalysis.match(/Severity:?\s*(\d+)\/10/i) || 
                       aiAnalysis.match(/Severity Rating:?\s*(\d+)\/10/i) ||
                       aiAnalysis.match(/Severity:?\s*(\d+)/i);
  
  if (severityMatch && severityMatch[1]) {
    return parseInt(severityMatch[1], 10);
  }
  
  // Fallback: Look for priority levels
  if (aiAnalysis.toLowerCase().includes('urgent') || 
      aiAnalysis.toLowerCase().includes('emergency') ||
      aiAnalysis.toLowerCase().includes('critical')) {
    return 10;
  } else if (aiAnalysis.toLowerCase().includes('high priority')) {
    return 7;
  } else if (aiAnalysis.toLowerCase().includes('medium priority')) {
    return 5;
  } else if (aiAnalysis.toLowerCase().includes('low priority')) {
    return 2;
  }
  
  // Default case
  return 1;
}

// Helper function to determine the appropriate doctor specialty based on patient condition
function determineSpecialty(aiAnalysis: string): string {
  const analysis = aiAnalysis.toLowerCase();
  
  // Map common conditions to specialties
  if (analysis.includes('heart') || analysis.includes('chest pain') || analysis.includes('cardiac')) {
    return 'Cardiology';
  } else if (analysis.includes('brain') || analysis.includes('headache') || analysis.includes('neural') || 
             analysis.includes('seizure') || analysis.includes('stroke')) {
    return 'Neurology';
  } else if (analysis.includes('bone') || analysis.includes('fracture') || analysis.includes('joint') || 
             analysis.includes('sprain')) {
    return 'Orthopedics';
  } else if (analysis.includes('child') || analysis.includes('infant') || analysis.includes('pediatric')) {
    return 'Pediatrics';
  } else if (analysis.includes('skin') || analysis.includes('rash') || analysis.includes('acne')) {
    return 'Dermatology';
  } else if (analysis.includes('eye') || analysis.includes('vision') || analysis.includes('sight')) {
    return 'Ophthalmology';
  } else if (analysis.includes('mental') || analysis.includes('anxiety') || analysis.includes('depression')) {
    return 'Psychiatry';
  } else if (analysis.includes('emergency') || analysis.includes('urgent') || analysis.includes('critical')) {
    return 'Emergency Medicine';
  }
  
  // Default to general medicine
  return 'General Medicine';
}

// Cache to store hospital queue information to reduce database queries
const queueCache = new Map<string, { count: number, items: any[], timestamp: number }>();
// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL = 30000;

// Optimized upload and process a receipt with parallelization and caching
export async function uploadReceipt(
  userId: string,
  base64Image: string,
  hospitalId: string
) {
  try {
    console.log(`=== Starting receipt processing workflow ===`);
    console.log(`Processing receipt upload for user ${userId} to hospital ${hospitalId}`);
    
    const startTime = new Date();
    console.log(`Process started at: ${startTime.toISOString()}`);
    
    // STEP 1: Create a pending receipt record
    console.log("STEP 1: Creating initial pending receipt record...");
    const receiptPromise = prisma.receipt.create({
      data: {
        userId,
        imageUrl: base64Image.slice(0, 20) + '...', // Store truncated reference or URL
        hospitalId,
        status: 'PENDING'
      }
    });

    // STEP 2: Analyze the receipt using Gemini API (run in parallel with creating receipt)
    console.log("STEP 2: Sending to Gemini API for analysis...");
    const analysisPromise = analyzeReceipt(base64Image)
      .catch(analysisError => {
        console.error("Error during receipt analysis:", analysisError);
        // Set a fallback analysis if Gemini fails
        console.log("Using fallback analysis due to AI service error");
        return `
Patient Condition: Unable to determine (analysis error)
Severity: 5/10
Priority Level: Medium
Recommended Actions: Please consult with medical staff for proper assessment.
Waiting Time Impact: Unknown, please seek medical attention if condition worsens.
Specialist Recommendation: General Medicine doctor
Queue Information: Your position in the queue will be determined based on your priority level and current hospital capacity.
        `;
      });
    
    // STEP 3: Fetch hospital queue data (in parallel)
    console.log("STEP 3: Gathering queue information...");
    let queuePromise;
    
    // Check cache first
    const cacheKey = `hospital_queue_${hospitalId}`;
    const cachedQueue = queueCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedQueue && (now - cachedQueue.timestamp) < CACHE_TTL) {
      console.log(`Using cached queue data from ${Math.floor((now - cachedQueue.timestamp)/1000)}s ago`);
      queuePromise = Promise.resolve(cachedQueue);
    } else {
      console.log(`Cache miss or expired, fetching fresh queue data`);
      queuePromise = Promise.all([
        prisma.receipt.count({
          where: {
            hospitalId,
            status: 'QUEUED'
          }
        }),
        prisma.receipt.findMany({
          where: {
            hospitalId,
            status: 'QUEUED'
          },
          orderBy: [
            { severity: 'desc' },
            { uploatedAt: 'asc' }
          ]
        })
      ]).then(([count, items]) => {
        const queueData = { count, items, timestamp: Date.now() };
        // Update cache
        queueCache.set(cacheKey, queueData);
        return queueData;
      });
    }
    
    // Wait for all parallel operations to complete
    const [receipt, analysisResult, queueData] = await Promise.all([
      receiptPromise, 
      analysisPromise,
      queuePromise
    ]);
    
    console.log(`Created pending receipt with ID: ${receipt.id}`);
    console.log("Successfully received analysis from Gemini");
    console.log(`Current queue size: ${queueData.count}`);
    
    // STEP 4: Extract severity from analysis and determine specialty
    console.log("STEP 4: Extracting severity and specialty from analysis...");
    const severity = extractSeverity(analysisResult);
    console.log(`Extracted severity: ${severity}/10`);
    
    const specialty = determineSpecialty(analysisResult);
    console.log(`Determined specialty: ${specialty}`);
    
    // STEP 5: Find available doctor with matching specialty (now that we have the specialty)
    console.log(`STEP 5: Finding available doctor with specialty: ${specialty}...`);
    const doctor = await prisma.doctor.findFirst({
      where: {
        hospitalId,
        specialty,
        available: true
      }
    });
    
    console.log(`Assigned doctor: ${doctor?.name || 'No matching specialist available'}`);

    // STEP 6: Enhance analysis with doctor and queue information
    console.log("STEP 6: Enhancing analysis with doctor and queue information...");
    let enhancedAnalysis = analysisResult;
    if (!enhancedAnalysis.includes("Doctor Assigned:")) {
      enhancedAnalysis += `\n\nDoctor Assigned: ${doctor ? doctor.name : "To be determined at the hospital"}\nSpecialty: ${doctor ? doctor.specialty : specialty}\n`;
    }
    if (!enhancedAnalysis.includes("Current Queue:")) {
      enhancedAnalysis += `\nCurrent Queue: There ${queueData.count === 1 ? 'is' : 'are'} currently ${queueData.count} patient${queueData.count === 1 ? '' : 's'} in the queue.\n`;
    }

    // STEP 7: Calculate queue position
    console.log("STEP 7: Calculating queue position...");
    let position = 1;
    
    if (queueData.items.length === 0) {
      position = 1;
      console.log(`First in queue`);
    } else {
      // Find the position where this receipt's severity is lower than existing items
      let inserted = false;
      
      for (let i = 0; i < queueData.items.length; i++) {
        if (severity > (queueData.items[i].severity || 0)) {
          position = i + 1;
          inserted = true;
          console.log(`Inserting at position ${position} due to higher severity`);
          break;
        }
      }
      
      if (!inserted) {
        // If no position found (lower severity than all), put at the end
        position = queueData.items.length + 1;
        console.log(`Appending to end of queue at position ${position}`);
      }
    }

    // STEP 8 & 9: Complete the update in a single transaction for better performance
    console.log(`STEP 8 & 9: Updating receipt and adjusting queue positions in one transaction`);
    
    // Prepare transaction operations
    const operations = [];
    
    // Add operation to update the existing receipt
    operations.push(
      prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          aiAnalysis: enhancedAnalysis,
          severity,
          doctorId: doctor?.id || null,
          queuePosition: position,
          status: 'QUEUED',
          processedAt: new Date()
        },
        include: {
          hospital: true,
          doctor: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    );
    
    // Add operations to adjust positions for other queue items if needed
    if (position <= queueData.items.length) {
      console.log(`Adjusting positions for ${queueData.items.length - position + 1} items`);
      
      queueData.items
        .filter((_: any, index: number) => index >= position - 1)
        .forEach((item: any) => {
          operations.push(
            prisma.receipt.update({
              where: { id: item.id },
              data: { 
                queuePosition: Number(item.queuePosition || 0) + 1 
              }
            })
          );
        });
    }
    
    // Execute all database operations in a single transaction
    const results = await prisma.$transaction(operations);
    
    // Get the updated receipt from the first operation
    const finalReceipt = results[0];
    
    // Invalidate the cache
    queueCache.delete(cacheKey);
    
    // Log total processing time
    const endTime = new Date();
    const processingTimeMs = endTime.getTime() - startTime.getTime();
    console.log(`Receipt processing completed successfully in ${processingTimeMs}ms (${(processingTimeMs/1000).toFixed(2)}s)`);
    console.log(`=== End of receipt processing workflow ===`);
    
    return finalReceipt;
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw error;
  }
}

// Cache for user reports
const userReportsCache = new Map<string, { reports: any[], timestamp: number }>();

// Optimized function to get user receipts with caching
export async function getUserReceipts(userId: string) {
  try {
    // Check cache first
    const cacheKey = `user_reports_${userId}`;
    const cachedReports = userReportsCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedReports && (now - cachedReports.timestamp) < CACHE_TTL) {
      console.log(`Using cached user reports from ${Math.floor((now - cachedReports.timestamp)/1000)}s ago`);
      return cachedReports.reports;
    }
    
    console.log(`Cache miss or expired, fetching fresh user reports`);
    const reports = await prisma.receipt.findMany({
      where: { userId },
      orderBy: { uploatedAt: 'desc' },
      include: {
        hospital: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        }
      }
    });
    
    // Update cache
    userReportsCache.set(cacheKey, { 
      reports,
      timestamp: Date.now()
    });
    
    return reports;
  } catch (error) {
    console.error("Error fetching user receipts:", error);
    throw error;
  }
}

// Cache for hospital queue data
export async function getHospitalQueue(hospitalId: string) {
  try {
    // Use the same cache mechanism as in uploadReceipt
    const cacheKey = `hospital_queue_${hospitalId}`;
    const cachedQueue = queueCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedQueue && (now - cachedQueue.timestamp) < CACHE_TTL) {
      console.log(`Using cached hospital queue from ${Math.floor((now - cachedQueue.timestamp)/1000)}s ago`);
      return cachedQueue.items;
    }
    
    console.log(`Cache miss or expired, fetching fresh hospital queue`);
    const queueItems = await prisma.receipt.findMany({
      where: {
        hospitalId,
        status: 'QUEUED'
      },
      orderBy: [
        { severity: 'desc' },
        { uploatedAt: 'asc' }
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        }
      }
    });
    
    // Update cache
    const count = queueItems.length;
    queueCache.set(cacheKey, { 
      count, 
      items: queueItems,
      timestamp: Date.now()
    });
    
    return queueItems;
  } catch (error) {
    console.error("Error fetching hospital queue:", error);
    throw error;
  }
}

// Invalidate appropriate caches when completing a receipt
export async function completeReceipt(receiptId: string) {
  try {
    // Get the receipt to find relevant cache keys to invalidate
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      select: { userId: true, hospitalId: true }
    });
    
    if (!receipt) {
      throw new Error("Receipt not found");
    }
    
    // Update the receipt status
    const updatedReceipt = await prisma.receipt.update({
      where: { id: receiptId },
      data: { 
        status: 'COMPLETED'
      },
      include: {
        hospital: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Invalidate relevant caches
    const userCacheKey = `user_reports_${receipt.userId}`;
    const hospitalCacheKey = `hospital_queue_${receipt.hospitalId}`;
    
    userReportsCache.delete(userCacheKey);
    queueCache.delete(hospitalCacheKey);
    
    console.log(`Completed receipt ${receiptId} and invalidated caches`);
    
    return updatedReceipt;
  } catch (error) {
    console.error("Error completing receipt:", error);
    throw error;
  }
} 