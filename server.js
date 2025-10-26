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
const MODEL_NAME = process.env.MODEL_NAME || "llama3.2:1b";

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const ollamaReady = await checkOllamaReady();
    const status = ollamaReady ? "OK" : "LOADING";
    const httpStatus = ollamaReady ? 200 : 503;
    
    res.status(httpStatus).json({
      status: status,
      message: ollamaReady ? "Llama 3 Backend API is running" : "Model is still loading",
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
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 300, // Much shorter responses for faster generation
        num_predict: 200, // Additional limit for faster responses
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

    // Professional system prompt for strict JSON output
    const systemPrompt = `You are a highly professional travel assistant. Your ONLY response must be a valid JSON object with this exact structure:
{
  "recommendations": [
    {
      "place": "Name of the place",
      "state": "State where the place is located",
      "why": "Short reason (2-5 words)",
      "activities": ["Activity 1", "Activity 2"]
    }
  ]
}
Do NOT include any text, explanation, greeting, or formatting outside this JSON object. Only return the JSON. Recommendations must match the user's vibes, budget, and duration. Be concise, accurate, and actionable. If you cannot provide recommendations, return:
{
  "recommendations": []
}`;

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
        temperature: 0.7, // Slightly more creative but faster
        top_p: 0.95, // More focused on likely tokens
        max_tokens: 250, // Shorter response
        num_predict: 200, // Fewer tokens to predict
        top_k: 40, // Limit token consideration
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

    // Try to parse JSON response
    let structuredResponse;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = llamaResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in response");
      }
    } catch (parseError) {
      // If JSON parsing fails, return the raw response with a note
      structuredResponse = {
        raw_response: llamaResponse,
        note: "Response could not be parsed as JSON. Please try again.",
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
