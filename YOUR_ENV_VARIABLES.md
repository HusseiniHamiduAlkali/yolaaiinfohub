# Your Project Environment Variables Summary

**Project Name:** YolaAIInfoHub  
**Repository:** https://github.com/HusseiniHamiduAlkali/yolaaiinfohub  
**Live Site:** https://yolainfohub.netlify.app  
**Setup Date:** December 26, 2025

---

## 🔑 Variables You Already Have

Copy these exact values into Netlify and GitHub:

### 1️⃣ GEMINI_API_KEY
```
Value: AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U
Service: Google Generative AI (Gemini)
Usage: AI chat responses in home.js, eduinfo.js, etc.
Status: ✅ Active
```

**Where to set:**
- [ ] Netlify: Site Settings → Build & deploy → Environment
- [ ] GitHub: Settings → Secrets and variables → Actions

---

### 2️⃣ MONGO_URI
```
Value: mongodb+srv://MovieAppUser:test1234@cluster0.ujvsgkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
Service: MongoDB Atlas (Database)
Usage: User authentication, storing chat history, profiles
Status: ✅ Active
```

**Where to set:**
- [ ] Netlify: Site Settings → Build & deploy → Environment
- [ ] GitHub: Settings → Secrets and variables → Actions

---

### 3️⃣ GMAIL_USER
```
Value: yolaaiinfohub.auth@gmail.com
Service: Gmail (Email Service)
Usage: Sending password reset emails, notifications
Status: ✅ Active
```

**Where to set:**
- [ ] Netlify: Site Settings → Build & deploy → Environment
- [ ] GitHub: Settings → Secrets and variables → Actions

---

### 4️⃣ GMAIL_PASS
```
Value: zbdbjoqsuokmvkci
Service: Gmail App Password (NOT regular password)
Usage: Authenticating email sending service
Status: ✅ Active
⚠️  NOTE: This is an App Password, not your Google password
```

**Where to set:**
- [ ] Netlify: Site Settings → Build & deploy → Environment
- [ ] GitHub: Settings → Secrets and variables → Actions

---

### 5️⃣ NODE_ENV
```
Value: production
Service: Application Configuration
Usage: Tells app to run in production mode
Status: ✅ Set
```

**Where to set:**
- [ ] Netlify: Site Settings → Build & deploy → Environment
- [ ] GitHub: Settings → Secrets and variables → Actions

---

## 🔐 Variables You Need to Generate

### SESSION_SECRET ⚠️ IMPORTANT
**This must be random and unique!**

**Generate using one of these methods:**

#### Option 1: Using Node.js (Easiest)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
This will output something like:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

#### Option 2: Using OpenSSL
```bash
openssl rand -hex 32
```

#### Option 3: Using Python
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

#### Option 4: Online Generator
Visit: https://www.random.org/bytes/ and copy 32 random bytes

**After generating:**
1. Copy your generated string
2. Add to Netlify environment variables
3. Add to GitHub secrets
4. Store it somewhere safe (password manager)

---

### RESET_URL_BASE (Optional but Recommended)
```
Value: https://yolainfohub.netlify.app/reset-password
Service: Application Configuration
Usage: URL for password reset emails
Status: ⚠️  May need to add
```

**Where to set:**
- [ ] Netlify: Site Settings → Build & deploy → Environment

---

## 🚀 Setup Instructions (Copy-Paste Ready)

### For Netlify

1. **Go to:** https://app.netlify.com
2. **Select Site:** yolainfohub (or your Netlify app name)
3. **Click:** Site Settings (top menu)
4. **Click Left Sidebar:** Build & deploy
5. **Click:** Environment
6. **Click:** Edit variables
7. **Add each variable:**

```
GEMINI_API_KEY | AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U

MONGO_URI | mongodb+srv://MovieAppUser:test1234@cluster0.ujvsgkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

SESSION_SECRET | [YOUR GENERATED SECRET HERE]

GMAIL_USER | yolaaiinfohub.auth@gmail.com

GMAIL_PASS | zbdbjoqsuokmvkci

NODE_ENV | production

RESET_URL_BASE | https://yolainfohub.netlify.app/reset-password
```

8. **Click:** Save
9. **Go to:** Deploys
10. **Click:** Trigger deploy
11. **Wait** for green checkmark ✅

---

### For GitHub

1. **Go to:** https://github.com/HusseiniHamiduAlkali/yolaaiinfohub/settings/secrets/actions
2. **Click:** New repository secret
3. **Add each secret:**

```
Name: GEMINI_API_KEY
Value: AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U
```

```
Name: MONGO_URI
Value: mongodb+srv://MovieAppUser:test1234@cluster0.ujvsgkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

```
Name: SESSION_SECRET
Value: [YOUR GENERATED SECRET HERE]
```

```
Name: GMAIL_USER
Value: yolaaiinfohub.auth@gmail.com
```

```
Name: GMAIL_PASS
Value: zbdbjoqsuokmvkci
```

```
Name: NODE_ENV
Value: production
```

4. **Verify** all secrets appear in the list with green checkmarks ✅

---

### For Local Development

1. **Create file:** `.env` in your project root
2. **Add content:**
```bash
GEMINI_API_KEY=AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U
MONGO_URI=mongodb+srv://MovieAppUser:test1234@cluster0.ujvsgkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
SESSION_SECRET=[YOUR GENERATED SECRET]
GMAIL_USER=yolaaiinfohub.auth@gmail.com
GMAIL_PASS=zbdbjoqsuokmvkci
NODE_ENV=development
RESET_URL_BASE=http://localhost:4000/reset-password
```

3. **Save and DON'T commit!**
4. **Run:** `npm start`
5. **Test** the chat function

---

## ✅ Setup Completion Checklist

### Netlify Setup
- [ ] Logged into Netlify account
- [ ] Selected correct site (yolainfohub)
- [ ] Added GEMINI_API_KEY
- [ ] Added MONGO_URI
- [ ] Added SESSION_SECRET (generated)
- [ ] Added GMAIL_USER
- [ ] Added GMAIL_PASS
- [ ] Added NODE_ENV
- [ ] Added RESET_URL_BASE
- [ ] Clicked Save
- [ ] Triggered deploy
- [ ] Deploy completed (green checkmark)
- [ ] Tested live site

### GitHub Secrets Setup
- [ ] Logged into GitHub
- [ ] Navigated to repository settings
- [ ] Went to Secrets and variables → Actions
- [ ] Added GEMINI_API_KEY
- [ ] Added MONGO_URI
- [ ] Added SESSION_SECRET
- [ ] Added GMAIL_USER
- [ ] Added GMAIL_PASS
- [ ] Added NODE_ENV
- [ ] All secrets show in list

### Local Development Setup
- [ ] Created `.env` file in root
- [ ] Added all variables with real values
- [ ] Added `.env` to `.gitignore`
- [ ] Ran `npm install`
- [ ] Ran `npm start`
- [ ] Tested chat locally
- [ ] No errors in console

### Production Testing
- [ ] Visit: https://yolainfohub.netlify.app
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Send test message to AI
- [ ] See response from Gemini
- [ ] Check Network tab for `/api/gemini` request
- [ ] See HTTP 200 status (success)

---

## 🔒 Security Reminders

✅ **DO:**
- Store these values in password manager
- Rotate SESSION_SECRET periodically
- Use different keys for dev/production
- Keep `.env` local-only
- Check `.gitignore` includes `.env`

❌ **DON'T:**
- Share API keys in chat or email
- Commit `.env` to GitHub
- Use same password everywhere
- Store secrets in code comments
- Screenshot secrets

---

## 🆘 Troubleshooting Reference

| Problem | Solution |
|---------|----------|
| "No response from Gemini" | Check GEMINI_API_KEY in Netlify |
| "Cannot connect to database" | Verify MONGO_URI, check IP whitelist |
| "Email not sending" | Use Gmail app password, enable 2FA |
| "Variables not loading" | Redeploy Netlify, clear cache |
| "Build fails on Netlify" | Check build logs, ensure all vars set |

---

## 📝 Quick Links

- **Netlify Dashboard:** https://app.netlify.com
- **GitHub Secrets:** https://github.com/HusseiniHamiduAlkali/yolaaiinfohub/settings/secrets/actions
- **Google Cloud:** https://console.cloud.google.com
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
- **Your Live Site:** https://yolainfohub.netlify.app

---

## 📞 Support

If you encounter issues:

1. **Check browser console** (F12 → Console)
2. **Check Netlify logs** (Netlify → Deploys → view log)
3. **Check GitHub Actions** (if using workflows)
4. **Verify variables are set** in Netlify/GitHub
5. **Clear cache** and redeploy

---

**Last Updated:** December 26, 2025  
**Created By:** GitHub Copilot  
**Status:** Ready for Setup ✅

