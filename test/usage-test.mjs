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

    // Test pro status first
    console.log('\n🔄 Testing initial pro status...');
    const initialStatusResponse = await fetch(`${baseUrl}/pro/status`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    console.log('Initial Status Response:', initialStatusResponse.status);
    const initialStatusData = await initialStatusResponse.json();
    console.log('Initial Usage Data:', JSON.stringify(initialStatusData, null, 2));

    // Test chat endpoint
    console.log('\n🔄 Testing chat endpoint...');
    const chatResponse = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Write a sample paragraph to test token usage. Make it exactly 100 words long.'
        }]
      })
    });

    console.log('Chat Response Status:', chatResponse.status);
    if (!chatResponse.ok) {
      const errorData = await chatResponse.json();
      console.error('Chat Error:', errorData);
    } else {
      console.log('Chat request successful');
    }

    // Wait for usage to be recorded
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check status after chat
    console.log('\n🔄 Checking usage after chat...');
    const midStatusResponse = await fetch(`${baseUrl}/pro/status`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    const midStatusData = await midStatusResponse.json();
    console.log('Usage After Chat:', JSON.stringify(midStatusData, null, 2));

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
    } else {
      const ocrData = await ocrResponse.json();
      console.log('OCR Response:', JSON.stringify(ocrData, null, 2));
    }

    // Wait for usage to be recorded
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check final usage status
    console.log('\n🔄 Checking final usage status...');
    const finalStatusResponse = await fetch(`${baseUrl}/pro/status`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    const finalStatusData = await finalStatusResponse.json();
    console.log('Final Usage Data:', JSON.stringify(finalStatusData, null, 2));

  } catch (error) {
    console.error('Test Error:', error);
  }
}

// Run the test
testUsageTracking();