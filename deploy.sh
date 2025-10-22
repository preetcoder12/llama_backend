#!/bin/bash

echo "🌍 Deploying Llama 3 Backend to Cloud..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit for deployment"
fi

echo "🚀 Choose your deployment platform:"
echo "1. Railway (Recommended - Free)"
echo "2. Render (Free tier)"
echo "3. Fly.io (Free tier)"
echo "4. Manual Docker build"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🚂 Deploying to Railway..."
        echo "1. Go to https://railway.app"
        echo "2. Sign up with GitHub"
        echo "3. Create new project"
        echo "4. Connect your GitHub repository"
        echo "5. Railway will auto-detect Dockerfile"
        echo ""
        echo "Your app will be available at: https://your-app-name.railway.app"
        ;;
    2)
        echo "🎨 Deploying to Render..."
        echo "1. Go to https://render.com"
        echo "2. Sign up with GitHub"
        echo "3. Create new Web Service"
        echo "4. Connect your GitHub repository"
        echo "5. Use Docker deployment"
        echo ""
        echo "Your app will be available at: https://your-app-name.onrender.com"
        ;;
    3)
        echo "🪰 Deploying to Fly.io..."
        echo "1. Install flyctl: curl -L https://fly.io/install.sh | sh"
        echo "2. Run: fly auth login"
        echo "3. Run: fly launch"
        echo "4. Run: fly deploy"
        ;;
    4)
        echo "🐳 Building Docker image locally..."
        docker build -t llama3-backend .
        echo "Run with: docker run -p 3000:3000 -p 11434:11434 llama3-backend"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment instructions completed!"
echo "📱 Your API will be accessible globally once deployed!"
echo ""
echo "🔗 Test your deployed API:"
echo "curl https://your-app-url/health"
