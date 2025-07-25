#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GmailExpenseProcessor } from './services/gmailProcessor.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.MCP_SERVER_PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Initialize Gmail processor
const gmailProcessor = new GmailExpenseProcessor();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Gmail Expense Server is running',
    timestamp: new Date().toISOString()
  });
});

// Get authentication URL
app.post('/auth/url', async (req, res) => {
  try {
    const authUrl = await gmailProcessor.getAuthUrl();
    res.json({
      success: true,
      authUrl,
      message: 'Visit this URL to authenticate with Gmail'
    });
  } catch (error) {
    console.error('Failed to get auth URL:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get auth URL'
    });
  }
});

// Complete authentication (handle OAuth callback)
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>❌ Authentication Failed</h1>
            <p>No authorization code received from Google.</p>
            <p><a href="javascript:window.close()">Close this window</a></p>
          </body>
        </html>
      `);
    }

    await gmailProcessor.authenticate(code as string);
    res.send(`
      <html>
        <body>
          <h1>✅ Authentication Successful!</h1>
          <p>You have successfully authenticated with Gmail.</p>
          <p>You can now close this window and return to your expense tracker.</p>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Authentication failed:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ Authentication Failed</h1>
          <p>Error: ${error instanceof Error ? error.message : 'Authentication failed'}</p>
          <p><a href="javascript:window.close()">Close this window</a></p>
        </body>
      </html>
    `);
  }
});

// Check authentication status
app.get('/auth/status', async (req, res) => {
  try {
    const isAuthenticated = await gmailProcessor.isAuthenticated();
    const userInfo = isAuthenticated ? await gmailProcessor.getUserInfo() : null;

    res.json({
      success: true,
      authenticated: isAuthenticated,
      userInfo
    });
  } catch (error) {
    console.error('Failed to check auth status:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check auth status'
    });
  }
});

// Get expenses
app.post('/expenses', async (req, res) => {
  try {
    if (!await gmailProcessor.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated with Gmail. Please authenticate first.'
      });
    }

    const { maxResults = 50, dateFrom, dateTo, bankFilter } = req.body;
    
    const expenses = await gmailProcessor.fetchExpenses({
      maxResults,
      dateFrom,
      dateTo,
      bankFilter
    });

    res.json({
      success: true,
      expenses,
      count: expenses.length,
      message: `Successfully fetched ${expenses.length} expenses`
    });
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch expenses'
    });
  }
});

// Parse specific email
app.post('/expenses/parse', async (req, res) => {
  try {
    const { emailId } = req.body;
    if (!emailId) {
      return res.status(400).json({
        success: false,
        message: 'Email ID is required'
      });
    }

    if (!await gmailProcessor.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated with Gmail. Please authenticate first.'
      });
    }

    const expense = await gmailProcessor.parseEmailExpense(emailId);

    res.json({
      success: true,
      expense,
      message: expense ? 'Successfully parsed expense' : 'No expense data found in email'
    });
  } catch (error) {
    console.error('Failed to parse email:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to parse email'
    });
  }
});

// Debug endpoint to search for SBI emails
app.post('/debug/sbi-search', async (req, res) => {
  try {
    if (!await gmailProcessor.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated with Gmail. Please authenticate first.'
      });
    }

    const { dateFrom, dateTo } = req.body;
    const results = await gmailProcessor.searchSBIEmails(dateFrom, dateTo);

    res.json({
      success: true,
      results,
      message: `Tested ${results.length} SBI search patterns`
    });
  } catch (error) {
    console.error('Failed to search SBI emails:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to search SBI emails'
    });
  }
});

// Debug endpoint to get raw email content
app.post('/debug/email-content', async (req, res) => {
  try {
    if (!await gmailProcessor.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated with Gmail. Please authenticate first.'
      });
    }

    const { emailId } = req.body;
    if (!emailId) {
      return res.status(400).json({
        success: false,
        message: 'Email ID is required'
      });
    }

    const content = await gmailProcessor.getEmailContent(emailId);

    res.json({
      success: true,
      content,
      message: 'Email content retrieved successfully'
    });
  } catch (error) {
    console.error('Failed to get email content:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get email content'
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(port, () => {
  console.log(`🔐 [Gmail Expense Server] Running on http://localhost:${port}`);
  console.log(`🔒 [Security] All credentials handled server-side`);
  console.log(`📧 [Gmail API] Ready to process expense data securely`);
  console.log(`🌐 [CORS] Accepting requests from ${process.env.CORS_ORIGIN}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [Server] Shutting down gracefully...');
  process.exit(0);
}); 