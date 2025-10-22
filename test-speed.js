const axios = require('axios');

async function testSpeed() {
  const baseURL = 'http://localhost:3000';
  
  const testPrompts = [
    "Hello",
    "Name 3 places in New Delhi",
    "What are the best places to visit in New Delhi?",
    "Tell me about India Gate"
  ];

  console.log('🚀 Testing API Speed...\n');

  for (const prompt of testPrompts) {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${baseURL}/api/chat`, {
        prompt: prompt
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`📝 Prompt: "${prompt}"`);
      console.log(`⏱️  Response time: ${duration.toFixed(2)} seconds`);
      console.log(`📄 Response length: ${response.data.data.response.length} characters`);
      console.log('---');
      
    } catch (error) {
      console.error(`❌ Error with prompt "${prompt}":`, error.message);
    }
  }
}



testSpeed();
