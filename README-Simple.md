# KARIBU GROCERIES .LTD - Plain HTML/CSS/JavaScript Version

This is a simplified version of the KARIBU GROCERIES .LTD application converted from React to plain HTML, CSS, and JavaScript for easier understanding.

## Files Structure

- **index.html** - Main HTML file with all the app structure
- **styles.css** - All styling and layout
- **app.js** - JavaScript functionality and interactivity

## Modules (Pages)

The app includes multiple business modules:

- **Sales** (`sales.html` / `sales.js`) - Record and track sales, inventory, and metrics
- **Stock** (`stock.html` / `stock.js`) - Manage inventory, procurement, and stock levels
- **Invoices** (`invoices.html` / `invoices.js`) - Create and manage invoices
- **Tasks** (`tasks.html` / `tasks.js`) - Plan and assign tasks with priority
- **Reports** (`reports.html` / `reports.js`) - Generate sales, stock, and other reports
- **Support** (`support.html` / `support.js`) - Manage support tickets
- **Users** (`users.html` / `users.js`) - Manage user accounts and access
- **Dashboard** (`index.html` / `app.js`) - Main hub with login, profile, and transactions

## Features

✅ **Login System** - Multi-branch user management with roles
✅ **Dashboard** - Statistics, transactions, and quick actions
✅ **Sales Module** - Record sales, update inventory, track metrics (UGX, kg units)
✅ **Stock Module** - Receive stock, manage inventory levels, enforce business rules
✅ **Invoices** - Create and manage customer invoices
✅ **Tasks** - Assign tasks with priority and status tracking
✅ **Reports** - Generate CSV reports (sales, stock, invoices)
✅ **Activity Log** - Track all transactions and changes
✅ **Responsive Design** - Works on desktop and mobile

## Developer Tooling

### Run lint checks

```bash
npm run lint        # Check for style errors
npm run lint:fix    # Auto-fix + recheck
```

The project uses ESLint (Airbnb base + flat config) and Prettier for code quality. Husky pre-commit hook runs lint checks before every commit.

## How to Run

1. **Simple Method**: Double-click `index.html` to open in your browser
2. **Better Method**: Use a local server (recommended for best experience)
   - If you have Python: `python -m http.server 8000`
   - If you have Node.js: `npx http-server`
   - Then visit `http://localhost:8000/index.html`

## How to Use

### 1. Login

- The app seeds default users with roles (see `app.js` for user seed data)
- Log in with a seeded user or branch ID
- Click "Login" to access the dashboard

### 2. Dashboard

- View statistics of your records
- Click "Add Record" to create new entries
- Click "View Records" to see all saved records

### 3. Adding Records

- Choose a category (Sales, Expenses, Customer Info, Personal Notes)
- Fill in title and description
- For Sales/Expenses, add an amount
- Select the date
- Click "Save Record"

### 4. Managing Records

- Use the search box to find specific records
- Filter by category using the dropdown
- Click the edit icon (pencil) to modify a record
- Click the delete icon (trash) to remove a record

## Code Structure Explained

### HTML (index.html)

The HTML file contains three main sections:

- **Login Page** (`#loginPage`) - Login form
- **Dashboard Page** (`#dashboardPage`) - Statistics and action buttons
- **Records Page** (`#recordsPage`) - List of all records
- **Modal** (`#recordModal`) - Pop-up form for adding/editing records

### CSS (styles.css)

The CSS is organized into sections:

- **Reset & Base** - Basic styling and resets
- **Login Styles** - Login page appearance
- **Navigation** - Top navigation bar
- **Dashboard** - Statistics cards and action buttons
- **Records** - List view and individual record items
- **Modal** - Pop-up form styling
- **Responsive** - Mobile-friendly adjustments

### JavaScript (app.js)

The JavaScript uses a class-based approach:

- **RecordKeeper class** - Main application logic
- **Event Listeners** - Handle user interactions
- **Data Management** - Store and manipulate records
- **Page Navigation** - Switch between different views
- **DOM Manipulation** - Update the page content

## Key Concepts

### 1. Page Management

```javascript
showPage(pageId) {
    // Hide all pages first
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    // Show the selected page
    document.getElementById(pageId).classList.remove('hidden');
}
```

### 2. Event Handling

```javascript
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault(); // Prevent form submission
  this.handleLogin(); // Custom login logic
});
```

### 3. Data Storage

Records are stored in a JavaScript array in memory:

```javascript
this.records = [
  {
    id: "1",
    category: "sales",
    title: "Product Sale",
    description: "Sold items...",
    amount: 1500,
    date: "2025-12-08",
  },
  // ... more records
];
```

### 4. Dynamic Content

Records are rendered dynamically:

```javascript
recordsList.innerHTML = filteredRecords.map((record) => this.renderRecordItem(record)).join("");
```

## Customization

### Adding New Categories

1. Update the `<select>` options in the HTML
2. Add new CSS classes for styling
3. Update the `toggleAmountField()` function if needed

### Changing Styles

- Modify `styles.css` to change colors, fonts, and layout
- The CSS uses CSS custom properties (variables) for easy theming

### Adding Features

- Add new functions to the `RecordKeeper` class
- Create corresponding HTML elements
- Add event listeners to connect them

## Browser Compatibility

This application works in all modern browsers:

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Learning Resources

To understand this code better, study these concepts:

- **HTML**: Document structure, forms, semantic elements
- **CSS**: Flexbox, Grid, responsive design, transitions
- **JavaScript**: Classes, event listeners, DOM manipulation, array methods

## Differences from React Version

| React Version    | Plain HTML/CSS/JS Version  |
| ---------------- | -------------------------- |
| Components       | HTML sections with classes |
| JSX              | Template strings           |
| State management | Class properties           |
| Props            | Function parameters        |
| Virtual DOM      | Direct DOM manipulation    |
| Build process    | None - runs directly       |

The functionality is identical, but the implementation is more straightforward and easier to understand for beginners!
