# Stock Management Module - MongoDB Setup Guide

## 📋 What's Been Created

### Backend (Node.js + Express + MongoDB)

- **Location**: `backend/` folder
- **Files**:
  - `server.js` - Express server with MongoDB connection
  - `package.json` - Dependencies configuration
  - `.env` - Environment variables
  - `models/Stock.js` - Mongoose schema for inventory items
  - `models/StockTransaction.js` - Mongoose schema for stock history
  - `routes/stock.js` - REST API endpoints

### Frontend (HTML + JavaScript)

- **stock.html** - Complete stock management UI with modals
- **stock.js** - Client-side manager that calls the API

## 🚀 Quick Start (Windows)

### Step 1: Install MongoDB

Make sure MongoDB is running on your PC:

```bash
# If MongoDB is installed, start it
mongod
```

### Step 2: Navigate to Backend Directory

```bash
cd c:\Users\HAVEN\Desktop\Intro-To-Software\kgl project\KGL_PROJECT\backend
```

### Step 3: Install Node Dependencies

```bash
npm install
```

### Step 4: Start the Backend Server

```bash
npm start
# Or use npm run dev for development mode with auto-reload (requires nodemon)
```

You should see:

```
✓ Connected to MongoDB: mongodb://localhost:27017/karibu-groceries
🚀 Karibu Groceries Backend Server running on http://localhost:5000
```

### Step 5: Open the Frontend

Open `stock.html` in your browser (or better: use a local server)

```bash
# From the root project folder
npx http-server
# Then visit http://localhost:8080/stock.html
```

## 📊 API Endpoints

### Stock Items

**GET /api/stock**

- List all stock items
- Returns: Array of stock items

**POST /api/stock**

- Create new stock item
- Body: `{ itemName, category, quantity, minQuantity, unit, purchasePrice, sellingPrice, supplier, warehouse, description }`

**GET /api/stock/:id**

- Get single stock item by ID

**PUT /api/stock/:id**

- Update stock item

**DELETE /api/stock/:id**

- Soft delete (marks as inactive)

### Stock Operations

**POST /api/stock/:id/stock-in**

- Receive stock into warehouse
- Body: `{ quantity, supplier, notes, user }`

**POST /api/stock/:id/stock-out**

- Remove stock from warehouse
- Body: `{ quantity, reason, reference, notes, user }`

### Alerts & Transactions

**GET /api/stock/alerts/low-stock**

- Get all low stock items (quantity <= minQuantity)

**GET /api/stock/transactions/all**

- Get all stock transactions (history)

**GET /api/stock/transactions/:itemId**

- Get transaction history for specific item

## 🗄️ MongoDB Collections

### Stock Collection

```javascript
{
  itemId: string (unique),
  itemName: string,
  category: enum ["Vegetables", "Fruits", "Grains", "Dairy", "Meat", "Drinks", "Other"],
  quantity: number,
  minQuantity: number,
  unit: enum ["kg", "liters", "pieces", "boxes", "bags", "crates"],
  purchasePrice: number,
  sellingPrice: number,
  supplier: string,
  warehouse: string,
  description: string,
  isActive: boolean,
  lastRestockDate: date,
  createdAt: date,
  updatedAt: date
}
```

### StockTransaction Collection

```javascript
{
  transactionId: string (unique),
  itemId: string,
  itemName: string,
  type: enum ["stock-in", "stock-out", "adjustment", "sale"],
  quantityChange: number,
  quantityBefore: number,
  quantityAfter: number,
  reason: string,
  reference: string,
  user: string,
  notes: string,
  createdAt: date,
  updatedAt: date
}
```

## 🎯 Features

### Frontend UI

- ✅ Add new stock items
- ✅ View all items in table
- ✅ Search & filter items
- ✅ Stock In (receive from supplier)
- ✅ Stock Out (remove from warehouse)
- ✅ Low stock alerts
- ✅ Profit margin calculation
- ✅ Export to CSV
- ✅ Statistics dashboard

### Backend Logic

- ✅ CRUD operations for stock items
- ✅ Stock transaction logging
- ✅ Low stock detection
- ✅ Quantity tracking
- ✅ User audit trail

## 🐛 Troubleshooting

### "Failed to load stock items - ensure backend is running"

- Check if backend server is running (`npm start`)
- Verify MongoDB is running (`mongod`)
- Check if port 5000 is available

### "MongoDB connection error"

- Ensure MongoDB is installed and started
- Check connection string in `.env`: `mongodb://localhost:27017/karibu-groceries`
- Verify MongoDB is listening on port 27017

### CORS errors

- Backend has CORS enabled, but check `server.js` if issues persist
- Ensure you're accessing from `http://localhost:8000` or similar

## 📝 Next Steps

1. **Integrate with Dashboard**: Add Stock module to main index.html
2. **Sync with Accounts**: Stock transactions should reflect in accounts/ledger
3. **Add to Navigation**: Link stock module from sidebar
4. **Unit Tests**: Write Jest tests for API endpoints
5. **Mobile Optimization**: Ensure responsive design on mobile

## 📞 Support

For issues:

1. Check browser console for errors (F12)
2. Check server logs for backend errors
3. Verify MongoDB connection
4. Ensure all dependencies installed (`npm list`)
   npm start
