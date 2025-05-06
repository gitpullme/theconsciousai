/**
 * Emergency Alert Logger
 * 
 * Development-only middleware to log emergency alert API activity.
 * This helps with debugging database errors and tracking user flow.
 */

export function logEmergencyAlert(message: string, data?: any) {
  if (process.env.NODE_ENV !== 'production') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🚨 EMERGENCY ALERT: ${message}`);
    
    if (data) {
      try {
        // Handle circular references in objects
        const safeData = JSON.stringify(data, (key, value) => {
          if (key === 'password') return '******';
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
          }
          return value;
        }, 2);
        console.log(`[${timestamp}] 📊 DATA: ${safeData}`);
      } catch (error) {
        console.log(`[${timestamp}] ⚠️ Could not stringify data: ${error instanceof Error ? error.message : String(error)}`);
        console.log(`[${timestamp}] 📄 Raw data type: ${typeof data}`);
      }
    }
    
    // Add a divider for better readability in console
    console.log(`[${timestamp}] ${'='.repeat(50)}`);
  }
  
  // Return true to allow for chaining
  return true;
}

// Set to store objects that have already been stringified (prevents circular reference issues)
const seen = new WeakSet();

export default logEmergencyAlert; 