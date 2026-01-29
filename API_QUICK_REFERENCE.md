# KGL API Quick Reference

## Base URL

`http://localhost:5000/api`

---

## 👥 USERS API

### Login

```
POST /users/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}

Response: { _id, username, role, branch, email }
```

### List Users

```
GET /users

Response: [{ _id, username, role, branch, email, isActive }]
```

### Create User

```
POST /users
{
  "username": "newuser",
  "password": "password",
  "role": "attendant",
  "branch": "Maganjo",
  "email": "user@example.com"
}
```

### Update User

```
PUT /users/{id}
{ "role": "manager" }
```

### Seed Default Users

```
POST /users/seed
```

---

## 💰 TRANSACTIONS API

### List All Transactions

```
GET /transactions

Response: [{ transactionId, date, type, amount, account, description, user }]
```

### Get by Type

```
GET /transactions/type/sale
GET /transactions/type/expense
GET /transactions/type/procurement
GET /transactions/type/invoice-payment
```

### Get Summary

```
GET /transactions/summary/totals

Response: { income, expenses }
```

### Create Transaction

```
POST /transactions
{
  "date": "2025-12-12",
  "type": "sale",
  "amount": 1500,
  "account": "cash",
  "description": "Sale to client ABC"
}
```

### Update Transaction

```
PUT /transactions/{id}
{ "amount": 2000 }
```

### Delete Transaction

```
DELETE /transactions/{id}
```

---

## 📄 INVOICES API

### List Invoices

```
GET /invoices

Response: [{ invoiceNumber, clientName, total, status, dueDate, paidDate }]
```

### Get Single Invoice

```
GET /invoices/{id}
```

### Create Invoice

```
POST /invoices
{
  "invoiceNumber": "INV-001",
  "clientName": "ABC Company",
  "clientEmail": "contact@abc.com",
  "invoiceDate": "2025-12-12",
  "dueDate": "2025-12-19",
  "items": [
    {
      "description": "Product A",
      "quantity": 2,
      "unitPrice": 500
    }
  ],
  "status": "draft"
}
```

### Mark as Paid

```
POST /invoices/{id}/mark-paid
{
  "paidAmount": 1000
}
```

### Update Invoice

```
PUT /invoices/{id}
{ "status": "sent" }
```

### Delete Invoice

```
DELETE /invoices/{id}
```

---

## ✅ TASKS API

### List Tasks

```
GET /tasks

Response: [{ taskId, title, priority, status, dueDate, assignedTo }]
```

### Get by Status

```
GET /tasks/status/pending
GET /tasks/status/in-progress
GET /tasks/status/completed
GET /tasks/status/on-hold
```

### Create Task

```
POST /tasks
{
  "title": "Restock vegetables",
  "description": "Order 50kg of mixed vegetables",
  "priority": "high",
  "status": "pending",
  "dueDate": "2025-12-15",
  "assignedTo": "manager",
  "category": "inventory"
}
```

### Mark Complete

```
POST /tasks/{id}/complete
```

### Update Task

```
PUT /tasks/{id}
{ "status": "in-progress" }
```

### Delete Task

```
DELETE /tasks/{id}
```

---

## 📊 ACTIVITIES API (Audit Trail)

### List Recent Activities

```
GET /activities

Response: [{ activityId, action, data, user, module, createdAt }]
```

### Get by User

```
GET /activities/user/admin
```

### Get by Module

```
GET /activities/module/app
GET /activities/module/stock
```

### Log Activity

```
POST /activities
{
  "action": "create-sale",
  "data": { "saleId": "123", "amount": 1000 },
  "user": "admin",
  "module": "sales"
}
```

### Delete Activity

```
DELETE /activities/{id}
```

### Clear All Logs

```
DELETE /activities
```

---

## 🛒 SALES API

### List Sales

```
GET /sales

Response: [{ saleId, clientName, productName, quantity, total, status, paymentMethod }]
```

### Get Totals

```
GET /sales/summary/totals

Response: { totalSales, todaySales }
```

### Create Sale

```
POST /sales
{
  "clientName": "John Doe",
  "productId": "PRD-001",
  "productName": "Tomatoes",
  "quantity": 10,
  "unit": "kg",
  "unitPrice": 50,
  "total": 500,
  "paymentMethod": "cash",
  "status": "completed"
}
```

### Update Sale

```
PUT /sales/{id}
{ "status": "returned" }
```

### Delete Sale

```
DELETE /sales/{id}
```

---

## 📦 STOCK API

### List Items

```
GET /stock

Response: [{ itemId, itemName, category, quantity, sellingPrice, warehouse }]
```

### Get Single Item

```
GET /stock/{id}
```

### Create Item

```
POST /stock
{
  "itemName": "Tomatoes",
  "category": "Vegetables",
  "quantity": 100,
  "unit": "kg",
  "purchasePrice": 40,
  "sellingPrice": 50,
  "supplier": "Fresh Farm"
}
```

### Stock In (Receive)

```
POST /stock/{id}/stock-in
{
  "quantityChange": 50,
  "reason": "New purchase",
  "reference": "PO-001"
}
```

### Stock Out (Remove)

```
POST /stock/{id}/stock-out
{
  "quantityChange": 10,
  "reason": "Sale",
  "reference": "SALE-001"
}
```

### Low Stock Alerts

```
GET /stock/alerts/low-stock
```

### Stock Transactions

```
GET /stock/transactions/all
GET /stock/transactions/{itemId}
```

---

## Error Responses

### Common Errors

**400 Bad Request**

```json
{ "error": "Validation failed" }
```

**401 Unauthorized**

```json
{ "error": "Invalid credentials" }
```

**404 Not Found**

```json
{ "error": "Resource not found" }
```

**500 Server Error**

```json
{ "error": "Internal server error" }
```

---

## Testing with cURL

```powershell
# Login
curl -X POST http://localhost:5000/api/users/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"admin"}'

# Get transactions
curl http://localhost:5000/api/transactions/

# Create transaction
curl -X POST http://localhost:5000/api/transactions/ `
  -H "Content-Type: application/json" `
  -d '{"date":"2025-12-12","type":"sale","amount":1500,"account":"cash","description":"Sale"}'

# Get low stock items
curl http://localhost:5000/api/stock/alerts/low-stock
```

---

## JavaScript Fetch Examples

```javascript
// Login
const user = await fetch("http://localhost:5000/api/users/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
}).then((r) => r.json());

// Get all transactions
const transactions = await fetch("http://localhost:5000/api/transactions/").then((r) => r.json());

// Create sale
const sale = await fetch("http://localhost:5000/api/sales/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    clientName: "ABC Company",
    productName: "Product",
    quantity: 10,
    total: 500,
    paymentMethod: "cash",
  }),
}).then((r) => r.json());

// Mark invoice as paid
const paid = await fetch("http://localhost:5000/api/invoices/123/mark-paid", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ paidAmount: 1000 }),
}).then((r) => r.json());
```

---

## Status Enums

### Invoice Status

- `draft` - Not yet sent
- `sent` - Sent to client
- `paid` - Payment received
- `overdue` - Past due date
- `cancelled` - Cancelled

### Task Status

- `pending` - Not started
- `in-progress` - Currently working
- `completed` - Done
- `on-hold` - Paused
- `cancelled` - Cancelled

### Task Priority

- `low` - Low priority
- `medium` - Medium priority
- `high` - High priority
- `urgent` - Very urgent

### Sale Status

- `completed` - Sale finished
- `pending` - Awaiting completion
- `returned` - Returned by customer
- `cancelled` - Cancelled

### Transaction Type

- `sale` - Sales revenue
- `expense` - Business expense
- `procurement` - Inventory purchase
- `invoice-payment` - Invoice payment

### Stock Category

- `Vegetables`
- `Fruits`
- `Grains`
- `Dairy`
- `Meat`
- `Drinks`
- `Other`

### User Role

- `admin` - Full system access
- `manager` - Branch manager access
- `attendant` - Sales/stock attendant
- `cashier` - Cash register operator

---

## Port Information

- **Frontend:** `http://localhost:8000`
- **Backend:** `http://localhost:5000`
- **MongoDB:** `localhost:27017`

---

**Last Updated:** 2025-12-12
**API Version:** 1.0
