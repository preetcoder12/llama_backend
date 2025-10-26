#!/bin/bash

echo "🚀 Starting Llama 3 Backend Deployment..."

# Start Ollama in background
echo "📡 Starting Ollama service..."
ollama serve &

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to initialize..."
sleep 15

# Check if Ollama is running
echo "🔍 Checking Ollama status..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama is running!"
        break
    else
        echo "⏳ Waiting for Ollama... ($i/30)"
        sleep 2
    fi
done

# Pull the llama3.2:1b model (smaller, faster)
echo "📥 Pulling Llama 3.2 1B model..."
ollama pull llama3.2:1b

# Wait for model to be ready
echo "⏳ Waiting for model to be ready..."
sleep 10

# Start the Node.js application
echo "🚀 Starting Node.js backend..."
node server.js
