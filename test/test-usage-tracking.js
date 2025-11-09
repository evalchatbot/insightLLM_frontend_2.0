import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

// Test script for usage tracking with proper auth
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUsageTracking() {
  try {
    // Your API endpoint
    const baseUrl = 'http://localhost:3000/api';
    
    // Add your actual session token here (copy from browser after logging in)
    const sessionToken = process.env.CLERK_SESSION_TOKEN;
    
    if (!sessionToken) {
      console.error('❌ Please provide a CLERK_SESSION_TOKEN environment variable');
      return;
    }

    // Test chat endpoint
    console.log('\n🔄 Testing chat endpoint...');
    const chatResponse = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Write a sample paragraph to test token usage. Make it exactly 100 words long to test the token counting properly.'
        }]
      })
    });

    console.log('Chat Response Status:', chatResponse.status);
    if (!chatResponse.ok) {
      const errorData = await chatResponse.json();
      console.error('Chat Error:', errorData);
    }

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test status endpoint to check usage
    console.log('\n🔄 Checking usage status...');
    const statusResponse = await fetch(`${baseUrl}/pro/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const statusData = await statusResponse.json();
    console.log('Status Response:', JSON.stringify(statusData, null, 2));

    // Test OCR endpoint
    console.log('\n🔄 Testing OCR endpoint...');
    const formData = new FormData();
    const testPdf = fs.readFileSync(path.join(__dirname, 'test.pdf'));
    formData.append('file', testPdf, { filename: 'test.pdf', contentType: 'application/pdf' });

    const ocrResponse = await fetch(`${baseUrl}/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      },
      body: formData
    });

    console.log('OCR Response Status:', ocrResponse.status);
    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json();
      console.error('OCR Error:', errorData);
    }

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check final usage status
    console.log('\n🔄 Checking final usage status...');
    const finalStatusResponse = await fetch(`${baseUrl}/pro/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const finalStatusData = await finalStatusResponse.json();
    console.log('Final Status Response:', JSON.stringify(finalStatusData, null, 2));

  } catch (error) {
    console.error('Test Error:', error);
  }
}

// Run the test
testUsageTracking();