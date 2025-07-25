# Monthly Expense Tracker

A React-based expense tracker that automatically parses transaction emails from Gmail to provide real-time expense monitoring and financial insights.

## Features

- 🔐 **Secure Gmail Integration**: OAuth2 authentication with server-side credential management
- 📧 **Automatic Transaction Parsing**: Extracts expense data from bank transaction emails
- 📊 **Financial Dashboard**: Monthly summaries with credit/debit tracking and net totals
- 🏦 **Multi-Bank Support**: Supports ICICI, HDFC, Axis, SBI, and other major Indian banks
- 📈 **Real-time Sync**: Fetches the latest transaction emails from Gmail
- 🔍 **Smart Filtering**: Filters by month, category, and excludes promotional emails
- 💾 **CSV Export**: Export transaction data for external analysis
- 📱 **Responsive Design**: Modern UI with mobile-friendly interface

## Architecture

The application consists of two main components:

- **Frontend**: React app with TypeScript, Vite, and Tailwind CSS
- **Backend**: Node.js Express server with Gmail API integration

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐    Gmail API    ┌─────────────────┐
│   React App     │ ◄────────────── │   Node.js       │ ◄────────────── │   Gmail API     │
│   (Port 3000)   │                 │   Backend       │                 │   (Google)      │
│                 │                 │   (Port 3002)   │                 │                 │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Cloud Platform account
- Gmail account with transaction emails

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Monthly_expenses
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd mcp-server
   npm install
   cd ..
   ```

## Google Cloud Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID (e.g., `turing-handler-353920`)

### 2. Enable Gmail API

1. Navigate to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - App name: `Monthly Expense Tracker`
   - User support email: Your email
   - App logo: (optional)
   - Scopes: Add `https://www.googleapis.com/auth/gmail.readonly`
4. Add test users (including your Gmail address)
5. Save and continue

### 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Choose **Web application**
4. Set authorized redirect URIs:
   - `http://localhost:3002/auth/callback`
5. Save and download the credentials JSON file

### 5. Configure Environment Variables

Create a `.env` file in the `mcp-server` directory:

```bash
cd mcp-server
cp .env.example .env
```

Edit the `.env` file with your Google Cloud credentials:

```env
# Gmail API Credentials
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3002/auth/callback
GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.readonly

# Server Configuration
PORT=3002
NODE_ENV=development
```

## Running the Application

### 1. Start the Backend Server

```bash
cd mcp-server
npm run dev
```

The backend server will start on `http://localhost:3002`

### 2. Start the Frontend Application

In a new terminal:

```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

### 3. Access the Application

1. Open your browser to `http://localhost:3000`
2. Click **"Sync Gmail"** to start the OAuth flow
3. Complete Gmail authentication in the popup window
4. The app will automatically fetch and display your transactions

## Usage

### Initial Setup

1. **First-time OAuth**: Click "Sync Gmail" and complete the Google OAuth flow
2. **Automatic Sync**: The app fetches transactions from the last 6 months
3. **Monthly Filtering**: Use the month selector to view specific months

### Dashboard Features

- **Net Total**: Shows the difference between credits and debits (green if positive, red if negative)
- **Total Credit**: Sum of all money received
- **Total Debit**: Sum of all money spent
- **Categories**: Number of unique expense categories
- **Transaction Table**: Detailed view with date, type, amount, bank, and description

### Supported Banks

- ICICI Bank
- HDFC Bank
- Axis Bank
- State Bank of India (SBI)
- Kotak Mahindra Bank
- And other major Indian banks

### Export Data

Click **"Export CSV"** to download transaction data in CSV format for external analysis.

## API Endpoints

### Backend API (Port 3002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| POST | `/auth/url` | Get OAuth authentication URL |
| POST | `/auth/callback` | Complete OAuth authentication |
| GET | `/auth/status` | Check authentication status |
| POST | `/expenses` | Fetch expenses with filters |

### Example API Usage

```bash
# Check server health
curl http://localhost:3002/health

# Fetch expenses for May 2025
curl -X POST http://localhost:3002/expenses \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 50, "dateFrom": "2025-05-01", "dateTo": "2025-05-31"}'
```

## Configuration

### Email Search Optimization

The system uses Gmail search queries to find transaction emails:

```
subject:(transaction alert) -subject:("promotional keywords")
```

### Date Range

- **Available Data**: January 2024 to present
- **Default**: Current month on first load
- **Quick Access**: Built-in buttons for common periods (This Month, Last Month, Dec 2024, Jun 2024, Jan 2024)
- **Full Control**: Month picker supports any month from 2024-01 to 2025-12

## Troubleshooting

### Common Issues

1. **OAuth Access Blocked**
   - Ensure your email is added as a test user in Google Cloud Console
   - Check that OAuth consent screen is properly configured

2. **Port Already in Use**
   ```bash
   # Kill process on port 3002
   lsof -ti:3002 | xargs kill -9
   
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

3. **No Transactions Found**
   - Verify Gmail contains transaction alert emails
   - Check that banks are supported in expense parser
   - Ensure date range includes transaction dates

4. **Authentication Errors**
   - Verify `.env` file has correct credentials
   - Check Gmail API is enabled in Google Cloud Console
   - Ensure redirect URI matches exactly

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=gmail:*
```

## Project Structure

```
Monthly_expenses/
├── README.md
├── package.json
├── src/                          # Frontend React app
│   ├── components/               # React components
│   │   ├── ExpenseMapper.tsx    # Main app component
│   │   ├── ExpenseHeader.tsx    # Header with sync button
│   │   ├── ExpenseFilters.tsx   # Month/category filters
│   │   ├── ExpenseSummary.tsx   # Financial summary cards
│   │   └── ExpenseTable.tsx     # Transaction table
│   ├── hooks/
│   │   └── useExpenseData.ts    # Data management hook
│   ├── services/
│   │   └── mcpGmailService.ts   # API service
│   ├── types/
│   │   └── expense.ts           # TypeScript interfaces
│   └── utils/
│       └── expenseUtils.ts      # Utility functions
├── mcp-server/                  # Backend Node.js server
│   ├── src/
│   │   ├── httpServer.ts        # Express server
│   │   ├── index.ts             # MCP server (alternative)
│   │   └── services/
│   │       ├── gmailProcessor.ts # Gmail API integration
│   │       └── expenseParser.ts  # Email parsing logic
│   ├── package.json
│   └── .env                     # Environment variables
├── tsconfig.json
└── vite.config.ts
```

## Security Features

- **Server-side Credentials**: OAuth tokens never exposed to client
- **CORS Protection**: Restricted to localhost during development
- **Secure Token Storage**: Refresh tokens stored securely on server
- **Read-only Gmail Access**: Minimal required permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Gmail API documentation
3. Create an issue in the repository

---

**Note**: This application is designed for personal use with Indian banking systems. For production deployment, additional security measures and error handling should be implemented. 