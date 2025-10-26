// ...existing code...
// Use dynamic import for node-fetch in CommonJS
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// ...existing code...
const PING_URL = 'https://llama-backend-1-ulet.onrender.com/api/status';
const PING_INTERVAL_MS = 60 * 1000; // 1 minute
// ...existing code...
function pingRenderBackend() {
  fetch(PING_URL)
    .then(res => res.json())
    .then(data => {
      console.log(`[PING] Render backend status:`, data);
    })
    .catch(err => {
      console.error(`[PING] Error pinging Render backend:`, err);
    });
}
// ...existing code...
setInterval(pingRenderBackend, PING_INTERVAL_MS);
console.log('Started background ping job to keep Render backend alive.');
// ...existing code...
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ollama API configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL_NAME = process.env.MODEL_NAME || "llama3:latest";

// Function to extract recommendations from text response
function extractRecommendationsFromText(text, location) {
  const recommendations = [];
  const currentState = location || "Delhi";
  
  // Look for place names in various formats
  const placePatterns = [
    /\*\*([^*]+?)\*\*/g,  // **Place Name**
    /Stop \d+:\s*([^(]+?)(?:\s*\([^)]+\))?/g,  // Stop 1: Place Name (time)
    /^\d+\.\s*\*\*([^*]+?)\*\*/gm,  // 1. **Place Name**
    /^\d+\.\s*([^(]+?)(?:\s*\([^)]+\))?/gm,  // 1. Place Name (time)
    /([A-Z][a-z]+ [A-Z][a-z]+ (?:Temple|Store|Mall|Market|Garden|Park|Village|Complex|Center|Bookstore|Library|Comics|Books))/g,  // Specific place types
    /([A-Z][a-z]+ (?:Comics|Books|Bookstore|Library|Store))/g,  // Book store specific
    /([A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)/g  // Multi-word place names
  ];
  
  const foundPlaces = new Set();
  
  placePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let placeName = match[1] || match[0];
      
      // Clean up the place name
      placeName = placeName.trim()
        .replace(/^\d+\.\s*/, '') // Remove leading numbers
        .replace(/\s*\([^)]+\)$/, '') // Remove time in parentheses
        .replace(/^\*\*|\*\*$/g, '') // Remove markdown formatting
        .trim();
      
      // Skip if too short, too generic, or already found
      if (placeName.length < 4 || 
          foundPlaces.has(placeName) ||
          /^(Stop|The|And|Or|But|In|On|At|To|For|With|By|Destination|Location|Duration|Budget|Time|Day|Hours|Minutes|AM|PM|am|pm|recommendation|Delhi|explorations|exploration)$/i.test(placeName) ||
          placeName.includes(':') ||
          placeName.includes('recommendation') ||
          placeName.includes('exploration')) {
        continue;
      }
      
      foundPlaces.add(placeName);
      
      // Determine if it's a temple or hidden gem
      const isTemple = placeName.toLowerCase().includes('temple') || 
                      placeName.toLowerCase().includes('mandir') ||
                      placeName.toLowerCase().includes('ashram');
      
      // Extract location name from the text around the place
      const locationName = extractLocationName(text, placeName, currentState);
      
      recommendations.push({
        place: placeName,
        state: currentState,
        location_name: locationName,
        why: isTemple ? "Sacred temple" : "Hidden gem",
        activities: isTemple ? ["Pray", "Meditate", "Take photos"] : ["Explore", "Take photos", "Learn history"]
      });
    }
  });
  
  // If no places found, create some basic recommendations
  if (recommendations.length === 0) {
    const commonPlaces = [
      { place: "Akshardham Temple", location_name: "Akshardham", activities: ["Visit temple", "Take photos"] },
      { place: "Lotus Temple", location_name: "Kalkaji", activities: ["Meditation", "Architecture tour"] },
      { place: "Hauz Khas Village", location_name: "Hauz Khas", activities: ["Explore ruins", "Visit cafes"] }
    ];
    
    commonPlaces.forEach(place => {
      recommendations.push({
        place: place.place,
        state: currentState,
        location_name: place.location_name,
        why: "Must visit",
        activities: place.activities
      });
    });
  }
  
  return { recommendations: recommendations.slice(0, 3) }; // Limit to 3 recommendations
}

// Function to extract location name from text
function extractLocationName(text, placeName, currentState) {
  // Common Delhi areas and their characteristics
  const delhiAreas = {
    'Connaught Place': ['CP', 'Connaught Place', 'Rajiv Chowk'],
    'Chandni Chowk': ['Chandni Chowk', 'Old Delhi', 'Red Fort area'],
    'Karol Bagh': ['Karol Bagh', 'Paharganj'],
    'Lajpat Nagar': ['Lajpat Nagar', 'Lajpat'],
    'Hauz Khas': ['Hauz Khas', 'South Delhi'],
    'Saket': ['Saket', 'Select City Walk'],
    'Rajouri Garden': ['Rajouri Garden', 'West Delhi'],
    'Greater Kailash': ['Greater Kailash', 'GK', 'South Delhi'],
    'Janpath': ['Janpath', 'Central Delhi'],
    'Daryaganj': ['Daryaganj', 'Old Delhi'],
    'Paharganj': ['Paharganj', 'Main Bazaar'],
    'Khan Market': ['Khan Market', 'Central Delhi'],
    'Sarojini Nagar': ['Sarojini Nagar', 'South Delhi'],
    'Lodhi Road': ['Lodhi Road', 'Central Delhi'],
    'India Gate': ['India Gate', 'Central Delhi'],
    'Akshardham': ['Akshardham', 'East Delhi'],
    'Dwarka': ['Dwarka', 'West Delhi'],
    'Rohini': ['Rohini', 'North Delhi'],
    'Vasant Kunj': ['Vasant Kunj', 'South Delhi'],
    'Nehru Place': ['Nehru Place', 'South Delhi']
  };
  
  // Look for area mentions in the text around the place name
  const placeIndex = text.indexOf(placeName);
  const contextStart = Math.max(0, placeIndex - 200);
  const contextEnd = Math.min(text.length, placeIndex + 200);
  const context = text.substring(contextStart, contextEnd).toLowerCase();
  
  // Check for area mentions in context
  for (const [area, variations] of Object.entries(delhiAreas)) {
    for (const variation of variations) {
      if (context.includes(variation.toLowerCase())) {
        return area;
      }
    }
  }
  
  // Check for specific patterns in the text
  const areaPatterns = [
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /near\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /located\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
  ];
  
  for (const pattern of areaPatterns) {
    const match = pattern.exec(context);
    if (match && match[1]) {
      const foundArea = match[1].trim();
      // Check if it's a known Delhi area
      for (const [area, variations] of Object.entries(delhiAreas)) {
        if (variations.some(v => v.toLowerCase() === foundArea.toLowerCase())) {
          return area;
        }
      }
      return foundArea;
    }
  }
  
  // Default location based on place type
  const lowerPlace = placeName.toLowerCase();
  if (lowerPlace.includes('temple') || lowerPlace.includes('mandir')) {
    return 'Old Delhi';
  } else if (lowerPlace.includes('mall') || lowerPlace.includes('center')) {
    return 'South Delhi';
  } else if (lowerPlace.includes('market') || lowerPlace.includes('bazaar')) {
    return 'Chandni Chowk';
  } else if (lowerPlace.includes('book') || lowerPlace.includes('store')) {
    return 'Connaught Place';
  }
  
  return 'Central Delhi'; // Default fallback
}

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const ollamaReady = await checkOllamaReady();
    const status = ollamaReady ? "OK" : "LOADING";
    const httpStatus = ollamaReady ? 200 : 503;
    
    res.status(httpStatus).json({
      status: status,
      message: ollamaReady ? "Llama 3 Backend API is running" : "Llama 3 model is still loading",
      ollama_ready: ollamaReady,
      model: MODEL_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      message: "Health check failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Status endpoint to check if Ollama is ready
app.get("/api/status", async (req, res) => {
  try {
    const ollamaReady = await checkOllamaReady();
    
    // Get more detailed status information
    let detailedMessage = "All services are ready";
    let ollamaStatus = "ready";
    
    if (!ollamaReady) {
      try {
        // Try to get more specific information about what's wrong
        const tagsResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
        const models = tagsResponse.data.models || [];
        const modelExists = models.some(model => 
          model.name === MODEL_NAME || 
          model.name === `${MODEL_NAME}:latest` ||
          model.name.includes(MODEL_NAME)
        );
        
        if (!modelExists) {
          detailedMessage = `Model ${MODEL_NAME} not found. Available models: ${models.map(m => m.name).join(', ')}`;
          ollamaStatus = "model_missing";
        } else {
          detailedMessage = `Model ${MODEL_NAME} exists but not ready for inference. Please wait 1-2 minutes.`;
          ollamaStatus = "model_loading";
        }
      } catch (error) {
        detailedMessage = "Ollama service is not responding. Please check if Ollama is running.";
        ollamaStatus = "service_down";
      }
    }
    
    res.json({
      success: true,
      data: {
        backend: "running",
        ollama: ollamaStatus,
        model: MODEL_NAME,
        message: detailedMessage,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to check status",
      details: error.message,
    });
  }
});

// Check if Ollama is ready and model is available
async function checkOllamaReady(retryCount = 0) {
  const maxRetries = 3;
  try {
    console.log(`[DEBUG] Checking Ollama at: ${OLLAMA_BASE_URL} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    // First check if Ollama service is running
    const tagsResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 10000 });
    
    // Check if our specific model is available
    const models = tagsResponse.data.models || [];
    console.log(`[DEBUG] Available models:`, models.map(m => m.name));
    console.log(`[DEBUG] Looking for model: ${MODEL_NAME}`);
    
    // Try multiple model name variations
    const possibleModelNames = [
      MODEL_NAME,
      `${MODEL_NAME}:latest`,
      `${MODEL_NAME}:7b`,
      `${MODEL_NAME}:13b`,
      `llama3`,
      `llama3:latest`,
      `llama3:7b`,
      `llama3:13b`,
      `llama3.2:1b`,
      `llama3.2:3b`,
      `llama3.2:7b`
    ];
    
    const modelExists = models.some(model => 
      possibleModelNames.some(name => 
        model.name === name || 
        model.name.includes(name) ||
        name.includes(model.name)
      )
    );
    
    if (!modelExists) {
      console.log(`Model ${MODEL_NAME} not found in available models:`, models.map(m => m.name));
      console.log(`[DEBUG] Attempting to pull model ${MODEL_NAME}...`);
      
      // Try to pull the model if it doesn't exist
      try {
        await axios.post(`${OLLAMA_BASE_URL}/api/pull`, {
          name: MODEL_NAME,
          stream: false
        }, { timeout: 30000 });
        console.log(`[DEBUG] Model pull initiated for ${MODEL_NAME}`);
        return false; // Still not ready, but pull started
      } catch (pullError) {
        console.log(`[DEBUG] Model pull failed:`, pullError.message);
        return false;
      }
    }
    
    // Try to make a simple test request to ensure model is fully loaded
    try {
      const testResponse = await axios.post(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          model: MODEL_NAME,
          prompt: "test",
          stream: false,
          options: {
            num_predict: 1
          }
        },
        { timeout: 60000 } // Increased to 60 seconds
      );
      
      return true;
    } catch (testError) {
      console.log(`Model ${MODEL_NAME} exists but not ready:`, testError.message);
      if (retryCount < maxRetries) {
        console.log(`[DEBUG] Retrying model check in 10 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        return await checkOllamaReady(retryCount + 1);
      }
      return false;
    }
    
  } catch (error) {
    console.log(`Ollama service check failed:`, error.message);
    if (retryCount < maxRetries) {
      console.log(`[DEBUG] Retrying Ollama check in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return await checkOllamaReady(retryCount + 1);
    }
    return false;
  }
}

// Main API endpoint to interact with Llama 3
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, system } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required and must be a non-empty string",
      });
    }

    // Combine system and user prompt if system prompt is provided
    // Use a professional default system prompt if none provided
    const defaultSystemPrompt =
      "You are a highly knowledgeable and professional travel assistant. Provide concise, accurate, and actionable travel recommendations tailored to the user's preferences. Maintain a friendly, clear, and informative tone, and respond strictly in the format requested by the user. Ensure all suggestions are realistic, relevant, and practical, adhering to any constraints such as budget, duration, or travel vibes.";
    let finalPrompt = prompt.trim();
    if (system && typeof system === "string" && system.trim().length > 0) {
      finalPrompt = system.trim() + "\n" + finalPrompt;
    } else {
      finalPrompt = defaultSystemPrompt + "\n" + finalPrompt;
    }

    // Check if Ollama is ready
    const ollamaReady = await checkOllamaReady();
    if (!ollamaReady) {
      return res.status(503).json({
        success: false,
        error: "Ollama service is still starting up",
        details:
          "The AI model is being downloaded. Please try again in 2-3 minutes.",
        status: "model_loading",
      });
    }

    // Prepare the request to Ollama
    const ollamaRequest = {
      model: MODEL_NAME,
      prompt: finalPrompt,
      stream: false, // Set to false for simple response
      options: {
        temperature: 0.6, // Lower for faster generation
        top_p: 0.85, // More focused for speed
        max_tokens: 300, // Reduced for faster responses
        num_predict: 250, // Reduced for speed
        top_k: 30, // Fewer tokens for faster selection
        repeat_penalty: 1.1, // Prevent repetition
      },
    };

    console.log(`Sending request to Ollama with prompt: "${finalPrompt}"`);
    const startTime = Date.now();

    // Make request to Ollama API
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      ollamaRequest,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 120000, // 2 minutes timeout for model loading
      }
    );

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
        system: system || null,
        response: llamaResponse,
        model: MODEL_NAME,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error calling Ollama API:", error.message);

    // Handle different types of errors
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "Ollama service is not running. Please start Ollama first.",
        details: "Make sure Ollama is running on localhost:11434",
      });
    }

    if (error.response) {
      return res.status(500).json({
        success: false,
        error: "Error from Ollama service",
        details: error.response.data?.error || error.message,
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(408).json({
        success: false,
        error: "Request timeout",
        details: "The request took too long to process. Try a shorter prompt.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Vibe-based recommendation endpoint
app.post("/api/vibe-recommendations", async (req, res) => {
  try {
    const { selectedVibes, location, budget, duration } = req.body;

    // Validate input
    if (
      !selectedVibes ||
      !Array.isArray(selectedVibes) ||
      selectedVibes.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Selected vibes are required and must be a non-empty array",
      });
    }

    // Check if Ollama is ready
    const ollamaReady = await checkOllamaReady();
    if (!ollamaReady) {
      return res.status(503).json({
        success: false,
        error: "Ollama service is still starting up",
        details:
          "The AI model is being downloaded. Please try again in 2-3 minutes.",
        status: "model_loading",
      });
    }

    // Professional system prompt for travel recommendations
    const systemPrompt = `You are a travel assistant. Provide detailed travel recommendations with specific places, activities, and reasons. Focus on hidden gems and Hindu temples as requested. Be specific about locations and provide practical information.`;

    // Create the user prompt from the input data
    const vibePrompt = `Based on these travel preferences:
- Vibes: ${selectedVibes.join(", ")}
- Location: ${location || "any location"}
- Budget: ${budget || "any budget"}
- Duration: ${duration || "any duration"}

Please provide travel recommendations that match these preferences.`;

    console.log(
      `Sending vibe-based request to Ollama with preferences: ${selectedVibes.join(
        ", "
      )}`
    );
    const startTime = Date.now();

    // Prepare the request to Ollama with optimized parameters
    const ollamaRequest = {
      model: MODEL_NAME,
      prompt: vibePrompt,
      stream: false,
      options: {
        temperature: 0.7, // Slightly lower for faster generation
        top_p: 0.9, // More focused for faster token selection
        max_tokens: 250, // Reduced for faster generation
        num_predict: 200, // Reduced for faster response
        top_k: 30, // Fewer tokens to consider for speed
        repeat_penalty: 1.1, // Slight penalty for repetition
      },
    };

    // Make request to Ollama API
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      ollamaRequest,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 180000, // 3 minutes timeout for vibe recommendations
      }
    );

    const endTime = Date.now();
    const vibeDuration = (endTime - startTime) / 1000;
    console.log(
      `Vibe-based response received in ${vibeDuration.toFixed(2)} seconds`
    );

    // Extract response from Ollama
    const { response: llamaResponse } = response.data;

    // Try to parse JSON response or extract information from text
    let structuredResponse;
    try {
      // First try to extract JSON from the response
      const jsonMatch = llamaResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredResponse = JSON.parse(jsonMatch[0]);
        console.log("Parsed JSON:", structuredResponse);
      } else {
        // If no JSON found, try to extract information from text response
        console.log("No JSON found, extracting from text response");
        structuredResponse = extractRecommendationsFromText(llamaResponse, location);
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError.message);
      // If JSON parsing fails, try to extract from text
      structuredResponse = extractRecommendationsFromText(llamaResponse, location);
    }

    // Send response back to client
    res.json({
      success: true,
      data: {
        user_preferences: {
          selectedVibes,
          location,
          budget,
          duration,
        },
        recommendations: structuredResponse,
        response_time: `${vibeDuration.toFixed(2)} seconds`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in vibe recommendations:", error.message);

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "Ollama service is not running. Please start Ollama first.",
        details: "Make sure Ollama is running on localhost:11434",
      });
    }

    if (error.response) {
      return res.status(500).json({
        success: false,
        error: "Error from Ollama service",
        details: error.response.data?.error || error.message,
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(408).json({
        success: false,
        error: "Request timeout",
        details:
          "The request took too long to process. Try with fewer vibe preferences.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Get available models endpoint
app.get("/api/models", async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Error fetching models:", error.message);
    res.status(503).json({
      success: false,
      error: "Cannot connect to Ollama service",
      details: error.message,
    });
  }
});

// Manual model pull endpoint
app.post("/api/pull-model", async (req, res) => {
  try {
    const { modelName } = req.body;
    const targetModel = modelName || MODEL_NAME;
    
    console.log(`[DEBUG] Manual model pull requested for: ${targetModel}`);
    
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/pull`, {
      name: targetModel,
      stream: false
    }, { timeout: 300000 }); // 5 minutes timeout
    
    res.json({
      success: true,
      message: `Model ${targetModel} pull initiated`,
      data: response.data,
    });
  } catch (error) {
    console.error("Error pulling model:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to pull model",
      details: error.message,
    });
  }
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /health",
      "GET /api/status",
      "POST /api/chat",
      "POST /api/vibe-recommendations",
      "GET /api/models",
    ],
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start server with initial delay for Ollama
setTimeout(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Llama 3 Backend API is running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
    console.log(
      `🎯 Vibe recommendations: http://localhost:${PORT}/api/vibe-recommendations`
    );
    console.log(`📋 Models endpoint: http://localhost:${PORT}/api/models`);
    console.log("\n📝 Example Postman requests:");
    console.log("POST http://localhost:3000/api/chat");
    console.log("Content-Type: application/json");
    console.log('Body: {"prompt": "Hello, how are you?"}');
    console.log("\nPOST http://localhost:3000/api/vibe-recommendations");
    console.log("Content-Type: application/json");
    console.log(
      'Body: {"selectedVibes": ["mountains", "lakes"], "location": "Delhi", "budget": "2000", "duration": "1 day"}'
    );
  });
}, 30000); // Wait 30 seconds for Ollama to initialize

module.exports = app;
