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
# Wait for Ollama to start\n\
sleep 10\n\
\n\
# Pull the llama3 model\n\
ollama pull llama3\n\
\n\
# Start the Node.js application\n\
node server.js' > start.sh

RUN chmod +x start.sh

# Expose ports
EXPOSE 3000 11434

# Start the application
CMD ["./start.sh"]
