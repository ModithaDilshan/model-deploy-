# gg.play - Setup Guide

## 🎮 New Features Added

Your project has been successfully upgraded with:

- ✅ **Landing Page** - Beautiful gradient design matching your mockup
- ✅ **User Authentication** - MongoDB-based user management with JWT tokens
- ✅ **Login/Register Modal** - Popup authentication flow
- ✅ **Protected Routes** - Game builder accessible only after login
- ✅ **Single Page Application** - Smooth transitions without page reloads

## 🚀 Quick Start

### 1. Set up MongoDB

**Option A: Local MongoDB**
```bash
# Download and install MongoDB from: https://www.mongodb.com/try/download/community
# MongoDB should run on: mongodb://localhost:27017
```

**Option B: MongoDB Atlas (Cloud)**
```bash
# 1. Create free account at: https://www.mongodb.com/cloud/atlas
# 2. Create a cluster
# 3. Get connection string (e.g., mongodb+srv://username:password@cluster.mongodb.net/ggplay)
# 4. Update MONGODB_URI in .env file
```

### 2. Configure Environment Variables

Update your `.env` file with:

```env
# MongoDB Connection (choose one)
MONGODB_URI=mongodb://localhost:27017/ggplay
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ggplay

# Authentication Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-random-string-here

# AWS and Godot settings remain the same...
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
npm start
```

Visit: `http://localhost:3000`

## 🎨 User Flow

1. **Landing Page**: Users see the gradient landing page with "gg.play" branding
2. **Click "Build Now" or "Login"**: Opens authentication modal
3. **Register/Login**: Users create account or login
4. **Game Builder**: After authentication, redirected to the game builder page
5. **Upload & Build**: Upload 3D models and build games (same as before)
6. **Logout**: Click logout button to return to landing page

## 📁 New File Structure

```
public/
  ├── index.html          # Minimal SPA container
  ├── style.css           # Complete redesign with landing + builder styles
  └── js/                 # New modular JavaScript
      ├── app.js          # Main app state & routing
      ├── landing.js      # Landing page view
      ├── builder.js      # Game builder view (refactored)
      └── auth.js         # Login/Register modal

api/
  └── auth/               # Authentication endpoints
      ├── register.js     # POST /api/auth/register
      ├── login.js        # POST /api/auth/login
      ├── logout.js       # POST /api/auth/logout
      └── me.js           # GET /api/auth/me

models/
  └── User.js             # MongoDB user schema

db/
  └── connection.js       # MongoDB connection logic

middleware/
  └── auth.js             # JWT authentication middleware
```

## 🔒 Protected API Routes

All game builder endpoints now require authentication:

- `POST /api/upload-url` - Requires valid JWT token
- `POST /api/jobs` - Requires valid JWT token
- `GET /api/jobs/:jobId` - Requires valid JWT token
- `GET /api/jobs/:jobId/download` - Requires valid JWT token

## 🎯 Authentication Endpoints

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" (optional)
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

## 🎨 Design Features

### Landing Page
- Cyan to blue gradient background (#5dd9d9 → #2d5fea)
- Large "gg.play" title in golden yellow (#fbbf24)
- "BUILD YOUR METAVERSE IN NO TIME" tagline
- Yellow "Build Now" button
- Top-right "Login" button
- Social media icons (T, L, C)

### Builder Page
- Same gradient header with logo
- User email display + Logout button
- Clean white content area
- All original game builder functionality preserved

### Auth Modal
- Smooth slide-in animation
- Glassmorphism overlay with blur
- Toggle between Login/Register
- Form validation
- Error messages

## 🔧 Troubleshooting

### MongoDB Connection Error
```
Error: Failed to connect to MongoDB
```
**Solution**: 
1. Make sure MongoDB is running
2. Check MONGODB_URI in .env file
3. For Atlas: Whitelist your IP address

### JWT Token Invalid
```
Error: Invalid token
```
**Solution**: 
1. Token expired - Login again
2. JWT_SECRET changed - Logout and login again

### Build worker still works?
Yes! The worker doesn't need authentication. It polls SQS independently.

## 📝 Next Steps

1. **Update JWT_SECRET**: Change it to a random secure string
2. **Set up MongoDB**: Local or Atlas
3. **Test the flow**: Register → Login → Build a game
4. **Customize**: Update colors, text, social links as needed
5. **Deploy**: Update Vercel with new environment variables

## 🌟 Features

- ✅ JWT-based authentication (7-day expiry)
- ✅ Password hashing with bcrypt
- ✅ Protected API routes
- ✅ Local storage for persistent login
- ✅ Responsive design
- ✅ Smooth animations
- ✅ Error handling
- ✅ Token verification on page load

Enjoy your new authenticated game builder! 🎮✨
