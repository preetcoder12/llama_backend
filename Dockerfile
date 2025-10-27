# Multi-stage build for Ollama + Node.js backend
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set Ollama environment variables for memory optimization
ENV OLLAMA_HOST=0.0.0.0
ENV OLLAMA_ORIGINS=*
ENV OLLAMA_KEEP_ALIVE=2m
ENV OLLAMA_MAX_LOADED_MODELS=1
ENV OLLAMA_MAX_QUEUE=256
ENV OLLAMA_CONTEXT_LENGTH=1024
ENV OLLAMA_NUM_PARALLEL=1
ENV OLLAMA_MAX_LOADED_MODELS=1

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production \
    && npm cache clean --force

# Copy application files
COPY . .

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Set memory limits for Ollama\n\
export OLLAMA_MAX_LOADED_MODELS=1\n\
export OLLAMA_MAX_QUEUE=256\n\
export OLLAMA_KEEP_ALIVE=2m\n\
export OLLAMA_CONTEXT_LENGTH=1024\n\
export OLLAMA_NUM_PARALLEL=1\n\
export OLLAMA_HOST=0.0.0.0\n\
export OLLAMA_ORIGINS=*\n\
\n\
# Function to check if Ollama is ready\n\
check_ollama_ready() {\n\
    curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1\n\
}\n\
\n\
# Function to wait for Ollama with timeout\n\
wait_for_ollama() {\n\
    local max_attempts=60\n\
    local attempt=1\n\
    \n\
    echo "Waiting for Ollama to start..."\n\
    while [ $attempt -le $max_attempts ]; do\n\
        if check_ollama_ready; then\n\
            echo "Ollama is ready!"\n\
            return 0\n\
        fi\n\
        echo "Waiting for Ollama... ($attempt/$max_attempts)"\n\
        sleep 3\n\
        attempt=$((attempt + 1))\n\
    done\n\
    \n\
    echo "ERROR: Ollama failed to start within timeout"\n\
    return 1\n\
}\n\
\n\
# Check available memory\n\
echo "=== System Information ==="\n\
echo "Available memory:"\n\
free -h\n\
echo "Memory usage before Ollama:"\n\
ps aux --sort=-%mem | head -10\n\
\n\
# Start Ollama in background\n\
echo "=== Starting Ollama ==="\n\
ollama serve &\n\
OLLAMA_PID=$!\n\
\n\
# Wait for Ollama to be ready\n\
if ! wait_for_ollama; then\n\
    echo "Failed to start Ollama, exiting..."\n\
    kill $OLLAMA_PID 2>/dev/null || true\n\
    exit 1\n\
fi\n\
\n\
# Pull the model if not present\n\
echo "=== Managing Models ==="\n\
if ! ollama list | grep -q "qwen2.5:0.5b"; then\n\
    echo "Pulling qwen2.5:0.5b model..."\n\
    ollama pull qwen2.5:0.5b\n\
else\n\
    echo "qwen2.5:0.5b model is already available!"\n\
fi\n\
\n\
# Clean up any other models\n\
echo "Cleaning up unwanted models..."\n\
ollama list | awk "NR>1 {print \$1}" | grep -v "qwen2.5:0.5b" | while read model; do\n\
    if [ -n "$model" ]; then\n\
        echo "Removing unwanted model: $model"\n\
        ollama rm "$model" || true\n\
    fi\n\
done\n\
\n\
# Verify model is ready\n\
echo "=== Verifying Model ==="\n\
echo "Final model list:"\n\
ollama list\n\
\n\
# Test model with a simple request\n\
echo "Testing model loading..."\n\
for i in {1..5}; do\n\
    if curl -s -X POST http://127.0.0.1:11434/api/generate \\\n\
        -H "Content-Type: application/json" \\\n\
        -d "{\\"model\\": \\"qwen2.5:0.5b\\", \\"prompt\\": \\"Hello\\", \\"stream\\": false, \\"options\\": {\\"num_predict\\": 1}}" > /dev/null 2>&1; then\n\
        echo "Model is ready for inference!"\n\
        break\n\
    else\n\
        echo "Model not ready yet... ($i/5)"\n\
        sleep 5\n\
    fi\n\
done\n\
\n\
# Start the Node.js application\n\
echo "=== Starting Node.js Application ==="\n\
exec node server.js' > start.sh

RUN chmod +x start.sh

# Expose ports
EXPOSE $PORT 11434

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application
CMD ["./start.sh"]

