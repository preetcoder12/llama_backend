#!/bin/bash

echo "🚀 Deploying to Render with Ollama fixes..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit with Ollama fixes"
fi

# Add all changes
git add .
git commit -m "Fix Ollama model loading timeouts and add retry logic"

# Push to main branch
echo "Pushing to main branch..."
git push origin main

echo "✅ Deployment initiated!"
echo "🔍 Check your Render dashboard for deployment progress"
echo "📊 Monitor logs for model loading status"
echo "⏱️  Initial deployment may take 5-10 minutes due to model download"
