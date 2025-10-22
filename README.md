# Llama 3 Backend API

A simple Node.js backend API to interact with your local Llama 3 model via Ollama.

## Prerequisites

- Node.js (v14 or higher)
- Ollama installed and running
- Llama 3 model downloaded (`ollama pull llama3`)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Make sure Ollama is running:
```bash
ollama serve
```

3. Start the API server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

### 1. Health Check
- **GET** `/health`
- Returns server status

### 2. Chat with Llama 3
- **POST** `/api/chat`
- Send a prompt to your local Llama 3 model

**Request Body:**
```json
{
  "prompt": "Your question or prompt here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prompt": "Your question or prompt here",
    "response": "Llama 3's response",
    "model": "llama3",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### 3. Get Available Models
- **GET** `/api/models`
- Returns list of available Ollama models

## Testing with Postman

1. **Create a new POST request**
   - URL: `http://localhost:3000/api/chat`
   - Method: POST
   - Headers: `Content-Type: application/json`

2. **Request Body (raw JSON):**
```json
{
  "prompt": "What are the best places to visit in New Delhi?"
}
```

3. **Expected Response:**
```json
{
  "success": true,
  "data": {
    "prompt": "What are the best places to visit in New Delhi?",
    "response": "Here are some of the best places to visit in New Delhi...",
    "model": "llama3",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## Error Handling

The API includes comprehensive error handling for:
- Missing or invalid prompts
- Ollama service not running
- Request timeouts
- Model errors

## Configuration

- **Port**: 3000 (configurable via PORT environment variable)
- **Ollama URL**: http://localhost:11434
- **Model**: llama3
- **Timeout**: 2 minutes

## Troubleshooting

1. **"Ollama service is not running"**
   - Start Ollama: `ollama serve`

2. **"Model not found"**
   - Pull the model: `ollama pull llama3`

3. **Connection refused**
   - Check if Ollama is running on port 11434
   - Verify the model is available: `ollama list`
