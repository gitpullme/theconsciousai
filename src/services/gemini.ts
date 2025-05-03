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

export async function analyzeReceipt(base64Image: string): Promise<string> {
  // Always use the hardcoded API key first
  const apiKey = "AIzaSyAdY9MhqAj1Y-3dQJ88slGjx4nMJn8xMwQ";
  
  try {
    console.log("Calling Gemini API for medical analysis...");
    
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

Format your response clearly with these headings, ensuring the severity rating is explicitly stated as "Severity: X/10" so it can be easily parsed.

If no medical information is visible in the image, respond with:
"No clear medical information detected. Severity: 1/10. Priority Level: Low. Please upload a clearer medical document or consult with the hospital directly."
`
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

    console.log("Gemini API response received successfully");
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Provide a fallback response if the API call fails
    return `Patient Condition: Unable to analyze due to technical issues

Severity: 5/10

Priority Level: Medium

Recommended Actions: Please have hospital staff review your case directly.

Waiting Time Impact: Unknown without proper analysis.`;
  }
} 