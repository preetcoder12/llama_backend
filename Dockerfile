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
# Give Ollama a moment to start\n\
sleep 5\n\
\n\
# Kick off model pull in the background (do not block startup)\n\
(sh -c "ollama pull ${MODEL_NAME:-llama3} || true") &\n\
\n\
# Start the Node.js application (Render provides $PORT)\n\
node server.js' > start.sh

RUN chmod +x start.sh

# Expose ports
EXPOSE $PORT 11434

# Start the application
CMD ["./start.sh"]
