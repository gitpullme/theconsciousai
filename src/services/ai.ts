// AI service for analyzing symptoms and medical data
import { analyzeSymptoms as geminiAnalyzeSymptoms } from './gemini';

/**
 * Analyzes patient symptoms using AI and returns severity and structured analysis
 */
export async function analyzeSymptoms(symptoms: string) {
  try {
    console.log("Analyzing symptoms:", symptoms);
    
    try {
      // First try using Gemini API for analysis
      console.log("Attempting to analyze using Gemini API");
      const geminiResult = await geminiAnalyzeSymptoms(symptoms);
      
      console.log("Successfully analyzed using Gemini API");
      return {
        severity: geminiResult.severity,
        analysis: geminiResult.analysis,
      };
    } catch (geminiError) {
      console.error("Error with Gemini API, falling back to local analysis:", geminiError);
      
      // Fallback to local analysis if Gemini fails
      const severity = calculateSeverity(symptoms);
      const analysis = generateAnalysis(symptoms, severity);
      
      console.log("Used local fallback analysis");
      return {
        severity,
        analysis,
      };
    }
  } catch (error) {
    console.error("Error in all symptom analysis methods:", error);
    // Return a very simple fallback analysis if all methods fail
    return {
      severity: 3, // Medium priority as a default
      analysis: "1. Initial Assessment: Patient symptoms require medical attention.\n2. Severity: 3/10\n3. Priority Level: Medium\n4. Possible Conditions: To be determined by medical staff\n5. Recommendation: Please consult with a doctor for proper diagnosis."
    };
  }
}

/**
 * Calculates a severity score (1-10) based on symptoms
 * This is a simplified version - a real implementation would use ML/NLP
 */
function calculateSeverity(symptoms: string): number {
  const symptomText = symptoms.toLowerCase();
  
  // High-priority symptoms (emergency)
  const emergencyTerms = [
    'chest pain', 'heart attack', 'stroke', 'breathing', 'unconscious',
    'severe bleeding', 'head trauma', 'seizure', 'allergic reaction',
    'anaphylaxis', 'vomiting blood', 'paralysis', 'suicide', 'overdose'
  ];
  
  // Medium-priority symptoms
  const urgentTerms = [
    'fever', 'fracture', 'broken', 'infection', 'pain', 'vomiting',
    'diarrhea', 'dehydration', 'dizziness', 'cut', 'wound', 'headache',
    'migraine', 'burn'
  ];
  
  // Low-priority symptoms
  const routineTerms = [
    'cold', 'flu', 'cough', 'sore throat', 'rash', 'itch', 'stomach ache',
    'routine', 'check-up', 'follow-up', 'prescription', 'refill'
  ];
  
  let severityScore = 3; // Default medium-low priority
  
  // Check for emergency terms (highest priority)
  for (const term of emergencyTerms) {
    if (symptomText.includes(term)) {
      severityScore = Math.max(severityScore, 8 + Math.floor(Math.random() * 3)); // 8-10
      break;
    }
  }
  
  // Check for urgent terms (medium priority)
  for (const term of urgentTerms) {
    if (symptomText.includes(term)) {
      severityScore = Math.max(severityScore, 4 + Math.floor(Math.random() * 4)); // 4-7
      break;
    }
  }
  
  // Check for routine terms (low priority)
  for (const term of routineTerms) {
    if (symptomText.includes(term) && severityScore < 4) {
      severityScore = 1 + Math.floor(Math.random() * 3); // 1-3
      break;
    }
  }
  
  return severityScore;
}

/**
 * Generates a structured analysis of the symptoms
 */
function generateAnalysis(symptoms: string, severity: number): string {
  const symptomText = symptoms.toLowerCase();
  let analysis = "";
  
  // Add initial assessment based on severity
  if (severity >= 8) {
    analysis += "1. Initial Assessment: Symptoms suggest a potentially serious condition requiring immediate medical attention.\n";
  } else if (severity >= 4) {
    analysis += "1. Initial Assessment: Symptoms indicate a condition that requires timely medical care.\n";
  } else {
    analysis += "1. Initial Assessment: Symptoms suggest a non-urgent medical condition.\n";
  }
  
  // Add symptom summary
  analysis += `2. Reported Symptoms: ${symptoms}\n`;
  
  // Add severity rating
  analysis += `3. Severity: ${severity}/10 (${getSeverityDesc(severity)})\n`;
  
  // Add possible conditions (simplified for demo)
  analysis += "4. Possible Conditions: ";
  
  if (symptomText.includes('headache')) {
    analysis += "Migraine, Tension headache, Sinusitis\n";
  } else if (symptomText.includes('chest pain')) {
    analysis += "Angina, Myocardial infarction, GERD, Costochondritis\n";
  } else if (symptomText.includes('cough')) {
    analysis += "Upper respiratory infection, Bronchitis, Pneumonia, Asthma\n";
  } else if (symptomText.includes('fever')) {
    analysis += "Viral infection, Bacterial infection, Inflammatory condition\n";
  } else if (symptomText.includes('rash')) {
    analysis += "Allergic reaction, Eczema, Contact dermatitis, Viral exanthem\n";
  } else if (symptomText.includes('stomach') || symptomText.includes('abdominal')) {
    analysis += "Gastroenteritis, GERD, Peptic ulcer, IBS, Appendicitis\n";
  } else {
    analysis += "Multiple conditions possible - further evaluation required\n";
  }
  
  // Add recommendations
  if (severity >= 8) {
    analysis += "5. Recommendations: Immediate medical attention recommended. Consider emergency services.\n";
  } else if (severity >= 4) {
    analysis += "5. Recommendations: Prompt medical evaluation recommended within 24-48 hours.\n";
  } else {
    analysis += "5. Recommendations: Schedule a routine appointment for proper evaluation.\n";
  }
  
  return analysis;
}

/**
 * Returns a textual description of the severity
 */
function getSeverityDesc(severity: number): string {
  if (severity >= 8) return "High Priority";
  if (severity >= 4) return "Medium Priority";
  return "Low Priority";
} 