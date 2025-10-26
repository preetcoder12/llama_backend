const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "Llama Backend API",
    version: "1.0.0"
  });
});

// Status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "running",
      service: "Llama Backend API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      note: "Simplified version - Ollama integration pending"
    }
  });
});

// Basic vibe recommendations endpoint (without Ollama for now)
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

    // Return mock recommendations for now
    const mockRecommendations = {
      recommendations: [
        {
          place: "Manali",
          state: "Himachal Pradesh",
          location_name: "Himachal Pradesh",
          why: "Perfect for mountain vibes with stunning Himalayan views",
          activities: [
            "Trek to Rohtang Pass",
            "Visit Solang Valley",
            "Paragliding in Bir",
            "Camping by Beas River"
          ]
        },
        {
          place: "Udaipur",
          state: "Rajasthan", 
          location_name: "Rajasthan",
          why: "City of Lakes with beautiful water bodies and palaces",
          activities: [
            "Boat ride on Lake Pichola",
            "Visit City Palace",
            "Explore Jag Mandir",
            "Sunset at Gangaur Ghat"
          ]
        },
        {
          place: "Goa",
          state: "Goa",
          location_name: "Goa", 
          why: "Perfect beach destination with vibrant nightlife",
          activities: [
            "Beach hopping",
            "Water sports",
            "Explore Portuguese architecture",
            "Enjoy local cuisine"
          ]
        }
      ]
    };

    res.json({
      success: true,
      data: {
        user_preferences: {
          selectedVibes,
          location,
          budget,
          duration
        },
        recommendations: mockRecommendations,
        response_time: "0.1 seconds",
        timestamp: new Date().toISOString(),
        note: "Mock recommendations - AI integration coming soon"
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

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Status check: http://localhost:${PORT}/api/status`);
});

module.exports = { app, server };
