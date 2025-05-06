/**
 * Safely serializes user data for emergency alerts
 * Handles date fields and complex relationships by converting to simple JSON
 */
export function serializeUserDataForEmergency(userData: any) {
  if (!userData) return {};
  
  const safeData: Record<string, any> = {};
  
  // Process basic fields
  const basicFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode', 'gender'];
  basicFields.forEach(field => {
    safeData[field] = userData[field] || "";
  });
  
  // Handle date objects
  if (userData.dateOfBirth) {
    try {
      safeData.dateOfBirth = userData.dateOfBirth instanceof Date 
        ? userData.dateOfBirth.toISOString() 
        : String(userData.dateOfBirth);
    } catch (e) {
      safeData.dateOfBirth = null;
      console.error("Error serializing dateOfBirth:", e);
    }
  } else {
    safeData.dateOfBirth = null;
  }
  
  return safeData;
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 