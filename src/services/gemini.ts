import axios from 'axios';

type GeminiResponse = {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
};

// Helper to get the Gemini API key from environment variables
function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    console.error("⛔ CRITICAL ERROR: GEMINI_API_KEY environment variable is not set");
  } else {
    console.log("✅ Gemini API key found");
  }
  
  return apiKey;
}

export async function analyzeReceipt(base64Image: string): Promise<string> {
  // Get the API key from environment variable
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    console.error("⛔ Missing Gemini API key. Cannot process medical image.");
    throw new Error("Missing Gemini API key");
  }
  
  try {
    console.log("🔄 Starting Gemini API medical analysis process...");
    
    // Basic validation of the base64 image
    if (!base64Image || typeof base64Image !== 'string') {
      console.error("⛔ Invalid image data. Base64Image is empty or not a string.");
      throw new Error("Invalid image data");
    }
    
    // Check if the base64 string is valid
    if (!base64Image.startsWith('data:image/') && !base64Image.includes(';base64,')) {
      console.error("⛔ Image data appears to be in invalid format. Expected 'data:image/xxx;base64,...'");
      // Try to fix a common issue where the data:image prefix is missing
      if (base64Image.match(/^[a-zA-Z0-9+/=]+$/)) {
        console.log("🔄 Attempting to fix base64 image format...");
        base64Image = 'data:image/jpeg;base64,' + base64Image;
      } else {
        console.error("⛔ Unable to fix image format. Proceeding with original format, but this might fail.");
      }
    }
    
    console.log("✅ Image data validated");
    console.log("🔄 Preparing image data and generating prompt...");
    
    // Log the starting timestamp
    const startTime = new Date();
    console.log(`🕒 Analysis started at: ${startTime.toISOString()}`);
    
    console.log("🔄 Sending request to Gemini API...");
    const response = await axios.post<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a medical AI assistant analyzing a medical receipt or report. 
                
Please provide a detailed analysis of the patient's condition with the following structure:
1. Patient Condition: Provide a clear summary of the medical condition or diagnosis
2. Severity Rating: Rate the condition on a scale of 1-10, where 1 is minor and 10 is critical/life-threatening
3. Priority Level: Suggest a priority level (Low, Medium, High, Urgent) for hospital queue placement
4. Recommended Actions: Suggest immediate medical steps needed
5. Waiting Time Impact: Explain how waiting might affect the patient's condition
6. Specialist Recommendation: Specifically mention which type of doctor specialist would be best suited for this condition (e.g., Cardiologist, Neurologist, Orthopedist, etc.)
7. Queue Information: Mention that the patient will be informed of their exact queue position and wait time based on their priority level

Format your response clearly with these headings, ensuring the severity rating is explicitly stated as "Severity: X/10" so it can be easily parsed.

If no medical information is visible in the image, respond with:
"No clear medical information detected. Severity: 1/10. Priority Level: Low. Specialist Recommendation: General Practitioner. Please upload a clearer medical document or consult with the hospital directly."
`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
                }
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
        },
        timeout: 30000 // 30 second timeout
      }
    );

    // Calculate and log processing time
    const endTime = new Date();
    const processingTimeMs = endTime.getTime() - startTime.getTime();
    console.log(`✅ Gemini API response received successfully in ${processingTimeMs}ms (${(processingTimeMs/1000).toFixed(2)}s)`);
    
    // Validate the response structure before accessing properties
    if (!response.data || !response.data.candidates || !response.data.candidates[0] ||
        !response.data.candidates[0].content || !response.data.candidates[0].content.parts ||
        !response.data.candidates[0].content.parts[0] || !response.data.candidates[0].content.parts[0].text) {
      console.error("⛔ Gemini API returned an unexpected response format:", JSON.stringify(response.data));
      throw new Error("Invalid API response format");
    }
    
    const analysisText = response.data.candidates[0].content.parts[0].text;
    
    // Log a snippet of the analysis for debugging
    console.log("📋 Analysis snippet:", analysisText.substring(0, 100) + "...");
    
    // Check and log the severity rating for monitoring
    const severityMatch = analysisText.match(/Severity:?\s*(\d+)\/10/i);
    if (severityMatch && severityMatch[1]) {
      console.log(`🔍 Detected severity: ${severityMatch[1]}/10`);
    } else {
      console.warn("⚠️ No severity rating detected in the analysis text");
    }
    
    return analysisText;
  } catch (error) {
    console.error("⛔ Error calling Gemini API:", error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error("⛔ API response error data:", error.response.data);
        console.error("⛔ API status code:", error.response.status);
      } else if (error.request) {
        console.error("⛔ No response received from Gemini API. Request timeout or network error");
      } else {
        console.error("⛔ Error setting up request:", error.message);
      }
    }
    
    // Provide a fallback response if the API call fails
    console.log("⚠️ Using fallback analysis due to API failure");
    return `Patient Condition: Unable to analyze due to technical issues

Severity: 5/10

Priority Level: Medium

Recommended Actions: Please have hospital staff review your case directly.

Waiting Time Impact: Unknown without proper analysis.

Specialist Recommendation: General Medicine

Queue Information: Your position in the queue will be determined by hospital staff.`;
  }
}

/**
 * Analyzes patient symptoms using Gemini API and returns severity and structured analysis
 */
export async function analyzeSymptoms(symptoms: string): Promise<{ severity: number, analysis: string }> {
  // Get the API key from environment variable
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error("Missing Gemini API key");
  }
  
  try {
    console.log("Analyzing symptoms using Gemini API:", symptoms);
    
    // Log the starting timestamp
    const startTime = new Date();
    
    const response = await axios.post<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a medical AI assistant analyzing patient symptoms. 
                
Please analyze these patient symptoms: "${symptoms}"

Provide a detailed analysis with the following structure:
1. Initial Assessment: Provide a clear summary of your assessment based on the symptoms
2. Severity Rating: Rate the symptoms on a scale of 1-10, where 1 is minor and 10 is critical/life-threatening
3. Priority Level: Suggest a priority level (Low, Medium, High) for hospital queue placement
4. Possible Conditions: List potential medical conditions that might cause these symptoms
5. Recommended Actions: Suggest immediate medical steps needed
6. Specialist Recommendation: Specifically mention which type of doctor specialist would be best suited (e.g., Cardiologist, Neurologist, etc.)

Format your response clearly with these headings, ensuring the severity rating is explicitly stated as "Severity: X/10" so it can be easily parsed.`
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

    // Calculate and log processing time
    const endTime = new Date();
    const processingTimeMs = endTime.getTime() - startTime.getTime();
    console.log(`Gemini API response received for symptoms in ${processingTimeMs}ms (${(processingTimeMs/1000).toFixed(2)}s)`);
    
    const analysisText = response.data.candidates[0].content.parts[0].text;
    
    // Extract severity rating
    const severityMatch = analysisText.match(/Severity:?\s*(\d+)\/10/i);
    let severityValue = 3; // Default medium-low priority
    
    if (severityMatch && severityMatch[1]) {
      severityValue = parseInt(severityMatch[1], 10);
      console.log(`Detected severity from Gemini: ${severityValue}/10`);
    }
    
    return {
      severity: severityValue,
      analysis: analysisText
    };
  } catch (error) {
    console.error("Error calling Gemini API for symptom analysis:", error);
    
    if (axios.isAxiosError(error)) {
      console.error("API response error:", error.response?.data);
      console.error("API status code:", error.response?.status);
    }
    
    // Provide a fallback response if the API call fails
    return {
      severity: 3, // Medium priority as a default
      analysis: "1. Initial Assessment: Patient symptoms require medical attention.\n2. Severity: 3/10\n3. Priority Level: Medium\n4. Possible Conditions: Multiple conditions possible\n5. Recommendation: Please consult with a doctor for proper diagnosis.\n6. Specialist Recommendation: General Practitioner"
    };
  }
}

/**
 * Analyzes prescription images to extract medication information
 */
export async function analyzePrescription(base64Image: string): Promise<any> {
  // Get the API key from environment variable
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error("Missing Gemini API key");
  }
  
  try {
    console.log("Analyzing prescription using Gemini API");
    
    // Log the starting timestamp
    const startTime = new Date();
    
    const response = await axios.post<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a medical AI assistant analyzing a prescription or medical document. 
                
Extract all the medications mentioned in this document with the following details for each medication:
- Medication name
- Dosage (e.g., 500mg, 10ml, etc.)
- Frequency (daily, twice-daily, thrice-daily, weekly, biweekly, monthly)
- Recommended time (in 24-hour format like "09:00")
- Special instructions or notes (if any)

Provide your response as a JSON array like this:
[
  {
    "name": "Medication Name",
    "dosage": "Dosage Amount",
    "frequency": "Frequency Code",
    "time": "Best time to take (HH:MM)",
    "notes": "Any special instructions",
    "aiConfidence": 95
  }
]

For frequency, use ONLY one of these specific codes: "daily", "twice-daily", "thrice-daily", "weekly", "biweekly", "monthly"

For each medication, include an "aiConfidence" field (0-100) indicating your confidence level in the extracted information.

If no medications are found, return an empty array: []`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
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

    // Calculate and log processing time
    const endTime = new Date();
    const processingTimeMs = endTime.getTime() - startTime.getTime();
    console.log(`Gemini API response received for prescription in ${processingTimeMs}ms (${(processingTimeMs/1000).toFixed(2)}s)`);
    
    const resultText = response.data.candidates[0].content.parts[0].text;
    
    // Find the JSON array in the response
    const jsonMatch = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      try {
        // Parse the JSON array
        const medicationsData = JSON.parse(jsonMatch[0]);
        console.log(`Extracted ${medicationsData.length} medications from prescription`);
        
        // Add unique IDs to each medication and ensure data formatting is correct
        const medicationsWithIds = medicationsData.map((med: any, index: number) => ({
          id: `ai-med-${index + 1}`,
          name: String(med.name || ""),
          dosage: String(med.dosage || ""),
          frequency: String(med.frequency || "daily"),
          time: String(med.time || "08:00"),
          notes: med.notes ? String(med.notes) : "",
          aiConfidence: Number(med.aiConfidence) || 75
        }));
        
        return medicationsWithIds;
      } catch (parseError) {
        console.error("Error parsing medication JSON:", parseError);
        throw new Error("Failed to parse medication data from AI response");
      }
    } else {
      console.error("No valid JSON found in the AI response");
      return [];
    }
  } catch (error) {
    console.error("Error calling Gemini API for prescription analysis:", error);
    
    if (axios.isAxiosError(error)) {
      console.error("API response error:", error.response?.data);
      console.error("API status code:", error.response?.status);
    }
    
    // Return an empty array if API fails
    return [];
  }
} 