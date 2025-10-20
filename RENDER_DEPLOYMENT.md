# 🚀 Render Deployment Guide for ACORD Backend

## ✅ **Ready for Render Deployment!**

Your backend is now configured and ready to deploy to Render. Here's your step-by-step guide:

## 📋 **Step-by-Step Render Setup**

### **Step 1: Go to Render**
1. **Visit**: https://render.com
2. **Sign up** with GitHub (recommended)
3. **Click "New +"** → **"Web Service"**

### **Step 2: Connect GitHub Repository**
1. **Select**: `kingmagic0216/acordfiler`
2. **Choose**: `backend` folder
3. **Service Name**: `acord-backend` (or any name you prefer)

### **Step 3: Configure Build Settings**
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: `18` (or latest)

### **Step 4: Add Environment Variables**
Click "Advanced" → "Add Environment Variable" and add these:

```env
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://znlnibnxvamplhccbozt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubG5pYm54dmFtcGxoY2Nib3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjIwNjMsImV4cCI6MjA3NjUzODA2M30.xWiWSG9nstPl3DjUAmpHhZLN5Yano7a1L0Yu6IPmD6g
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres.znlnibnxvamplhccbozt:vuyLudfzWfW5DhiP@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.znlnibnxvamplhccbozt:vuyLudfzWfW5DhiP@aws-1-us-east-2.pooler.supabase.com:5432/postgres
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

### **Step 5: Deploy**
1. **Click "Create Web Service"**
2. **Wait for build** (5-10 minutes)
3. **Get your URL**: `https://your-app-name.onrender.com`

## 🔧 **Important Notes**

### **Service Role Key**
You need to get your Supabase Service Role Key:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy the "service_role" key (not the anon key)
5. Add it to Render environment variables

### **JWT Secrets**
Generate secure JWT secrets:
```bash
# Generate random strings for JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **CORS Origin**
Update `CORS_ORIGIN` to your frontend URL once deployed:
- If using Vercel: `https://your-app-name.vercel.app`
- If using Netlify: `https://your-app-name.netlify.app`

## 🎯 **After Deployment**

### **Test Your Backend**
1. **Health Check**: `https://your-app-name.onrender.com/health`
2. **API Docs**: `https://your-app-name.onrender.com/api-docs`

### **Update Frontend**
Once your backend is deployed, update your frontend's environment variable:
```env
VITE_API_URL=https://your-app-name.onrender.com
```

## 🚀 **Render Benefits**

- ✅ **Free Tier**: 750 hours/month (enough for testing)
- ✅ **Automatic Deployments**: Push to GitHub = auto deploy
- ✅ **Custom Domains**: Add your own domain later
- ✅ **SSL Certificates**: Automatic HTTPS
- ✅ **Monitoring**: Built-in logs and metrics
- ✅ **Environment Variables**: Easy secret management

## 🔄 **Deployment Flow**

1. **Backend**: Deploy to Render → Get URL
2. **Frontend**: Deploy to Vercel → Get URL  
3. **Update**: Frontend API URL to point to Render backend
4. **Test**: Everything works together!

## 📞 **Need Help?**

If you run into issues:
1. **Check Render logs** in the dashboard
2. **Verify environment variables** are set correctly
3. **Test locally** first: `npm run build && npm start`

**Your backend will be live at**: `https://your-app-name.onrender.com` 🎉
