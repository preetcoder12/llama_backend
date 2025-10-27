const axios = require('axios');

async function testRawResponse() {
  try {
    console.log('Testing raw LLM response...');
    
    const response = await axios.post('http://localhost:3000/api/vibe-recommendations', {
      selectedVibes: ["manga stores"],
      location: "Delhi",
      budget: "1500",
      duration: "1 day"
    });

    console.log('Full response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testRawResponse();
