import prisma from '@/lib/prisma';
import { analyzeReceipt } from './gemini';

// Upload and process a receipt
export async function uploadReceipt(
  userId: string,
  base64Image: string,
  hospitalId: string
) {
  try {
    // First, create a pending receipt record
    const receipt = await prisma.receipt.create({
      data: {
        userId,
        imageUrl: base64Image.slice(0, 50) + '...', // Store truncated reference or URL
        hospitalId,
        status: 'PENDING'
      }
    });

    // Analyze the receipt using Gemini API
    const analysisResult = await analyzeReceipt(base64Image);

    // Parse severity from analysis (assuming Gemini returns this info)
    const severityMatch = analysisResult.match(/severity.+?(\d+)/i);
    const severity = severityMatch ? parseInt(severityMatch[1], 10) : 0;

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

    // Determine position based on severity
    let position = 1;
    
    // Place more severe cases at the front of the queue
    if (severity > 0) {
      // Find the position where this receipt's severity is lower than existing items
      for (let i = 0; i < queueItems.length; i++) {
        if (severity > (queueItems[i].severity || 0)) {
          position = i + 1;
          break;
        } else {
          position = i + 2;
        }
      }
    } else {
      // If no severity rating, put at the end of the queue
      position = queueItems.length + 1;
    }

    // Adjust queue positions for items with lower severity
    if (position <= queueItems.length) {
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
    return prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        queuePosition: position,
        status: 'QUEUED'
      }
    });
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
    include: {
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