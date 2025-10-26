const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const PING_URL = 'https://llama-backend-1-ulet.onrender.com//api/status';
const PING_INTERVAL_MS = 60 * 1000; // 1 minute

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ollama API configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL_NAME = process.env.MODEL_NAME || "llama3:latest";

function pingRenderBackend() {
  fetch(PING_URL)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log(`[PING] Backend status:`, data);
    })
    .catch(err => {
      if (err.code === 'ECONNREFUSED') {
        console.error(`[PING] Backend is not running`);
      } else {
        console.error(`[PING] Error pinging backend:`, err.message);
      }
    });
}

// Function to extract recommendations from text response
function extractRecommendationsFromText(text, location, selectedVibes = []) {
  const recommendations = [];
  const currentState = location || "India";
  
  // Split response into place chunks - look for destination patterns
  const placeChunks = text.split(/\n\s*\n/).filter(chunk => chunk.trim());
  
  // Also try splitting by lines that start with destination names
  const lines = text.split('\n');
  const destinationLines = [];
  let currentDestination = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Check if this line looks like a destination name (contains parentheses with state)
    if (line.match(/^[A-Za-z\s]+\([A-Za-z\s]+\):\s*$/)) {
      if (currentDestination) {
        destinationLines.push(currentDestination);
      }
      currentDestination = line;
    } else if (currentDestination && (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* '))) {
      currentDestination += '\n' + line;
    } else if (currentDestination && line.trim() === '') {
      // Empty line, continue collecting
      currentDestination += '\n' + line;
    } else if (currentDestination && !line.match(/^[A-Za-z\s]+\([A-Za-z\s]+\):\s*$/)) {
      // This might be the start of a new destination without proper format
      if (currentDestination.split('\n').length > 1) {
        destinationLines.push(currentDestination);
        currentDestination = '';
      }
    }
  }
  
  if (currentDestination) {
    destinationLines.push(currentDestination);
  }
  
  // Use destination lines if we found any, otherwise use place chunks
  const chunksToProcess = destinationLines.length > 0 ? destinationLines : placeChunks;
  
  chunksToProcess.forEach(chunk => {
    // Try to extract place name and area from the first line
    const firstLine = chunk.split('\n')[0].trim();
    const placeMatch = firstLine.match(/^([^(]+?)(?:\s*\(([^)]+)\))?:\s*$/);
    if (!placeMatch) return;
    
    const placeName = placeMatch[1].trim()
      .replace(/^\*+|\*+$/g, '') // Remove any markdown
      .replace(/^[\d.]+\s*/, ''); // Remove leading numbers
    const extractedArea = placeMatch[2] ? placeMatch[2].trim() : extractLocationName(text, placeName, currentState);
    
    // Extract details from bullet points
    const activities = [];
    let why = `Perfect for ${selectedVibes.join(" and ")} vibes`;
    let budgetInfo = "";
    
    chunk.split('\n').forEach(line => {
      const lineMatch = line.trim().match(/^[-•*]\s*(.+?):\s*(.*)$/);
      if (!lineMatch) return;
      
      const [, key, value] = lineMatch;
      // Clean up the line content
      const lineContent = line.replace(/^\*\d+\.\s*/, '').replace(/^\*+|\*+$/g, '');
      const cleanKey = key.toLowerCase();

      // Skip lines that are just repeating the place name
      if (lineContent.includes(placeName)) return;
      
      if (cleanKey.includes('activities') || cleanKey.startsWith('activities:')) {
        const activityList = value || key;
        const cleanActivities = activityList.replace(/^activities:?\s*/i, '');
        // Split by common separators and clean up
        const activityArray = cleanActivities.split(/[,;]|\sand\s/).map(a => a.trim()).filter(a => a.length > 0);
        activities.push(...activityArray);
      } else if (cleanKey.includes('best timing') || cleanKey.includes('best time') || cleanKey.includes('timing')) {
        const timing = value || key;
        const cleanTiming = timing.replace(/^best timing:?\s*/i, '').replace(/^best time:?\s*/i, '').replace(/^timing:?\s*/i, '');
        activities.push(`Best time to visit: ${cleanTiming}`);
      } else if (cleanKey.includes('why perfect') || cleanKey.includes('why famous') || cleanKey.includes('famous for')) {
        const reason = value || key;
        why = reason.replace(/^why perfect for.*?:?\s*/i, '').replace(/^why famous:?\s*/i, '').replace(/^famous for:?\s*/i, '');
      } else if (cleanKey.includes('budget range') || cleanKey.includes('budget') || cleanKey.includes('cost')) {
        const budget = value || key;
        budgetInfo = budget.replace(/^budget range:?\s*/i, '').replace(/^budget:?\s*/i, '').replace(/^cost:?\s*/i, '');
        if (budgetInfo) {
          activities.push(`Budget: ${budgetInfo}`);
        }
      } else if (cleanKey.match(/^[sb]\s*$/i)) {
        // Skip single letter placeholders
        return;
      } else if (key.length > 3 && !key.match(/^(place|location)\s*\d+$/i) && !key.includes('here are') && !key.includes('recommendations')) {
        // If it's not a single letter and doesn't match any other category, treat as activity
        // But skip generic introduction text
        activities.push(key);
      }
    });
    
    // Only add if we have a valid place name and it's not generic text
    if (placeName && placeName.length > 3 && 
        !placeName.match(/^(place|location)\s*\d+$/i) &&
        !placeName.toLowerCase().includes('here are') &&
        !placeName.toLowerCase().includes('recommendations') &&
        !placeName.toLowerCase().includes('travel destinations') &&
        !placeName.toLowerCase().includes('based on')) {
      // If no specific activities found, add default travel activities based on vibes
      if (activities.length === 0) {
        if (selectedVibes.includes('mountains')) {
          activities.push("Mountain trekking and hiking", "Scenic photography", "Adventure sports");
        }
        if (selectedVibes.includes('lakes')) {
          activities.push("Lake boating and water activities", "Lakeside camping", "Nature walks");
        }
        if (activities.length === 0) {
          activities.push("Explore local attractions", "Experience local culture", "Enjoy scenic views");
        }
      }

      // Add any price-related information if budget is mentioned
      if (chunk.toLowerCase().includes('₹') || chunk.toLowerCase().includes('rs')) {
        const priceMatch = chunk.match(/₹(\d+)|rs\.?\s*(\d+)/i);
        if (priceMatch) {
          const price = priceMatch[1] || priceMatch[2];
          activities.push(`Budget-friendly with prices around ₹${price}`);
        }
      }

      recommendations.push({
        place: placeName,
        state: extractedArea, // Use the extracted area as the state
        location_name: extractedArea,
        why: why,
        activities: activities.slice(0, 4) // Limit to 4 activities
      });
    }
  });
  
  // If no valid recommendations found, add some default travel destinations based on vibes
  if (recommendations.length === 0) {
    const defaultPlaces = [];
    
    if (selectedVibes.includes('mountains') && selectedVibes.includes('lakes')) {
      defaultPlaces.push(
        {
          place: "Manali",
          location: "Himachal Pradesh",
          why: "Perfect blend of mountains and lakes with stunning Himalayan views",
          activities: [
            "Trek to Rohtang Pass",
            "Visit Solang Valley",
            "Camping by Beas River",
            "Paragliding in Bir"
          ]
        },
        {
          place: "Nainital",
          location: "Uttarakhand",
          why: "Beautiful hill station with pristine lakes and mountain views",
          activities: [
            "Boat ride on Naini Lake",
            "Trek to Tiffin Top",
            "Visit Naina Devi Temple",
            "Cable car ride to Snow View Point"
          ]
        }
      );
    } else if (selectedVibes.includes('mountains')) {
      defaultPlaces.push(
        {
          place: "Shimla",
          location: "Himachal Pradesh",
          why: "Queen of Hills with breathtaking mountain views",
          activities: [
            "Ride the Kalka-Shimla toy train",
            "Visit Mall Road",
            "Trek to Kufri",
            "Explore Jakhu Temple"
          ]
        }
      );
    } else if (selectedVibes.includes('lakes')) {
      defaultPlaces.push(
        {
          place: "Udaipur",
          location: "Rajasthan",
          why: "City of Lakes with beautiful water bodies and palaces",
          activities: [
            "Boat ride on Lake Pichola",
            "Visit City Palace",
            "Explore Jag Mandir",
            "Sunset at Gangaur Ghat"
          ]
        }
      );
    }

    defaultPlaces.forEach(place => {
      recommendations.push({
        place: place.place,
        state: place.location, // Use the location as the state
        location_name: place.location,
        why: place.why,
        activities: place.activities
      });
    });
  }
  
  return { recommendations: recommendations.slice(0, 3) }; // Limit to 3 recommendations
}

// Function to extract location name from text
function extractLocationName(text, placeName, currentState) {
  // Common Indian states and their characteristics
  const indianStates = {
    'Himachal Pradesh': ['Himachal Pradesh', 'Himachal', 'HP', 'Shimla', 'Manali', 'Dharamshala', 'Kullu', 'Kangra'],
    'Uttarakhand': ['Uttarakhand', 'Uttaranchal', 'Dehradun', 'Nainital', 'Mussoorie', 'Rishikesh', 'Haridwar', 'Almora'],
    'Rajasthan': ['Rajasthan', 'Jaipur', 'Udaipur', 'Jodhpur', 'Jaisalmer', 'Bikaner', 'Ajmer', 'Pushkar'],
    'Kerala': ['Kerala', 'Kochi', 'Thiruvananthapuram', 'Munnar', 'Alleppey', 'Kumarakom', 'Thekkady', 'Wayanad'],
    'Karnataka': ['Karnataka', 'Bangalore', 'Mysore', 'Coorg', 'Hampi', 'Mangalore', 'Udupi', 'Chikmagalur'],
    'Tamil Nadu': ['Tamil Nadu', 'Chennai', 'Madurai', 'Coimbatore', 'Ooty', 'Kodaikanal', 'Mahabalipuram', 'Kanyakumari'],
    'Maharashtra': ['Maharashtra', 'Mumbai', 'Pune', 'Nashik', 'Aurangabad', 'Kolhapur', 'Lonavala', 'Mahabaleshwar'],
    'Goa': ['Goa', 'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Calangute', 'Baga', 'Anjuna'],
    'Jammu and Kashmir': ['Jammu and Kashmir', 'J&K', 'Srinagar', 'Gulmarg', 'Pahalgam', 'Sonamarg', 'Leh', 'Ladakh'],
    'Sikkim': ['Sikkim', 'Gangtok', 'Pelling', 'Lachung', 'Lachen', 'Namchi', 'Ravangla'],
    'Meghalaya': ['Meghalaya', 'Shillong', 'Cherrapunji', 'Mawsynram', 'Dawki', 'Nongpoh'],
    'Arunachal Pradesh': ['Arunachal Pradesh', 'Itanagar', 'Tawang', 'Bomdila', 'Ziro', 'Pasighat'],
    'Assam': ['Assam', 'Guwahati', 'Kaziranga', 'Manas', 'Jorhat', 'Tezpur', 'Dibrugarh'],
    'West Bengal': ['West Bengal', 'Kolkata', 'Darjeeling', 'Kalimpong', 'Siliguri', 'Sundarbans', 'Digha'],
    'Odisha': ['Odisha', 'Orissa', 'Bhubaneswar', 'Puri', 'Konark', 'Cuttack', 'Rourkela'],
    'Andhra Pradesh': ['Andhra Pradesh', 'Hyderabad', 'Visakhapatnam', 'Tirupati', 'Vijayawada', 'Guntur'],
    'Telangana': ['Telangana', 'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
    'Gujarat': ['Gujarat', 'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Dwarka', 'Somnath'],
    'Madhya Pradesh': ['Madhya Pradesh', 'MP', 'Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Khajuraho'],
    'Uttar Pradesh': ['Uttar Pradesh', 'UP', 'Lucknow', 'Agra', 'Varanasi', 'Allahabad', 'Kanpur', 'Mathura'],
    'Bihar': ['Bihar', 'Patna', 'Gaya', 'Bodh Gaya', 'Nalanda', 'Rajgir', 'Vaishali'],
    'Jharkhand': ['Jharkhand', 'Ranchi', 'Jamshedpur', 'Bokaro', 'Dhanbad', 'Deoghar', 'Giridih'],
    'Chhattisgarh': ['Chhattisgarh', 'Raipur', 'Bilaspur', 'Durg', 'Bhilai', 'Korba', 'Ambikapur'],
    'Haryana': ['Haryana', 'Chandigarh', 'Gurgaon', 'Faridabad', 'Panipat', 'Karnal', 'Hisar'],
    'Punjab': ['Punjab', 'Chandigarh', 'Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda'],
    'Delhi': ['Delhi', 'New Delhi', 'NCT', 'Connaught Place', 'Chandni Chowk', 'Karol Bagh', 'Hauz Khas']
  };
  
  // Look for state mentions in the text around the place name
  const placeIndex = text.indexOf(placeName);
  const contextStart = Math.max(0, placeIndex - 200);
  const contextEnd = Math.min(text.length, placeIndex + 200);
  const context = text.substring(contextStart, contextEnd).toLowerCase();
  
  // Check for state mentions in context
  for (const [state, variations] of Object.entries(indianStates)) {
    for (const variation of variations) {
      if (context.includes(variation.toLowerCase())) {
        return state;
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
      // Check if it's a known Indian state
      for (const [state, variations] of Object.entries(indianStates)) {
        if (variations.some(v => v.toLowerCase() === foundArea.toLowerCase())) {
          return state;
        }
      }
      return foundArea;
    }
  }
  
  // Guess location based on place type or name
  const lowerPlace = placeName.toLowerCase();
  if (lowerPlace.includes('hill') || lowerPlace.includes('mountain') || lowerPlace.includes('peak')) {
    return 'Himachal Pradesh';
  } else if (lowerPlace.includes('lake') || lowerPlace.includes('water') || lowerPlace.includes('river')) {
    return 'Uttarakhand';
  } else if (lowerPlace.includes('palace') || lowerPlace.includes('fort') || lowerPlace.includes('royal')) {
    return 'Rajasthan';
  } else if (lowerPlace.includes('beach') || lowerPlace.includes('coast') || lowerPlace.includes('sea')) {
    return 'Goa';
  } else if (lowerPlace.includes('temple') || lowerPlace.includes('mandir') || lowerPlace.includes('spiritual')) {
    return 'Uttar Pradesh';
  }
  
  return 'India'; // Default fallback
}

// Check if Ollama is ready
async function checkOllamaReady() {
  try {
    // First check if Ollama service is running
    const tagsResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 10000 });
    const models = tagsResponse.data.models || [];
    
    // Check if our model exists
    const modelExists = models.some(model => 
      model.name === MODEL_NAME || 
      model.name === `${MODEL_NAME}:latest` ||
      model.name.includes('llama3')
    );

    if (!modelExists) {
      console.log(`Model ${MODEL_NAME} not found. Available models:`, models.map(m => m.name));
      return false;
    }

    // Try a lightweight model check
    try {
      await axios.post(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          model: MODEL_NAME,
          prompt: "test",
          stream: false,
          options: {
            num_predict: 1
          }
        },
        { timeout: 30000 }
      );
      return true;
    } catch (modelError) {
      console.error("Model check failed:", modelError.message);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error("Ollama service is not running");
    } else {
      console.error("Ollama check failed:", error.message);
    }
    return false;
  }
}

// Start the background ping job
setInterval(pingRenderBackend, PING_INTERVAL_MS);
console.log('Started background ping job to keep server alive.');

// Vibe-based recommendation endpoint
app.post("/api/vibe-recommendations", async (req, res) => {
  try {
    const { selectedVibes, location, budget, duration } = req.body;

    // Validate input
    if (!selectedVibes || !Array.isArray(selectedVibes) || selectedVibes.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Selected vibes are required and must be a non-empty array"
      });
    }

    // Check if Ollama is ready
    const ollamaReady = await checkOllamaReady();
    if (!ollamaReady) {
      return res.status(503).json({
        success: false,
        error: "Ollama service is still starting up",
        details: "The AI model is being downloaded. Please try again in 2-3 minutes.",
        status: "model_loading"
      });
    }

    // Create the user prompt
    const vibePrompt = `You are a travel expert. Recommend exactly 3 travel destinations in ${location || "India"} that match these preferences:

Selected Vibes: ${selectedVibes.join(", ")}
Budget: ₹${budget || "any budget"}
Duration: ${duration || "any duration"}

For each destination, provide ONLY this exact format (no introduction or explanation):

Destination Name (State):
- Activities: [3-4 specific activities]
- Best timing: [when to visit]
- Why perfect: [specific reason for the vibes]
- Budget: [cost range]

Example:
Manali (Himachal Pradesh):
- Activities: Trek to Rohtang Pass, Visit Solang Valley, Paragliding, Camping by Beas River
- Best timing: May to October
- Why perfect: Stunning Himalayan peaks and pristine mountain lakes
- Budget: ₹3000-5000 for 2 days

Provide exactly 3 destinations in this format:`;

    console.log(`Sending vibe-based request to Ollama`);
    const startTime = Date.now();

    // Make request to Ollama API
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: MODEL_NAME,
        prompt: vibePrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 500,
          num_predict: 400,
          top_k: 40,
          repeat_penalty: 1.1
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 180000
      }
    );

    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000;
    console.log(`Response received in ${responseTime.toFixed(2)} seconds`);

    // Extract and process the response
    const { response: llamaResponse } = response.data;
    console.log('Raw LLaMA response:', llamaResponse);
    console.log('Response length:', llamaResponse.length);
    console.log('First 500 chars:', llamaResponse.substring(0, 500));

    const recommendations = extractRecommendationsFromText(llamaResponse, location, selectedVibes);

    res.json({
      success: true,
      data: {
        user_preferences: {
          selectedVibes,
          location,
          budget,
          duration
        },
        recommendations,
        response_time: `${responseTime.toFixed(2)} seconds`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in vibe recommendations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get recommendations",
      details: error.message
    });
  }
});

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Status endpoint
app.get("/api/status", async (req, res) => {
  try {
    let ollamaStatus = "unknown";
    let detailedMessage = "Checking Ollama status...";
    let availableModels = [];

    try {
      // Check Ollama service first
      const tagsResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 10000 });
      availableModels = (tagsResponse.data.models || []).map(m => m.name);
      
      const modelExists = availableModels.some(model => 
        model === MODEL_NAME || 
        model === `${MODEL_NAME}:latest` ||
        model.includes('llama3')
      );

      if (!modelExists) {
        ollamaStatus = "model_missing";
        detailedMessage = `Model ${MODEL_NAME} not found. Available models: ${availableModels.join(', ')}`;
      } else {
        // Try a quick model check
        await axios.post(
          `${OLLAMA_BASE_URL}/api/generate`,
          {
            model: MODEL_NAME,
            prompt: "test",
            stream: false,
            options: { num_predict: 1 }
          },
          { timeout: 30000 }
        );
        ollamaStatus = "ready";
        detailedMessage = "Ollama service is running and model is ready";
      }
    } catch (ollamaError) {
      if (ollamaError.code === 'ECONNREFUSED') {
        ollamaStatus = "not_running";
        detailedMessage = "Ollama service is not running";
      } else if (ollamaError.response?.status === 500) {
        ollamaStatus = "error";
        detailedMessage = "Ollama service error: " + ollamaError.message;
      } else {
        ollamaStatus = "not_ready";
        detailedMessage = "Ollama service is starting up: " + ollamaError.message;
      }
    }

    res.json({
      success: true,
      data: {
        status: "running",
        ollama: {
          status: ollamaStatus,
          message: detailedMessage,
          model: MODEL_NAME,
          available_models: availableModels
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Status check failed",
      details: error.message
    });
  }
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };