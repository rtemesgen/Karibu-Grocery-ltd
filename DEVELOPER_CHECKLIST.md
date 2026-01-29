# KGL Project - Developer Checklist

## ✅ Completed Items (Don't Touch!)

- [x] MongoDB database setup (karibu-groceries)
- [x] Express.js backend server created
- [x] Mongoose models for 8 entities
- [x] 7 API route modules created (50+ endpoints)
- [x] Server configuration and middleware
- [x] Environment variables setup (.env)
- [x] Stock module fully integrated (model + routes + frontend)
- [x] Login system API integration
- [x] User seeding endpoint
- [x] Documentation (4 comprehensive guides)
- [x] Windows startup script (start-kgl.bat)

**Total Backend Setup Time:** ~8 hours
**Current Status:** Production-ready infrastructure

---

## 🔄 Currently In Progress

### `app.js` - Main Application File

**Status:** 50% complete - Login & Dashboard basics updated
**What's Done:**

- ✅ Login method uses `/api/users/login`
- ✅ User seeding uses API endpoint
- ✅ Sales total calculation uses API
- ✅ API URL configured
- ✅ Basic API helper functions created

**What's Needed:**

- [ ] Complete all profile/user management functions
- [ ] Ensure all data loads from API instead of localStorage
- [ ] Add error handling for all API calls
- [ ] Update dashboard to show real API data

---

## 📋 Next Priority Tasks

### 1. **Refactor `accounts.js`** (HIGH PRIORITY)

**Location:** `c:\Users\HAVEN\Desktop\Intro-To-Software\kgl project\KGL_PROJECT\accounts.js`

**Current Issue:** Uses localStorage for transactions
**Required Changes:**

```javascript
// CHANGE FROM:
const transactions = JSON.parse(localStorage.getItem("transactions") || "[]");

// CHANGE TO:
const response = await fetch("http://localhost:5000/api/transactions/");
const transactions = await response.json();

// For creating transactions:
// CHANGE FROM:
localStorage.setItem("transactions", JSON.stringify(txs));

// CHANGE TO:
const response = await fetch("http://localhost:5000/api/transactions/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(transactionData),
});
```

**Checklist:**

- [ ] Replace `getStoredTransactions()` with API calls
- [ ] Replace `saveStoredTransactions()` with `POST /api/transactions`
- [ ] Replace user loading with `GET /api/users`
- [ ] Replace activity logging with `POST /api/activities`
- [ ] Test that all CRUD operations work with API
- [ ] Verify localStorage completely removed (grep for 'localStorage')

**Time Estimate:** 2-3 hours

---

### 2. **Refactor `sales.js`** (HIGH PRIORITY)

**Location:** `c:\Users\HAVEN\Desktop\Intro-To-Software\kgl project\KGL_PROJECT\sales.js`

**Current Issue:** Skeleton implementation, no persistent data
**Required Changes:**

- [ ] Load sales from `GET /api/sales`
- [ ] Create sales with `POST /api/sales`
- [ ] Update sales with `PUT /api/sales/:id`
- [ ] Delete sales with `DELETE /api/sales/:id`
- [ ] Get sales summary from `GET /api/sales/summary/totals`
- [ ] Add activity logging for each action
- [ ] Handle payment methods: cash, card, cheque, mobile, credit
- [ ] Track sale status: completed, pending, returned, cancelled

**Template Code:**

```javascript
class SalesManager {
  constructor() {
    this.apiUrl = "http://localhost:5000/api";
    this.sales = [];
    this.loadSales();
  }

  async loadSales() {
    try {
      const response = await fetch(`${this.apiUrl}/sales/`);
      this.sales = await response.json();
      this.renderSales();
    } catch (error) {
      console.error("Failed to load sales:", error);
    }
  }

  async createSale(saleData) {
    try {
      const response = await fetch(`${this.apiUrl}/sales/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });
      const sale = await response.json();
      this.sales.unshift(sale);
      this.renderSales();
      return sale;
    } catch (error) {
      console.error("Failed to create sale:", error);
    }
  }
}
```

**Time Estimate:** 1-2 hours

---

### 3. **Refactor `invoices.js`** (MEDIUM PRIORITY)

**Location:** `c:\Users\HAVEN\Desktop\Intro-To-Software\kgl project\KGL_PROJECT\invoices.js`

**Required Changes:**

- [ ] Load invoices from `GET /api/invoices`
- [ ] Create invoices with `POST /api/invoices`
- [ ] Update invoices with `PUT /api/invoices/:id`
- [ ] Mark as paid with `POST /api/invoices/:id/mark-paid`
- [ ] Delete invoices with `DELETE /api/invoices/:id`
- [ ] Support line items (description, quantity, unitPrice)
- [ ] Track invoice status: draft, sent, paid, overdue, cancelled
- [ ] Calculate totals with tax

**Time Estimate:** 1-2 hours

---

### 4. **Refactor `tasks.js`** (MEDIUM PRIORITY)

**Location:** `c:\Users\HEAVEN\Desktop\Intro-To-Software\kgl project\KGL_PROJECT\tasks.js`

**Required Changes:**

- [ ] Load tasks from `GET /api/tasks`
- [ ] Create tasks with `POST /api/tasks`
- [ ] Update tasks with `PUT /api/tasks/:id`
- [ ] Mark complete with `POST /api/tasks/:id/complete`
- [ ] Delete tasks with `DELETE /api/tasks/:id`
- [ ] Filter by status: pending, in-progress, completed, on-hold, cancelled
- [ ] Filter by priority: low, medium, high, urgent
- [ ] Sort by due date

**Time Estimate:** 1-2 hours

---

## 🔐 Security Tasks (AFTER core modules)

### 5. **Add Authentication Middleware**

**File to Create:** `backend/middleware/auth.js`

```javascript
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware;
```

**Tasks:**

- [ ] Create auth middleware
- [ ] Update login endpoint to return JWT token
- [ ] Add middleware to protected routes
- [ ] Update frontend to use token in API calls
- [ ] Add `JWT_SECRET` to `.env`
- [ ] Install jwt package: `npm install jsonwebtoken`

**Time Estimate:** 2-3 hours

---

### 6. **Add Password Hashing**

**Changes in:** `backend/models/User.js` and `/routes/users.js`

```javascript
const bcrypt = require("bcrypt");

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};
```

**Tasks:**

- [ ] Install bcrypt: `npm install bcrypt`
- [ ] Add password hashing to User model
- [ ] Update login to compare hashed passwords
- [ ] Update seeding to work with hashed passwords
- [ ] Test login with hashed passwords

**Time Estimate:** 1-2 hours

---

## 🧪 Testing Checklist

### Before Deployment

- [ ] Test login with each user role
- [ ] Test creating/reading/updating/deleting for each module
- [ ] Test all filters and search functions
- [ ] Test error cases (invalid input, network failures)
- [ ] Test activity logging for audit trail
- [ ] Verify no localStorage calls remain in frontend
- [ ] Check browser console for errors (F12)
- [ ] Verify MongoDB data persists after refresh
- [ ] Test with multiple browser tabs

### Database Testing

- [ ] Verify collections exist: `use karibu-groceries → show collections`
- [ ] Check data types and validation
- [ ] Test MongoDB backup/restore

---

## 📚 Key Files Reference

### Backend

| File                  | Purpose                 | Status  |
| --------------------- | ----------------------- | ------- |
| `backend/server.js`   | Main server             | ✅ Done |
| `backend/.env`        | Configuration           | ✅ Done |
| `backend/models/*.js` | Data schemas (8 files)  | ✅ Done |
| `backend/routes/*.js` | API endpoints (7 files) | ✅ Done |

### Frontend

| File          | Purpose                     | Status  |
| ------------- | --------------------------- | ------- |
| `app.js`      | Main app (login, dashboard) | 🔄 50%  |
| `stock.js`    | Stock management            | ✅ 100% |
| `accounts.js` | Accounting ledger           | ⏳ 0%   |
| `sales.js`    | Sales tracking              | ⏳ 0%   |
| `invoices.js` | Invoice management          | ⏳ 0%   |
| `tasks.js`    | Task scheduling             | ⏳ 0%   |
| `reports.js`  | Analytics                   | ⏳ 0%   |
| `users.js`    | User management             | ⏳ 0%   |

### Documentation

| File                     | Purpose                            |
| ------------------------ | ---------------------------------- |
| `MONGODB_SETUP_GUIDE.md` | Setup instructions & API reference |
| `MONGODB_STATUS.md`      | Current status & priorities        |
| `API_QUICK_REFERENCE.md` | API endpoints cheatsheet           |
| `SYSTEM_OVERVIEW.md`     | Architecture & data flow diagrams  |
| `start-kgl.bat`          | Windows startup script             |

---

## 🐛 Debugging Guide

### Issue: MongoDB Connection Error

```
✗ MongoDB connection error: connect ECONNREFUSED
```

**Solution:** Start MongoDB first

```powershell
mongod
```

### Issue: API Endpoint Returns 404

```
Cannot GET /api/users
```

**Solution:** Check route is registered in `server.js`

### Issue: Frontend Shows Blank Page

**Solution:**

1. Open browser console (F12)
2. Check for JavaScript errors
3. Check Network tab for failed requests
4. Ensure backend is running on port 5000

### Issue: Data Not Persisting

**Solution:**

1. Verify MongoDB is running: `netstat -an | findstr 27017`
2. Check database: `mongo → use karibu-groceries → db.sales.find()`
3. Check API response includes `_id` field

---

## 🚀 Quick Start Command

```powershell
# Run this single command to start everything:
.\start-kgl.bat

# Or manually:
# Terminal 1:
mongod

# Terminal 2:
cd backend && npm run dev

# Terminal 3:
python -m http.server 8000
```

---

## 💡 Pro Tips

1. **Use Postman** to test API endpoints before updating frontend
2. **Check MongoDB Compass** to visually inspect database
3. **Keep browser DevTools open** (F12) for debugging
4. **Use `console.log()`** liberally to trace data flow
5. **Test one module at a time** - don't refactor everything at once
6. **Commit to git frequently** - don't lose work!
7. **Read the API endpoint in `API_QUICK_REFERENCE.md`** before coding

---

## 📞 Need Help?

1. **API not responding?** → Check backend terminal, look for errors
2. **Data not saving?** → Check MongoDB is running, look for validation errors
3. **Frontend broken?** → Check browser console (F12), look for JavaScript errors
4. **Don't know what to do?** → Read the corresponding `.md` file

---

## ✨ Success Checklist

You'll know you're done when:

- [ ] `accounts.js` works with API
- [ ] `sales.js` works with API
- [ ] `invoices.js` works with API
- [ ] `tasks.js` works with API
- [ ] All modules show real data from MongoDB
- [ ] No errors in browser console
- [ ] No localStorage calls remain in code
- [ ] All CRUD operations work
- [ ] Activity logging works
- [ ] Documentation is complete

---

**Project Start Date:** 2025-12-12  
**Backend Complete:** 2025-12-12  
**Last Updated:** 2025-12-12  
**Estimated Completion:** 2025-12-19 (1 week)

Good luck! 🚀
