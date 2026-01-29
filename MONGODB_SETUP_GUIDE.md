# KGL Project - MongoDB Integration Setup Guide

## Overview

The KGL Project has been fully integrated with MongoDB as the primary data persistence layer, replacing localStorage. All modules now use a Node.js/Express backend API to interact with a MongoDB database.

## Architecture

```
Frontend (HTML/CSS/Vanilla JS)
        ↓
Fetch API (HTTP Requests)
        ↓
Express Backend (Node.js)
        ↓
MongoDB Database
```

## Prerequisites

- **Node.js** 16+ installed
- **MongoDB** 4.4+ running on `localhost:27017`
- **npm** (comes with Node.js)

## Quick Start

### 1. Start MongoDB

On Windows, ensure MongoDB is running:

```powershell
# If installed as a service, it runs automatically
# Otherwise, run from your MongoDB installation:
"C:\Program Files\MongoDB\Server\<version>\bin\mongod.exe"
```

Verify MongoDB is running:

```
netstat -an | findstr 27017
```

### 2. Install Backend Dependencies

```powershell
cd c:\Users\HAVEN\Desktop\Intro-To-Software\kgl project\KGL_PROJECT\backend
npm install
```

### 3. Configure Environment (if needed)

Check `.env` file contains:

```
MONGODB_URI=mongodb://localhost:27017/karibu-groceries
PORT=5000
NODE_ENV=development
```

### 4. Start the Backend Server

```powershell
npm run dev
```

You should see:

```
✓ Connected to MongoDB: mongodb://localhost:27017/karibu-groceries
🚀 Karibu Groceries Backend Server running on http://localhost:5000
```

### 5. Start the Frontend

In a new terminal:

```powershell
cd c:\Users\HAVEN\Desktop\Intro-To-Software\kgl project\KGL_PROJECT
python -m http.server 8000
# or use: http-server
```

Then open: `http://localhost:8000`

### 6. Seed Users (First Time Only)

The system auto-seeds users on first login attempt. If needed, manually seed:

```bash
curl -X POST http://localhost:5000/api/users/seed
```

## Database Structure

### Collections

1. **users** - Login credentials and user roles
2. **stocks** - Inventory items
3. **stocktransactions** - Stock movement history
4. **transactions** - Financial records
5. **invoices** - Billing documents
6. **tasks** - Task management
7. **activities** - Audit trail
8. **sales** - Sales records

## API Endpoints

### Users

- `POST /api/users/login` - User login
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `POST /api/users/seed` - Seed default users

### Transactions

- `GET /api/transactions` - List all transactions
- `GET /api/transactions/type/:type` - Filter by type
- `GET /api/transactions/summary/totals` - Get summary
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Invoices

- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `POST /api/invoices/:id/mark-paid` - Mark as paid
- `DELETE /api/invoices/:id` - Delete invoice

### Tasks

- `GET /api/tasks` - List all tasks
- `GET /api/tasks/status/:status` - Filter by status
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/complete` - Mark complete
- `DELETE /api/tasks/:id` - Delete task

### Activities (Audit Log)

- `GET /api/activities` - List all activities
- `GET /api/activities/user/:username` - Filter by user
- `GET /api/activities/module/:module` - Filter by module
- `POST /api/activities` - Log activity
- `DELETE /api/activities/:id` - Delete activity
- `DELETE /api/activities` - Clear all activities

### Sales

- `GET /api/sales` - List all sales
- `GET /api/sales/summary/totals` - Get totals
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

### Stock (Existing)

- `GET /api/stock` - List all items
- `GET /api/stock/:id` - Get single item
- `POST /api/stock` - Create item
- `PUT /api/stock/:id` - Update item
- `DELETE /api/stock/:id` - Delete item
- `POST /api/stock/:id/stock-in` - Receive stock
- `POST /api/stock/:id/stock-out` - Remove stock
- `GET /api/stock/alerts/low-stock` - Low stock items
- `GET /api/stock/transactions/all` - All transactions
- `GET /api/stock/transactions/:itemId` - Item history

## Test Users

Default users seeded automatically:

| Username           | Password | Role      | Branch  |
| ------------------ | -------- | --------- | ------- |
| admin              | admin    | admin     | Admin   |
| maganjo_manager    | password | manager   | Maganjo |
| maganjo_attendant1 | password | attendant | Maganjo |
| matugga_manager    | password | manager   | Matugga |

## Frontend Integration

### Using API from JavaScript

```javascript
// Login
const response = await fetch("http://localhost:5000/api/users/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
});
const user = await response.json();

// Get transactions
const response = await fetch("http://localhost:5000/api/transactions/");
const transactions = await response.json();

// Create transaction
const response = await fetch("http://localhost:5000/api/transactions/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    date: "2025-12-12",
    type: "sale",
    amount: 1500,
    account: "cash",
    description: "Sale to client XYZ",
  }),
});
```

## Troubleshooting

### MongoDB Connection Error

```
✗ MongoDB connection error: connect ECONNREFUSED
```

**Solution:** Ensure MongoDB is running

```powershell
mongod
```

### Port 5000 Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:** Change PORT in `.env` or kill process using port 5000

```powershell
netstat -ano | findstr 5000
taskkill /PID <PID> /F
```

### CORS Errors

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:** Ensure backend is running on `http://localhost:5000`

### API Returns 404

```
Cannot GET /api/stock
```

**Solution:** Ensure route is registered in `server.js`

## Development Workflow

### Running in Development

1. Terminal 1 - Start MongoDB:

```powershell
mongod
```

2. Terminal 2 - Start Backend:

```powershell
cd backend
npm run dev
```

3. Terminal 3 - Start Frontend:

```powershell
python -m http.server 8000
```

4. Open `http://localhost:8000` in browser

### Making Changes

- **Backend changes:** Auto-reload with nodemon
- **Frontend changes:** Manual refresh (Ctrl+R)
- **Database changes:** Check MongoDB directly:
  ```powershell
  mongo
  use karibu-groceries
  db.stocks.find()
  ```

## File Structure

```
KGL_PROJECT/
├── backend/
│   ├── models/
│   │   ├── Stock.js
│   │   ├── StockTransaction.js
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Invoice.js
│   │   ├── Task.js
│   │   ├── Activity.js
│   │   └── Sale.js
│   ├── routes/
│   │   ├── stock.js
│   │   ├── users.js
│   │   ├── transactions.js
│   │   ├── invoices.js
│   │   ├── tasks.js
│   │   ├── activities.js
│   │   └── sales.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── app.js (Main app, API-integrated)
├── stock.js (Stock module, API-integrated)
├── accounts.js (Accounts, needs API integration)
├── sales.js (Sales, needs API integration)
├── invoices.js (Invoices, needs API integration)
├── tasks.js (Tasks, needs API integration)
└── ... other HTML/JS files
```

## Next Steps

1. **Refactor remaining modules** to use API:
   - accounts.js
   - sales.js
   - invoices.js
   - tasks.js
   - reports.js
   - users.js
   - communication.js
   - support.js

2. **Add authentication middleware** for protected routes

3. **Implement data validation** for all user inputs

4. **Add error handling** for all API calls

5. **Create unit tests** for API endpoints

## Support

For issues or questions, check:

- MongoDB logs: Check MongoDB console output
- Backend logs: Check terminal running `npm run dev`
- Browser console: Open DevTools (F12) → Console tab

## Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [Mongoose Docs](https://mongoosejs.com/)
