# 🌍 Global Deployment Guide - Free Cloud Hosting

## 🚀 **Deploy to Railway (Free Tier)**

### **Step 1: Create Railway Account**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your GitHub account

### **Step 2: Deploy Your Project**

#### **Option A: Deploy from GitHub (Recommended)**
1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/locallm_project.git
   git push -u origin main
   ```

2. **Deploy on Railway:**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect the Dockerfile

#### **Option B: Deploy with Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy your project
railway up
```

### **Step 3: Configure Environment Variables**
In Railway dashboard, add these environment variables:
```
OLLAMA_URL=http://localhost:11434
MODEL_NAME=llama3
PORT=3000
```

### **Step 4: Wait for Deployment**
- Railway will build your Docker container
- Ollama will download Llama 3 model (~4GB)
- This may take 10-15 minutes

## 🌐 **Alternative Free Options**

### **Option 1: Render.com**
1. Connect GitHub repository
2. Use Docker deployment
3. Free tier: 750 hours/month

### **Option 2: Fly.io**
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Deploy: `fly launch`
3. Free tier: 3 shared-cpu VMs

### **Option 3: Google Cloud Run**
1. Enable Cloud Run API
2. Deploy with Docker
3. Free tier: 2 million requests/month

## 📱 **Frontend Integration**

Once deployed, your API will be available at:
```
https://your-app-name.railway.app
```

### **API Endpoints:**
- **Health:** `GET https://your-app-name.railway.app/health`
- **Chat:** `POST https://your-app-name.railway.app/api/chat`
- **Vibe Recommendations:** `POST https://your-app-name.railway.app/api/vibe-recommendations`

### **Example Frontend Code:**
```javascript
// Replace localhost with your Railway URL
const API_BASE = 'https://your-app-name.railway.app';

const getRecommendations = async (vibes) => {
  const response = await fetch(`${API_BASE}/api/vibe-recommendations`, {
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

## 🔧 **Troubleshooting**

### **Common Issues:**
1. **Model download timeout:** Increase Railway timeout settings
2. **Memory issues:** Railway free tier has 1GB RAM limit
3. **Cold starts:** First request may take 2-3 minutes

### **Solutions:**
1. **Use smaller model:** Replace `llama3` with `llama3.2:1b` (smaller)
2. **Optimize Dockerfile:** Add model caching
3. **Health checks:** Ensure proper health check endpoints

## 📊 **Performance Expectations**

| Metric | Free Tier | Paid Tier |
|--------|-----------|-----------|
| **RAM** | 1GB | 8GB+ |
| **CPU** | Shared | Dedicated |
| **Cold Start** | 2-3 min | 30 sec |
| **Concurrent Users** | 1-2 | 10+ |

## 🎯 **Next Steps**

1. **Deploy to Railway** (follow steps above)
2. **Test your API** with the new URL
3. **Update your frontend** to use the cloud URL
4. **Share with the world!** 🌍

Your backend will be accessible from anywhere in the world! 🚀
