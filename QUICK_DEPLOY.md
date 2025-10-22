# 🚀 Quick Deployment Guide

## Your Repository: https://github.com/preetcoder12/llama_backend

### **Step 1: Push to GitHub (Manual)**

Since there's a permission issue, you'll need to push manually:

```bash
# In your terminal, run these commands:
cd /home/preet/Documents/locallm_project

# Add all files
git add .

# Commit changes
git commit -m "Add Llama 3 backend with deployment config"

# Push to GitHub (you'll need to authenticate)
git push -u origin main
```

**If you get authentication errors:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a new token with repo permissions
3. Use the token as password when prompted

### **Step 2: Deploy to Railway (Recommended)**

1. **Go to [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose `preetcoder12/llama_backend`**
6. **Railway will auto-detect the Dockerfile**
7. **Wait for deployment (10-15 minutes)**

### **Step 3: Deploy to Render (Alternative)**

1. **Go to [render.com](https://render.com)**
2. **Sign up with GitHub**
3. **Click "New +" → "Web Service"**
4. **Connect your GitHub repo**
5. **Select `preetcoder12/llama_backend`**
6. **Use these settings:**
   - **Build Command:** `docker build -t llama3-backend .`
   - **Start Command:** `./start.sh`
   - **Environment:** Docker

### **Step 4: Test Your Deployed API**

Once deployed, your API will be available at:
- **Railway:** `https://your-app-name.railway.app`
- **Render:** `https://your-app-name.onrender.com`

**Test endpoints:**
```bash
# Health check
curl https://your-app-url/health

# Chat endpoint
curl -X POST https://your-app-url/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'

# Vibe recommendations
curl -X POST https://your-app-url/api/vibe-recommendations \
  -H "Content-Type: application/json" \
  -d '{"selectedVibes": ["mountains"], "location": "Delhi", "budget": "2000", "duration": "1 day"}'
```

## 🎯 **What You'll Get:**

✅ **Global API** accessible from anywhere  
✅ **Llama 3 model** running in the cloud  
✅ **All endpoints working** (`/health`, `/api/chat`, `/api/vibe-recommendations`)  
✅ **Perfect for your swipe app** with structured JSON responses  

## 📱 **Frontend Integration:**

```javascript
// Replace with your deployed URL
const API_URL = 'https://your-app-name.railway.app';

// Your frontend can now use this globally!
fetch(`${API_URL}/api/vibe-recommendations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    selectedVibes: ['mountains', 'lakes'],
    location: 'Delhi',
    budget: '3000',
    duration: '2 days'
  })
});
```

## ⚡ **Performance:**
- **First request:** 2-3 minutes (model loading)
- **Subsequent requests:** 30-60 seconds
- **Global access:** ✅ Works from anywhere!

**Your backend will be live globally once deployed!** 🌍🚀
