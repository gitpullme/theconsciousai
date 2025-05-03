import prisma from '@/lib/prisma';
import { analyzeReceipt } from './gemini';

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

// Upload and process a receipt
export async function uploadReceipt(
  userId: string,
  base64Image: string,
  hospitalId: string
) {
  try {
    console.log(`Processing receipt upload for user ${userId} to hospital ${hospitalId}`);
    
    // First, create a pending receipt record
    const receipt = await prisma.receipt.create({
      data: {
        userId,
        imageUrl: base64Image.slice(0, 20) + '...', // Store truncated reference or URL
        hospitalId,
        status: 'PENDING'
      }
    });
    console.log(`Created pending receipt with ID: ${receipt.id}`);

    // Analyze the receipt using Gemini API
    console.log("Sending to Gemini API for analysis...");
    let analysisResult: string;
    try {
      analysisResult = await analyzeReceipt(base64Image);
      console.log("Received analysis from Gemini");
    } catch (analysisError) {
      console.error("Error during receipt analysis:", analysisError);
      // Set a fallback analysis if Gemini fails
      analysisResult = `
Patient Condition: Unable to determine (analysis error)
Severity: 5/10
Priority Level: Medium
Recommended Actions: Please consult with medical staff for proper assessment.
Waiting Time Impact: Unknown, please seek medical attention if condition worsens.
      `;
    }
    
    // Extract severity from analysis
    const severity = extractSeverity(analysisResult);
    console.log(`Extracted severity: ${severity}/10`);

    // Update the receipt with analysis results
    const updatedReceipt = await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        aiAnalysis: analysisResult,
        severity,
        status: 'PROCESSED',
        processedAt: new Date()
      }
    });
    console.log(`Updated receipt with analysis results`);

    // Get current queue for this hospital
    const queueItems = await prisma.receipt.findMany({
      where: {
        hospitalId,
        status: 'QUEUED'
      },
      orderBy: [
        { severity: 'desc' },
        { processedAt: 'asc' }
      ]
    });
    console.log(`Current queue size: ${queueItems.length}`);

    // Determine position based on severity
    let position = 1;
    
    if (queueItems.length === 0) {
      position = 1;
      console.log(`First in queue`);
    } else {
      // Find the position where this receipt's severity is lower than existing items
      let inserted = false;
      
      for (let i = 0; i < queueItems.length; i++) {
        if (severity > (queueItems[i].severity || 0)) {
          position = i + 1;
          inserted = true;
          console.log(`Inserting at position ${position} due to higher severity`);
          break;
        }
      }
      
      if (!inserted) {
        // If no position found (lower severity than all), put at the end
        position = queueItems.length + 1;
        console.log(`Appending to end of queue at position ${position}`);
      }
    }

    // Adjust queue positions for items with lower severity
    if (position <= queueItems.length) {
      console.log(`Adjusting positions for ${queueItems.length - position + 1} items`);
      // Shift down all items from position onwards
      await prisma.$transaction(
        queueItems
          .filter((_, index) => index >= position - 1)
          .map(item => 
            prisma.receipt.update({
              where: { id: item.id },
              data: { queuePosition: (item.queuePosition || 0) + 1 }
            })
          )
      );
    }

    // Set the queue position of the new receipt
    console.log(`Setting final queue position: ${position}`);
    const finalReceipt = await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        queuePosition: position,
        status: 'QUEUED'
      },
      include: {
        hospital: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`Receipt processing completed successfully`);
    return finalReceipt;
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw error;
  }
}

// Get user's receipts
export async function getUserReceipts(userId: string) {
  return prisma.receipt.findMany({
    where: { userId },
    orderBy: { uploatedAt: 'desc' },
    include: {
      hospital: true
    }
  });
}

// Get hospital queue
export async function getHospitalQueue(hospitalId: string) {
  return prisma.receipt.findMany({
    where: {
      hospitalId,
      status: 'QUEUED'
    },
    orderBy: { queuePosition: 'asc' },
    select: {
      id: true,
      queuePosition: true,
      uploatedAt: true,
      processedAt: true,
      severity: true,
      status: true,
      aiAnalysis: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  });
}

// Mark a receipt as completed
export async function completeReceipt(receiptId: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: { hospitalId: true, queuePosition: true }
  });

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  // Update the completed receipt
  await prisma.receipt.update({
    where: { id: receiptId },
    data: {
      status: 'COMPLETED',
      queuePosition: null
    }
  });

  // Adjust queue positions for remaining items
  return prisma.receipt.updateMany({
    where: {
      hospitalId: receipt.hospitalId,
      status: 'QUEUED',
      queuePosition: {
        gt: receipt.queuePosition
      }
    },
    data: {
      queuePosition: {
        decrement: 1
      }
    }
  });
} 