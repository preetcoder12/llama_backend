# Multi-stage build for Ollama + Node.js backend
FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set Ollama environment variables for memory optimization
ENV OLLAMA_HOST=0.0.0.0
ENV OLLAMA_ORIGINS=*
ENV OLLAMA_KEEP_ALIVE=5m
ENV OLLAMA_MAX_LOADED_MODELS=1
ENV OLLAMA_MAX_QUEUE=512

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy application files
COPY . .

# Create startup script
RUN echo '#!/bin/bash\n\
# Set memory limits for Ollama\n\
export OLLAMA_MAX_LOADED_MODELS=1\n\
export OLLAMA_MAX_QUEUE=512\n\
export OLLAMA_KEEP_ALIVE=5m\n\
\n\
# Check available memory\n\
echo "Available memory:"\n\
free -h\n\
echo "Memory usage before Ollama:"\n\
ps aux --sort=-%mem | head -10\n\
\n\
# Start Ollama in background with memory optimization\n\
ollama serve &\n\
\n\
# Wait for Ollama to be ready with more patience\n\
echo "Waiting for Ollama to start..."\n\
for i in {1..60}; do\n\
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then\n\
        echo "Ollama is ready!"\n\
        break\n\
    else\n\
        echo "Waiting for Ollama... ($i/60)"\n\
        sleep 3\n\
    fi\n\
done\n\
\n\
# Pull the model with timeout and retry logic\n\
echo "Pulling model ${MODEL_NAME:-tinyllama:1.1b}..."\n\
for attempt in {1..3}; do\n\
    echo "Pull attempt $attempt/3"\n\
    if timeout 600 ollama pull ${MODEL_NAME:-tinyllama:1.1b}; then\n\
        echo "Model pulled successfully!"\n\
        break\n\
    else\n\
        echo "Pull attempt $attempt failed, retrying..."\n\
        sleep 10\n\
    fi\n\
done\n\
\n\
# Verify model is available\n\
echo "Verifying model is available..."\n\
ollama list\n\
\n\
# Test model loading with a simple request\n\
echo "Testing model loading..."\n\
for i in {1..10}; do\n\
        if curl -s -X POST http://127.0.0.1:11434/api/generate -d "{\\"model\\": \\"${MODEL_NAME:-tinyllama:1.1b}\\", \\"prompt\\": \\"test\\", \\"stream\\": false, \\"options\\": {\\"num_predict\\": 1}}" > /dev/null 2>&1; then\n\
        echo "Model is ready for inference!"\n\
        break\n\
    else\n\
        echo "Model not ready yet... ($i/10)"\n\
        sleep 5\n\
    fi\n\
done\n\
\n\
# Start the Node.js application\n\
echo "Starting Node.js application..."\n\
node server.js' > start.sh

RUN chmod +x start.sh

# Expose ports
EXPOSE $PORT 11434

# Start the application
CMD ["./start.sh"]
