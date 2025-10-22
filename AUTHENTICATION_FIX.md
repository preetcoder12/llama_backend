# 🔐 Fix GitHub Authentication

## **Problem:** 
You're logged in as `preetgusain` but trying to push to `preetcoder12/llama_backend`

## **Solution 1: Use Personal Access Token**

### **Step 1: Create Personal Access Token**
1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "Llama Backend Deploy"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

### **Step 2: Use Token to Push**
```bash
# When prompted for password, use the token instead
git push --set-upstream origin main
# Username: preetcoder12
# Password: [paste your token here]
```

## **Solution 2: Change Remote URL to Use Token**

```bash
# Replace YOUR_TOKEN with your actual token
git remote set-url origin https://YOUR_TOKEN@github.com/preetcoder12/llama_backend.git

# Then push
git push --set-upstream origin main
```

## **Solution 3: Use SSH (Alternative)**

```bash
# Change to SSH URL
git remote set-url origin git@github.com:preetcoder12/llama_backend.git

# Push with SSH
git push --set-upstream origin main
```

## **After Successful Push:**

1. **Go to [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Deploy from your repository**
4. **Your API will be live globally!**

## **Quick Test After Deployment:**
```bash
curl https://your-app-name.railway.app/health
```

**Choose Solution 1 (Personal Access Token) - it's the easiest!** 🚀
