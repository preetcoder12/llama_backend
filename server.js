const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ollama API configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.2:1b';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Llama 3 Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Status endpoint to check if Ollama is ready
app.get('/api/status', async (req, res) => {
  try {
    const ollamaReady = await checkOllamaReady();
    res.json({
      success: true,
      data: {
        backend: 'running',
        ollama: ollamaReady ? 'ready' : 'loading',
        model: MODEL_NAME,
        message: ollamaReady ? 'All services are ready' : 'Model is still downloading, please wait 2-3 minutes',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check status',
      details: error.message
    });
  }
});

// Check if Ollama is ready
async function checkOllamaReady() {
  try {
    await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Main API endpoint to interact with Llama 3
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a non-empty string'
      });
    }

    // Check if Ollama is ready
    const ollamaReady = await checkOllamaReady();
    if (!ollamaReady) {
      return res.status(503).json({
        success: false,
        error: 'Ollama service is still starting up',
        details: 'The AI model is being downloaded. Please try again in 2-3 minutes.',
        status: 'model_loading'
      });
    }

    // Prepare the request to Ollama
    const ollamaRequest = {
      model: MODEL_NAME,
      prompt: prompt.trim(),
      stream: false, // Set to false for simple response
      options: {
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 300, // Much shorter responses for faster generation
        num_predict: 200 // Additional limit for faster responses
      }
    };

    console.log(`Sending request to Ollama with prompt: "${prompt}"`);
    const startTime = Date.now();

    // Make request to Ollama API
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, ollamaRequest, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout for faster responses
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`Ollama response received in ${duration.toFixed(2)} seconds`);

    // Extract response from Ollama
    const { response: llamaResponse } = response.data;

    // Send response back to client
    res.json({
      success: true,
      data: {
        prompt: prompt,
        response: llamaResponse,
        model: MODEL_NAME,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error calling Ollama API:', error.message);
    
    // Handle different types of errors
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Ollama service is not running. Please start Ollama first.',
        details: 'Make sure Ollama is running on localhost:11434'
      });
    }
    
    if (error.response) {
      return res.status(500).json({
        success: false,
        error: 'Error from Ollama service',
        details: error.response.data?.error || error.message
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout',
        details: 'The request took too long to process. Try a shorter prompt.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Vibe-based recommendation endpoint
app.post('/api/vibe-recommendations', async (req, res) => {
  try {
    const { selectedVibes, location, budget, duration } = req.body;

    // Validate input
    if (!selectedVibes || !Array.isArray(selectedVibes) || selectedVibes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Selected vibes are required and must be a non-empty array'
      });
    }

    // Check if Ollama is ready
    const ollamaReady = await checkOllamaReady();
    if (!ollamaReady) {
      return res.status(503).json({
        success: false,
        error: 'Ollama service is still starting up',
        details: 'The AI model is being downloaded. Please try again in 2-3 minutes.',
        status: 'model_loading'
      });
    }

    // Create shorter, more focused prompt for faster responses
    const vibePrompt = `Recommend 2-3 places for: ${selectedVibes.join(', ')} in ${location || 'India'}. Budget: ${budget || '2000'}, Duration: ${duration || '1 day'}. 

Return JSON:
{
  "recommendations": [
    {
      "place_name": "Name",
      "description": "Brief description",
      "activities": ["activity1", "activity2"],
      "estimated_cost": "Cost range"
    }
  ],
  "itinerary": [
    {
      "day": 1,
      "morning": "Activity",
      "afternoon": "Activity",
      "evening": "Activity"
    }
  ]
}`;

    console.log(`Sending vibe-based request to Ollama with preferences: ${selectedVibes.join(', ')}`);
    const startTime = Date.now();

    // Prepare the request to Ollama
    const ollamaRequest = {
      model: MODEL_NAME,
      prompt: vibePrompt,
      stream: false,
      options: {
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 400, // Shorter responses for speed
        num_predict: 300
      }
    };

    // Make request to Ollama API
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, ollamaRequest, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    const endTime = Date.now();
    const vibeDuration = (endTime - startTime) / 1000;
    console.log(`Vibe-based response received in ${vibeDuration.toFixed(2)} seconds`);

    // Extract response from Ollama
    const { response: llamaResponse } = response.data;

    // Try to parse JSON response
    let structuredResponse;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = llamaResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      // If JSON parsing fails, return the raw response with a note
      structuredResponse = {
        raw_response: llamaResponse,
        note: "Response could not be parsed as JSON. Please try again."
      };
    }

    // Send response back to client
    res.json({
      success: true,
      data: {
        user_preferences: {
          selectedVibes,
          location,
          budget,
          duration
        },
        recommendations: structuredResponse,
        response_time: `${vibeDuration.toFixed(2)} seconds`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in vibe recommendations:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Ollama service is not running. Please start Ollama first.',
        details: 'Make sure Ollama is running on localhost:11434'
      });
    }
    
    if (error.response) {
      return res.status(500).json({
        success: false,
        error: 'Error from Ollama service',
        details: error.response.data?.error || error.message
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout',
        details: 'The request took too long to process. Try with fewer vibe preferences.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get available models endpoint
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching models:', error.message);
    res.status(503).json({
      success: false,
      error: 'Cannot connect to Ollama service',
      details: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/status',
      'POST /api/chat',
      'POST /api/vibe-recommendations',
      'GET /api/models'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Llama 3 Backend API is running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🎯 Vibe recommendations: http://localhost:${PORT}/api/vibe-recommendations`);
  console.log(`📋 Models endpoint: http://localhost:${PORT}/api/models`);
  console.log('\n📝 Example Postman requests:');
  console.log('POST http://localhost:3000/api/chat');
  console.log('Content-Type: application/json');
  console.log('Body: {"prompt": "Hello, how are you?"}');
  console.log('\nPOST http://localhost:3000/api/vibe-recommendations');
  console.log('Content-Type: application/json');
  console.log('Body: {"selectedVibes": ["mountains", "lakes"], "location": "Delhi", "budget": "2000", "duration": "1 day"}');
});

module.exports = app;
