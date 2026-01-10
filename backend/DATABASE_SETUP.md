# Database Setup Instructions

## Issue Resolved ✅

The "Unable to resolve sequelize package" error has been fixed by:
1. ✅ Installing all npm dependencies
2. ✅ Fixing the `xlsx-js-style` version (updated to 1.2.0)
3. ✅ Creating the `.env` file

## Current Issue: Database Authentication

You're now getting a password authentication error. This means Sequelize CLI is working, but you need to configure your PostgreSQL credentials.

## Solution Options

### Option 1: Update .env File (Recommended)

Edit `backend/.env` and update with your actual PostgreSQL credentials:

```env
PORT=5000
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_NAME=colonel_automation
DB_HOST=localhost
DB_PORT=5432
NODE_ENV=development
```

### Option 2: Create Database Manually

If you prefer to create the database manually using PostgreSQL:

1. Open PostgreSQL command line or pgAdmin
2. Run:
   ```sql
   CREATE DATABASE colonel_automation;
   ```

3. Then run migrations:
   ```bash
   npx sequelize-cli db:migrate
   ```

### Option 3: Use Default PostgreSQL Setup

If your PostgreSQL uses default settings:
- Username: `postgres`
- Password: (empty or your actual password)
- Update `.env` accordingly

## After Setting Up Credentials

Once you've updated the `.env` file with correct credentials, run:

```bash
# Create the database
npx sequelize-cli db:create

# Run migrations
npx sequelize-cli db:migrate

# (Optional) Seed initial data
npx sequelize-cli db:seed:all
```

## Verify Database Connection

You can test the connection by running:

```bash
node -e "require('dotenv').config(); const sequelize = require('./config/sequelize'); sequelize.authenticate().then(() => console.log('✅ Connected!')).catch(err => console.error('❌ Error:', err.message));"
```

## Common PostgreSQL Issues

1. **PostgreSQL not running**: Start PostgreSQL service
2. **Wrong password**: Check your PostgreSQL password
3. **Database already exists**: Use `npx sequelize-cli db:migrate` directly
4. **Port conflict**: Ensure PostgreSQL is running on port 5432 (or update DB_PORT in .env)























