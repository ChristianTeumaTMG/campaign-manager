# 🚀 Deploy Campaign Manager

## Option 1: Deploy to Heroku (Free Tier)

### Step 1: Install Heroku CLI
```bash
# macOS
brew install heroku/brew/heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### Step 2: Login to Heroku
```bash
heroku login
```

### Step 3: Create Heroku App
```bash
cd /Users/christiantheuma/campaign-manager
heroku create your-campaign-manager-app
```

### Step 4: Deploy
```bash
# Copy the production package.json
cp package-deploy.json package.json

# Deploy to Heroku
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

### Step 5: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-jwt-key-here
```

### Step 6: Open Your App
```bash
heroku open
```

## Option 2: Deploy to Railway (Free Tier)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login and Deploy
```bash
cd /Users/christiantheuma/campaign-manager
railway login
railway init
railway up
```

## Option 3: Deploy to Render (Free Tier)

### Step 1: Connect GitHub
1. Push your code to GitHub
2. Go to https://render.com
3. Connect your GitHub account
4. Create a new Web Service

### Step 2: Configure
- **Build Command:** `npm install`
- **Start Command:** `node server-sqlite.js`
- **Environment:** Node

## Option 4: Deploy to Vercel (Free Tier)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
cd /Users/christiantheuma/campaign-manager
vercel
```

## Option 5: Deploy to Netlify (Free Tier)

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Deploy
```bash
cd /Users/christiantheuma/campaign-manager
netlify deploy --prod
```

## 🎯 Quick Deploy Commands

### For Heroku (Recommended):
```bash
cd /Users/christiantheuma/campaign-manager
cp package-deploy.json package.json
git init
git add .
git commit -m "Deploy campaign manager"
heroku create your-app-name
git push heroku main
heroku open
```

## 📝 After Deployment

1. **Update API URLs** in the frontend
2. **Test the script generation** 
3. **Create your first campaign**
4. **Test the script injection**

## 🔧 Environment Variables

Set these in your hosting platform:
- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key`
- `PORT=5000` (usually auto-set)

## 📱 Your App Will Be Available At:
- **Heroku:** `https://your-app-name.herokuapp.com`
- **Railway:** `https://your-app-name.railway.app`
- **Render:** `https://your-app-name.onrender.com`
- **Vercel:** `https://your-app-name.vercel.app`
- **Netlify:** `https://your-app-name.netlify.app`

