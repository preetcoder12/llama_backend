const axios = require('axios');

async function testVibeAPI() {
  const baseURL = 'http://localhost:3000';
  
  const testCases = [
    {
      name: "Mountain & Lake Lover",
      data: {
        selectedVibes: ["mountains", "lakes", "hiking"],
        location: "Delhi",
        budget: "3000",
        duration: "2 days"
      }
    },
    {
      name: "Food & Culture Enthusiast", 
      data: {
        selectedVibes: ["historic_places", "museums", "restaurants"],
        location: "Delhi",
        budget: "2000",
        duration: "1 day"
      }
    },
    {
      name: "Adventure Seeker",
      data: {
        selectedVibes: ["hiking", "camping", "adventure"],
        location: "Delhi",
        budget: "5000",
        duration: "3 days"
      }
    }
  ];

  console.log('🎯 Testing Vibe-Based Recommendation API...\n');

  for (const testCase of testCases) {
    try {
      console.log(`📝 Test Case: ${testCase.name}`);
      console.log(`🎯 Selected Vibes: ${testCase.data.selectedVibes.join(', ')}`);
      
      const startTime = Date.now();
      
      const response = await axios.post(`${baseURL}/api/vibe-recommendations`, testCase.data);
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`⏱️  Response time: ${duration.toFixed(2)} seconds`);
      console.log(`✅ Status: ${response.data.success ? 'Success' : 'Failed'}`);
      
      if (response.data.success) {
        const recommendations = response.data.data.recommendations;
        if (recommendations.recommendations && recommendations.recommendations.length > 0) {
          console.log(`🏞️  Places recommended: ${recommendations.recommendations.length}`);
          console.log(`📋 First recommendation: ${recommendations.recommendations[0].place_name}`);
        } else {
          console.log(`📄 Raw response length: ${JSON.stringify(recommendations).length} characters`);
        }
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.error(`❌ Error with test case "${testCase.name}":`, error.response?.data?.error || error.message);
      console.log('---\n');
    }
  }
}

testVibeAPI();
