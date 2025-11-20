# ✅ Pre-Launch Checklist

Before running your new **gg.play** application, make sure you complete these steps:

## 🔧 Required Setup

### 1. MongoDB Installation
- [ ] **Option A**: Install MongoDB locally
  - Download from: https://www.mongodb.com/try/download/community
  - Install and start MongoDB service
  - Default runs on: `mongodb://localhost:27017`

- [ ] **Option B**: Setup MongoDB Atlas (Cloud)
  - Create account: https://www.mongodb.com/cloud/atlas
  - Create free cluster (M0)
  - Get connection string
  - Whitelist your IP address

### 2. Environment Configuration
- [ ] Copy `env.sample` to `.env`
  ```bash
  cp env.sample .env
  ```
- [ ] Update `MONGODB_URI` in `.env`
  - Local: `mongodb://localhost:27017/ggplay`
  - Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/ggplay`
  
- [ ] **CRITICAL**: Change `JWT_SECRET` in `.env`
  ```env
  JWT_SECRET=your-random-super-secret-key-here-make-it-long
  ```
  Generate a random secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

- [ ] Verify AWS credentials are set:
  - `AWS_REGION`
  - `UPLOADS_BUCKET`
  - `BUILDS_BUCKET`
  - `JOBS_TABLE_NAME`
  - `JOBS_QUEUE_URL`

### 3. Dependencies
- [ ] Install npm packages
  ```bash
  npm install
  ```

## 🎯 Testing Checklist

### 1. Start the Server
```bash
npm start
```

Expected output:
```
===========================================
gg.play - Godot Game Builder Server
===========================================
Server running on http://localhost:3000
AWS Region: us-east-1
MongoDB: Connected
...
```

### 2. Test Landing Page
- [ ] Open http://localhost:3000
- [ ] See cyan-to-blue gradient
- [ ] See "gg.play" title in golden yellow
- [ ] See "BUILD YOUR METAVERSE IN NO TIME"
- [ ] See "Build Now" button
- [ ] See "Login" button (top-right)
- [ ] See social icons (T, L, C)

### 3. Test Registration
- [ ] Click "Build Now" button
- [ ] Auth modal appears
- [ ] Click "Register" link at bottom
- [ ] Enter email, password (min 6 chars), optional name
- [ ] Click "Register" button
- [ ] Should automatically login and show builder page

### 4. Test Login
- [ ] Logout from builder page
- [ ] Should return to landing page
- [ ] Click "Login" button
- [ ] Enter registered email & password
- [ ] Click "Login" button
- [ ] Should redirect to builder page

### 5. Test Auto-Login
- [ ] Don't logout, just refresh the page
- [ ] Should automatically redirect to builder (token in localStorage)
- [ ] Should see user email in header

### 6. Test Builder Functionality
- [ ] Upload a .glb or .obj file
- [ ] File info appears (name, size)
- [ ] Click "Upload Model" button
- [ ] Model uploads to S3 successfully
- [ ] Build section appears
- [ ] Select build type (EXE or WebGL)
- [ ] Click "Build Game" button
- [ ] Job queued successfully
- [ ] Progress bar updates
- [ ] Build completes (requires worker)
- [ ] Download link appears

### 7. Test Error Handling
- [ ] Try login with wrong password → Error shown
- [ ] Try register with existing email → Error shown
- [ ] Try upload without selecting file → Error shown
- [ ] Try build without uploading → Error shown
## 🚀 Deployment Checklist

### Vercel Deployment
- [ ] Push code to GitHub
- [ ] Import project in Vercel
- [ ] Set environment variables in Vercel:
  ```
  MONGODB_URI=mongodb+srv://...
  JWT_SECRET=your-secret
  AWS_REGION=us-east-1
  UPLOADS_BUCKET=...
  BUILDS_BUCKET=...
  JOBS_TABLE_NAME=...
  JOBS_QUEUE_URL=...
  GODOT_PROJECT_PATH=...
  GODOT_EDITOR_PATH=...
  ```
- [ ] Deploy
- [ ] Test production site

### Worker Setup
- [ ] Worker machine has Godot 4.3+ installed
- [ ] Worker has export templates installed
- [ ] Copy `.env` to worker machine
- [ ] Run `npm install` on worker
- [ ] Start worker: `npm run worker`
- [ ] Verify worker polls SQS successfully

## 🔒 Security Checklist

- [ ] JWT_SECRET is NOT the default value
- [ ] JWT_SECRET is at least 32 characters
- [ ] MongoDB has authentication enabled (production)
- [ ] AWS IAM roles properly configured
- [ ] Environment variables not in git (.gitignore includes .env)
- [ ] HTTPS enabled (production)
- [ ] CORS configured if needed

## 📱 Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## 🐛 Common Issues & Solutions

### Issue: "Failed to connect to MongoDB"
**Solution**: 
- Check MongoDB is running: `sudo systemctl status mongod` (Linux)
- Check MONGODB_URI is correct
- For Atlas: Whitelist IP address

### Issue: "Invalid token" or "Token expired"
**Solution**: 
- Clear localStorage: `localStorage.clear()` in browser console
- Login again

### Issue: "Cannot find module 'mongoose'"
**Solution**: 
- Run `npm install` again

### Issue: Landing page works but builder doesn't load
**Solution**: 
- Check browser console for errors
- Verify JWT token is being sent in API requests
- Check server logs for auth errors

### Issue: Build worker not processing jobs
**Solution**: 
- Worker doesn't need authentication
- Check worker can access SQS
- Verify GODOT_EDITOR_PATH is correct

## ✨ Optional Enhancements

- [ ] Add "Forgot Password" functionality
- [ ] Add email verification
- [ ] Add user profile page
- [ ] Add build history per user
- [ ] Add social login (Google, GitHub)
- [ ] Add rate limiting
- [ ] Add admin dashboard
- [ ] Add usage analytics

## 📞 Support

If you run into issues:

1. Check console logs (browser & server)
2. Verify all environment variables are set
3. Check MongoDB connection
4. Review SETUP_GUIDE.md
5. Review IMPLEMENTATION_SUMMARY.md

---

**Ready to launch?** ✅ Check all boxes above and you're good to go! 🚀
