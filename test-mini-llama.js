const axios = require('axios');

async function testLlama32() {
  try {
    console.log('Testing Llama 3.2 3B with manga stores query...');
    
    const testData = {
      selectedVibes: ["manga stores"],
      location: "Delhi",
      budget: "1500",
      duration: "1 day"
    };

    const response = await axios.post('http://localhost:3000/api/vibe-recommendations', testData, {
      timeout: 120000 // 2 minutes timeout
    });

    console.log('Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if we got specific manga store recommendations
    const recommendations = response.data.data.recommendations.recommendations;
    console.log('\n=== Analysis ===');
    console.log(`Number of recommendations: ${recommendations.length}`);
    
    recommendations.forEach((rec, index) => {
      console.log(`\nRecommendation ${index + 1}:`);
      console.log(`Place: ${rec.place}`);
      console.log(`Location: ${rec.location_name}`);
      console.log(`Why: ${rec.why}`);
      console.log(`Activities: ${rec.activities.join(', ')}`);
    });

  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testLlama32();
