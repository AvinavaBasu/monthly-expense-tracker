#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { GmailExpenseProcessor } from './services/gmailProcessor.js';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Validation schemas
const GetExpensesSchema = z.object({
  maxResults: z.number().min(1).max(100).default(50),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  bankFilter: z.array(z.string()).optional(),
});

const AuthenticateSchema = z.object({
  authCode: z.string().optional(),
});

export class GmailExpenseMCPServer {
  private server: Server;
  private gmailProcessor: GmailExpenseProcessor;

  constructor() {
    this.server = new Server({
      name: 'gmail-expense-processor',
      version: '1.0.0',
      description: 'Secure MCP server for processing Gmail expense data',
    });

    this.gmailProcessor = new GmailExpenseProcessor();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'authenticate_gmail',
            description: 'Authenticate with Gmail using OAuth2 (server-side)',
            inputSchema: {
              type: 'object',
              properties: {
                authCode: {
                  type: 'string',
                  description: 'Authorization code from OAuth2 flow (optional for initial auth URL)',
                },
              },
            },
          },
          {
            name: 'get_expenses',
            description: 'Fetch and parse expense data from Gmail safely',
            inputSchema: {
              type: 'object',
              properties: {
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of emails to process (1-100)',
                  default: 50,
                },
                dateFrom: {
                  type: 'string',
                  description: 'Start date filter (YYYY-MM-DD)',
                },
                dateTo: {
                  type: 'string',
                  description: 'End date filter (YYYY-MM-DD)',
                },
                bankFilter: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by specific banks (e.g., ["ICICI", "HDFC"])',
                },
              },
            },
          },
          {
            name: 'get_auth_status',
            description: 'Check Gmail authentication status',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'parse_expense_email',
            description: 'Parse a specific email for expense data',
            inputSchema: {
              type: 'object',
              properties: {
                emailId: {
                  type: 'string',
                  description: 'Gmail message ID to parse',
                },
              },
              required: ['emailId'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'authenticate_gmail':
            return await this.handleAuthenticate(args);

          case 'get_expenses':
            return await this.handleGetExpenses(args);

          case 'get_auth_status':
            return await this.handleGetAuthStatus();

          case 'parse_expense_email':
            return await this.handleParseEmail(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async handleAuthenticate(args: any) {
    try {
      const validated = AuthenticateSchema.parse(args);
      
      if (!validated.authCode) {
        // Return OAuth URL for initial authentication
        const authUrl = await this.gmailProcessor.getAuthUrl();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                authUrl,
                message: 'Visit this URL to authenticate with Gmail',
              }),
            },
          ],
        };
      } else {
        // Exchange auth code for tokens
        await this.gmailProcessor.authenticate(validated.authCode);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                authenticated: true,
                message: 'Successfully authenticated with Gmail',
              }),
            },
          ],
        };
      }
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetExpenses(args: any) {
    try {
      const validated = GetExpensesSchema.parse(args);
      
      if (!await this.gmailProcessor.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail. Please authenticate first.');
      }

      const expenses = await this.gmailProcessor.fetchExpenses({
        maxResults: validated.maxResults,
        dateFrom: validated.dateFrom,
        dateTo: validated.dateTo,
        bankFilter: validated.bankFilter,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              expenses,
              count: expenses.length,
              message: `Successfully fetched ${expenses.length} expenses`,
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch expenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetAuthStatus() {
    try {
      const isAuthenticated = await this.gmailProcessor.isAuthenticated();
      const userInfo = isAuthenticated ? await this.gmailProcessor.getUserInfo() : null;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              authenticated: isAuthenticated,
              userInfo,
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to check auth status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleParseEmail(args: any) {
    try {
      if (!args.emailId) {
        throw new Error('Email ID is required');
      }

      if (!await this.gmailProcessor.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail. Please authenticate first.');
      }

      const expense = await this.gmailProcessor.parseEmailExpense(args.emailId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              expense,
              message: expense ? 'Successfully parsed expense' : 'No expense data found in email',
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to parse email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupErrorHandling() {
    this.server.onerror = (error: Error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('\n[MCP Server] Shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    console.log('[MCP Server] Gmail Expense Processor starting...');
    console.log('[MCP Server] Security: All credentials handled server-side');
    console.log('[MCP Server] Ready to process Gmail expense data securely');
    
    await this.server.connect(transport);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new GmailExpenseMCPServer();
  server.start().catch((error) => {
    console.error('[MCP Server] Failed to start:', error);
    process.exit(1);
  });
} 