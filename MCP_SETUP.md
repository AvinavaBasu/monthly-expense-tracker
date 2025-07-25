# 🔐 Secure MCP Server Setup Guide

## 🎯 Why MCP Server Approach?

The MCP (Model Context Protocol) server approach provides **maximum security** for your Gmail expense tracker:

### 🔒 **Security Benefits:**
- ✅ **Zero client-side credential exposure**
- ✅ **Server-side OAuth2 token management**
- ✅ **Secure email processing**
- ✅ **Production-ready architecture**
- ✅ **Better rate limiting and error handling**
- ✅ **Credentials never touch the browser**

### ⚡ **Performance:**
- Slightly higher latency (client → server → Gmail API)
- But includes caching and batch processing capabilities
- More efficient for large-scale usage

## 🚀 **Complete Setup Process**

### **Step 1: Google Cloud Console Setup**

1. **Create Gmail API Credentials:**
   - Go to https://console.cloud.google.com/
   - Create new project or select existing
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Add redirect URIs:
     - `http://localhost:3001/auth/callback`
     - `http://localhost:3000`

2. **Download credentials and note your Client ID and Secret**

### **Step 2: MCP Server Configuration**

1. **Navigate to MCP server directory:**
   ```bash
   cd mcp-server
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your Gmail credentials:**
   ```env
   # Gmail API Configuration
   GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your-client-secret
   GMAIL_REDIRECT_URI=http://localhost:3001/auth/callback
   
   # MCP Server
   MCP_SERVER_PORT=3001
   CORS_ORIGIN=http://localhost:3000
   
   # Security
   JWT_SECRET=your-super-secret-jwt-key-12345
   ```

### **Step 3: Start MCP Server**

1. **Start in development mode:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   [MCP Server] Gmail Expense Processor starting...
   [MCP Server] Security: All credentials handled server-side
   [MCP Server] Ready to process Gmail expense data securely
   ```

### **Step 4: Update Client Application**

1. **Switch to MCP service in your app:**
   
   Update `src/hooks/useExpenseData.ts`:
   ```typescript
   // Replace this import:
   import { GmailService } from '../services/gmailService';
   
   // With this:
   import { SecureGmailService as GmailService } from '../services/mcpGmailService';
   ```

2. **Start your frontend (in another terminal):**
   ```bash
   # In the main directory
   npm run dev
   ```

## 🧪 **Testing the Integration**

1. **Start both servers:**
   ```bash
   # Terminal 1: MCP Server
   cd mcp-server && npm run dev
   
   # Terminal 2: Frontend
   npm run dev
   ```

2. **Test authentication:**
   - Open http://localhost:3000
   - Click "Sync Gmail" in the app
   - You'll be redirected to Google OAuth
   - Grant permissions
   - Complete authentication flow

3. **View real data:**
   - Once authenticated, expenses will be fetched securely
   - All processing happens server-side
   - Your credentials never touch the browser

## 🔍 **Supported Banks & Features**

### **Banks:**
- ✅ ICICI Bank
- ✅ HDFC Bank
- ✅ Axis Bank
- ✅ State Bank of India
- ✅ Kotak Mahindra Bank
- ✅ Yes Bank
- ✅ Punjab National Bank

### **Categories:**
- 🛒 Shopping (Amazon, Flipkart, etc.)
- 🍕 Food & Dining (Swiggy, Zomato, etc.)
- 🚗 Transportation (Uber, Ola, Petrol, etc.)
- 🎬 Entertainment (Netflix, Spotify, etc.)
- ⚡ Utilities (Electricity, Internet, Mobile, etc.)
- 🏥 Healthcare (Hospitals, Pharmacies, etc.)
- ✈️ Travel (Flights, Hotels, etc.)
- 🛒 Groceries (DMart, BigBasket, etc.)

## 🐛 **Troubleshooting**

### **Common Issues:**

1. **"MCP server not responding"**
   - Check if MCP server is running on port 3001
   - Verify CORS settings in `.env`
   - Check server logs for errors

2. **"Authentication failed"**
   - Verify Gmail API credentials
   - Check redirect URI configuration
   - Ensure OAuth consent screen is configured

3. **"No expenses found"**
   - Check if you have bank transaction emails
   - Verify the search patterns match your banks
   - Check email parsing logs

## 🔒 **Security Features**

- **Server-side credential storage**
- **JWT-based session management**
- **CORS protection**
- **Request validation with Zod schemas**
- **Comprehensive error handling**
- **Rate limiting capabilities**

---

**🎉 Congratulations!** You now have a **production-ready, secure** Gmail expense tracker that processes your financial data safely on the server side, with zero client-side credential exposure! 