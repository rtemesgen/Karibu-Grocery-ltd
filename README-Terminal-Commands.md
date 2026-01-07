# Terminal Commands Used

## Check Node Version

```bash
node -v
```

## Check NPM Version

```bash
npm -v
```

## Initialize NPM Project

```bash
npm init -y
```

## Install ESLint as Dev Dependency

```bash
npm install eslint --save-dev
```

## ESLint Setup

```bash
npx eslint --init
```

### Configuration Choices:

- **What to lint:** JavaScript
- **Use ESLint to:** Find problems
- **Module type:** ESM (ES Modules)
- **Framework:** None
- **TypeScript:** No
- **Where code runs:** Browser
- **Package manager:** npm

### Result:

- Successfully created `eslint.config.mjs`
- Installed dependencies: eslint, @eslint/js, globals
- 87 packages audited with 0 vulnerabilities

## Install Prettier as Dev Dependency

```bash
npm install --save-dev prettier
```

## Check Package Funding Information

```bash
npm fund
```

## Run ESLint on Project

```bash
npx eslint .
```

## Format Code with Prettier

```bash
npx prettier --write "*.js" "*.html" "*.css"
```

## Husky + ESLint (pre-commit)

Simple steps to enforce linting before every commit:

```powershell
# 1) Install Husky and add the prepare script
npm install --save-dev husky
npm pkg set scripts.prepare="husky"

# 2) Initialize Husky (creates .husky/)
npm run prepare

# 3) Create a pre-commit hook to run ESLint
npx husky set .husky/pre-commit "npm run lint"

# 4) (Optional) Auto-fixable issues before committing
npm run lint:fix
```

Already added package.json scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "prepare": "husky"
  }
}
```

### Commands executed now

```powershell
npm install
npm run prepare
# (pre-commit hook already created at .husky/pre-commit to run: npm run lint)
npm run lint
```

Note: if ESLint reports errors, the commit will be blocked until they are fixed (try `npm run lint:fix`).

## Airbnb Style Guide (packages installed)

```bash
npm install --save-dev eslint-config-airbnb-base eslint-plugin-import @eslint/eslintrc
```

- Using ESLint v9 flat config (`eslint.config.mjs`) with `@eslint/js` rules.
- Airbnb base is available via FlatCompat; rules may be stricter than default.
- Use `npm run lint:fix` to auto-fix common issues; review remaining warnings/errors.

### Quick npm run commands

```bash
npm run lint        # Check for lint errors
npm run lint:fix    # Auto-fix + recheck
npm run prepare     # Initialize Husky hooks
```

## Tooling & Fixes

- Added project lint/format config: .eslintrc.json, .prettierrc, and VS Code format-on-save settings.
- Resolved unused handlers and added error logging to avoid silent failures in [accounts.js](accounts.js), [app.js](app.js), [users.js](users.js), and [profile.js](profile.js).
- Exposed shared helpers (date/validation/storage) on `window` for reuse in [app.js](app.js).
- Ran ESLint across the project and formatted all JS/HTML/CSS with Prettier.
