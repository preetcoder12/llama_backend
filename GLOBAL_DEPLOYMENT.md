# 🌍 Global Deployment Guide

## Your Repository: https://github.com/preetcoder12/llama_backend

### 🚀 **Deploy to Railway (Recommended - Free)**

#### **Step 1: Go to Railway**
1. Visit [railway.app](https://railway.app)
2. Click "Sign up with GitHub"
3. Authorize Railway to access your repositories

#### **Step 2: Deploy Your Project**
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `preetcoder12/llama_backend`
4. Railway will automatically detect your Dockerfile
5. Click "Deploy"

#### **Step 3: Wait for Deployment**
- Railway will build your Docker container
- Ollama will download Llama 3 model (~4GB)
- This takes 10-15 minutes
- You'll see logs in real-time

#### **Step 4: Get Your Global URL**
- Once deployed, you'll get a URL like: `https://llama-backend-production.up.railway.app`
- This URL is accessible from anywhere in the world!

### 🎨 **Alternative: Deploy to Render**

#### **Step 1: Go to Render**
1. Visit [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render access

#### **Step 2: Create Web Service**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select `preetcoder12/llama_backend`
4. Use these settings:
   - **Build Command:** `docker build -t llama3-backend .`
   - **Start Command:** `./start.sh`
   - **Environment:** Docker

### 📱 **Test Your Global API**

Once deployed, test your endpoints:

```bash
# Health check
curl https://your-app-url/health

# Chat endpoint
curl -X POST https://your-app-url/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'

# Vibe recommendations (for your swipe app)
curl -X POST https://your-app-url/api/vibe-recommendations \
  -H "Content-Type: application/json" \
  -d '{"selectedVibes": ["mountains", "lakes"], "location": "Delhi", "budget": "3000", "duration": "2 days"}'
```

### 🌍 **Global Access Features**

✅ **Accessible from anywhere** in the world  
✅ **Llama 3 model** running in the cloud  
✅ **All API endpoints** working globally  
✅ **Perfect for your swipe app** with structured JSON responses  
✅ **Free hosting** with Railway/Render  

### 📱 **Frontend Integration**

Your frontend can now use the global URL:

```javascript
// Replace with your deployed URL
const API_URL = 'https://your-app-name.railway.app';

// Example: Get vibe recommendations
const getRecommendations = async (vibes) => {
  const response = await fetch(`${API_URL}/api/vibe-recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      selectedVibes: vibes,
      location: 'Delhi',
      budget: '3000',
      duration: '2 days'
    })
  });
  
  return await response.json();
};
```

### ⚡ **Performance Expectations**

| Metric | Free Tier | Performance |
|--------|------------|-------------|
| **RAM** | 1GB | Good for Llama 3 |
| **CPU** | Shared | Sufficient |
| **Cold Start** | 2-3 min | First request |
| **Response Time** | 30-60 sec | Subsequent requests |
| **Global Access** | ✅ Yes | Worldwide |

### 🎯 **Next Steps**

1. **Deploy to Railway** (follow steps above)
2. **Test your global API**
3. **Update your frontend** to use the global URL
4. **Share with the world!** 🌍

**Your Llama 3 backend will be live globally once deployed!** 🚀
