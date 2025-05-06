// Simple script to test API endpoint availability
const http = require('http');
const https = require('https');

// Function to make a simple HTTP request and check response
async function testEndpoint(url) {
  return new Promise((resolve, reject) => {
    console.log(`Testing endpoint: ${url}`);
    
    // Choose http or https based on URL
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      // Log response status
      console.log(`Response status: ${res.statusCode} ${res.statusMessage}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON if possible
          let parsedData;
          try {
            parsedData = JSON.parse(data);
            console.log('Response data (parsed):', parsedData);
          } catch (e) {
            // If not JSON, just show first part of response
            console.log(`Response data (first 200 chars): ${data.substring(0, 200)}...`);
          }
          
          resolve({
            status: res.statusCode,
            statusMessage: res.statusMessage,
            data: parsedData || data
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error connecting to ${url}:`, error.message);
      reject(error);
    });
    
    // Set a timeout in case the request hangs
    req.setTimeout(5000, () => {
      req.abort();
      console.error(`Request to ${url} timed out after 5 seconds`);
      reject(new Error('Request timed out'));
    });
  });
}

// Test multiple endpoints
async function runTests() {
  const baseUrl = 'http://localhost:3000';
  const sampleReportId = 'cmabgpj4h00034uuwf7iyky0q'; // Use the sample ID we found earlier
  
  try {
    console.log('==== TESTING API ENDPOINTS ====');
    
    // Test main page access
    console.log('\n\n1. Testing main page access:');
    await testEndpoint(`${baseUrl}`);
    
    // Test the /api/reports/[id] endpoint
    console.log('\n\n2. Testing reports endpoint:');
    await testEndpoint(`${baseUrl}/api/reports/${sampleReportId}`);
    
    // Test the /api/receipts/[id] endpoint
    console.log('\n\n3. Testing receipts endpoint:');
    await testEndpoint(`${baseUrl}/api/receipts/${sampleReportId}`);
    
    console.log('\n==== ALL TESTS COMPLETED ====');
  } catch (error) {
    console.error('Test suite error:', error);
  }
}

// Run the tests
runTests(); 