# Environment Variables Setup Guide
## Netlify & GitHub Configuration

---

## 📋 Table of Contents
1. [GitHub Secrets Setup](#github-secrets-setup)
2. [Netlify Environment Variables Setup](#netlify-environment-variables-setup)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Verification Steps](#verification-steps)

---

## 🔐 GitHub Secrets Setup

GitHub Secrets are used for CI/CD workflows and Actions. Here's how to set them up:

### Step 1: Go to Repository Settings
1. Navigate to your GitHub repository: `https://github.com/HusseiniHamiduAlkali/yolaaiinfohub`
2. Click on **Settings** (top menu)
3. On the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Repository Secrets
Click **"New repository secret"** and add each of these:

#### Secret 1: GEMINI_API_KEY
```
Name: GEMINI_API_KEY
Value: AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U
```

#### Secret 2: MONGODB_URI
```
Name: MONGO_URI
Value: mongodb+srv://MovieAppUser:test1234@cluster0.ujvsgkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

#### Secret 3: SESSION_SECRET
```
Name: SESSION_SECRET
Value: your-super-secret-random-string-here-make-it-long-and-random
```

#### Secret 4: GMAIL_USER
```
Name: GMAIL_USER
Value: yolaaiinfohub.auth@gmail.com
```

#### Secret 5: GMAIL_PASS
```
Name: GMAIL_PASS
Value: zbdbjoqsuokmvkci
```

#### Secret 6: NODE_ENV
```
Name: NODE_ENV
Value: production
```

### Step 3: Verify Secrets Are Added
✅ You should see all secrets listed (values hidden for security)

---

## 🚀 Netlify Environment Variables Setup

Netlify hosts your frontend and can also run serverless functions. Here's how:

### Step 1: Go to Netlify Dashboard
1. Go to `https://app.netlify.com`
2. Login to your account
3. Select your site: **yolainfohub** (or your Netlify app name)

### Step 2: Navigate to Environment Settings
- Click **Site settings** (in the top menu)
- In the left sidebar, click **Build & deploy**
- Click **Environment**

### Step 3: Add Environment Variables
Click **Edit variables** and add each variable:

#### Variable 1: GEMINI_API_KEY
```
Key: GEMINI_API_KEY
Value: AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U
Scope: All
```

#### Variable 2: MONGO_URI
```
Key: MONGO_URI
Value: mongodb+srv://MovieAppUser:test1234@cluster0.ujvsgkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
Scope: All
```

#### Variable 3: SESSION_SECRET
```
Key: SESSION_SECRET
Value: your-super-secret-random-string-here-make-it-long-and-random
Scope: All
```

#### Variable 4: GMAIL_USER
```
Key: GMAIL_USER
Value: yolaaiinfohub.auth@gmail.com
Scope: All
```

#### Variable 5: GMAIL_PASS
```
Key: GMAIL_PASS
Value: zbdbjoqsuokmvkci
Scope: All
```

#### Variable 6: NODE_ENV
```
Key: NODE_ENV
Value: production
Scope: All
```

#### Variable 7: RESET_URL_BASE
```
Key: RESET_URL_BASE
Value: https://yolainfohub.netlify.app/reset-password
Scope: All
```

### Step 4: Save and Deploy
- Click **Save**
- Go back to **Deploys**
- Click **Trigger deploy** to redeploy with the new environment variables

---

## 📖 Environment Variables Reference

Here's what each variable does:

| Variable | Purpose | Example |
|----------|---------|---------|
| **GEMINI_API_KEY** | Google Gemini AI API key | `AIzaSyAZ9TgevsUjC...` |
| **MONGO_URI** | MongoDB connection string | `mongodb+srv://user:pass@...` |
| **SESSION_SECRET** | Express session secret | `very-long-random-string` |
| **GMAIL_USER** | Gmail account for emails | `yolaaiinfohub.auth@gmail.com` |
| **GMAIL_PASS** | Gmail app password | `zbdbjoqsuokmvkci` |
| **NODE_ENV** | Environment mode | `production` or `development` |
| **RESET_URL_BASE** | Password reset URL | `https://yolainfohub.netlify.app` |
| **API_BASE** | Backend API URL | `https://your-backend.com` |

---

## 🔑 How to Get These Values

### GEMINI_API_KEY
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Copy your API key (already have: `AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U`)

### MONGO_URI
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **Connect**
3. Choose **Connect your application**
4. Copy the connection string
5. Replace `<password>` with your actual password
6. (Already have: `mongodb+srv://MovieAppUser:test1234@...`)

### SESSION_SECRET
Generate a random secure string:
```bash
# Using node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using openssl
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### GMAIL_USER & GMAIL_PASS
1. Create a Gmail account or use existing one
2. Enable 2-Step Verification in Gmail
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select **Mail** and **Windows Computer** (or your device)
5. Copy the 16-character password (remove spaces)

---

## ✅ Verification Steps

### Step 1: Verify GitHub Secrets
```bash
# These won't display, but you can see them listed in Settings
# Make sure all secrets show with a green checkmark
```

### Step 2: Verify Netlify Variables
1. Go to Netlify Site Settings → Build & deploy → Environment
2. All variables should be listed and editable
3. Values should be masked (showing as `••••••`)

### Step 3: Test in Production
After deployment, test by:
1. Visiting your Netlify site
2. Sending a message to the AI chat
3. Check browser console for errors
4. Check Netlify Functions logs (in Netlify dashboard)

---

## 🚨 Security Best Practices

❌ **DON'T:**
- Commit `.env` files to git
- Share API keys in messages/chat
- Use the same password everywhere
- Store secrets in code

✅ **DO:**
- Use `.env.example` to show required variables (without values)
- Use different keys for development and production
- Rotate keys periodically
- Use strong, random secrets

---

## 🔄 .gitignore Configuration

Make sure your `.gitignore` has these entries:

```bash
# Environment variables
.env
.env.local
.env.*.local
.env.development
.env.production

# Dependencies
node_modules/
package-lock.json
yarn.lock

# IDE
.vscode/
.idea/
*.swp

# Logs
logs/
*.log
```

---

## 📝 .env.example (Safe to Commit)

Create this file to show what variables are needed (no actual values):

```bash
# Google Gemini AI
GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY_HERE

# MongoDB
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/dbname

# Session
SESSION_SECRET=your-secret-session-key-here

# Email
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password-here

# Deployment
NODE_ENV=production
RESET_URL_BASE=https://yolainfohub.netlify.app/reset-password
```

---

## 🔗 Useful Links

- **GitHub Secrets**: https://github.com/HusseiniHamiduAlkali/yolaaiinfohub/settings/secrets/actions
- **Netlify Dashboard**: https://app.netlify.com
- **Google Cloud Console**: https://console.cloud.google.com
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Gmail App Passwords**: https://myaccount.google.com/apppasswords

---

## 📊 Deployment Checklist

- [ ] GitHub secrets are set up correctly
- [ ] Netlify environment variables are configured
- [ ] `.env.example` is committed (without real values)
- [ ] `.env` files are in `.gitignore`
- [ ] Site is redeployed after setting variables
- [ ] Test message is sent and works
- [ ] Browser console shows no errors
- [ ] All API calls succeed

---

## 🆘 Troubleshooting

### "No response from Gemini" error
- Check GEMINI_API_KEY is set in Netlify
- Verify API key is active in Google Cloud
- Check browser console for exact error

### "Cannot connect to database" error
- Verify MONGO_URI is correct
- Check MongoDB IP whitelist (allow Netlify IPs)
- Ensure database user has correct permissions

### "Email not sending" error
- Verify GMAIL_USER and GMAIL_PASS
- Check Gmail app password (not regular password)
- Ensure 2-Step Verification is enabled

### Variables not loading in Netlify
- Redeploy the site after setting variables
- Clear browser cache (Ctrl+Shift+Delete)
- Check Netlify logs for environment loading errors

