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
# Start Ollama in background\n\
ollama serve &\n\
\n\
# Wait for Ollama to be ready\n\
echo "Waiting for Ollama to start..."\n\
for i in {1..30}; do\n\
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then\n\
        echo "Ollama is ready!"\n\
        break\n\
    else\n\
        echo "Waiting for Ollama... ($i/30)"\n\
        sleep 2\n\
    fi\n\
done\n\
\n\
# Pull the model and wait for completion\n\
echo "Pulling model ${MODEL_NAME:-llama3.2:1b}..."\n\
ollama pull ${MODEL_NAME:-llama3.2:1b}\n\
\n\
# Verify model is available\n\
echo "Verifying model is available..."\n\
ollama list\n\
\n\
# Start the Node.js application\n\
echo "Starting Node.js application..."\n\
node server.js' > start.sh

RUN chmod +x start.sh

# Expose ports
EXPOSE $PORT 11434

# Start the application
CMD ["./start.sh"]
