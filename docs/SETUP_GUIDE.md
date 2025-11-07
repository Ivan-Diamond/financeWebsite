# 🚀 FinanceDash Setup Guide

Follow these steps to get your finance dashboard up and running.

## ⚡ Quick Setup (5 minutes)

### Step 1: Configure Environment Variables

1. The `.env` file has been created from the template
2. **Edit `.env`** and configure these essential variables:

```bash
# Required: Generate a secret key
NEXTAUTH_SECRET="P45Gd8UO1pt+ApvLuAbLDxfXjmdbl4hlJTuF7z2bhNY="  # ✅ Already generated!

# Required: Set your database URL
DATABASE_URL="postgresql://username:password@localhost:5432/finance_dashboard?schema=public"

# Required: Polygon.io API key (get from polygon.io)
POLYGON_API_KEY="your-api-key-here"

# Optional: Keep these as-is for now
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

### Step 2: Database Setup Options

**Option A: Use Existing PostgreSQL** (Recommended if you have PostgreSQL)
```bash
# The .env already has a template URL - just update the username/password
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/finance_dashboard"
```

**Option B: Install PostgreSQL Locally**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb finance_dashboard

# Update .env with:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_dashboard?schema=public"
```

**Option C: Use Docker** (Easiest!)
```bash
# Run PostgreSQL in Docker
docker run --name finance-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=finance_dashboard \
  -p 5432:5432 \
  -d postgres:15

# Update .env with:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_dashboard?schema=public"
```

### Step 3: Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# ✅ You should see: "Your database is now in sync with your schema."
```

### Step 4: Start Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 🎯 First-Time Usage

### 1. Create Account
- Navigate to http://localhost:3000/register
- Choose a username (3-20 characters)
- Create a password (8+ characters, include letters & numbers)
- Click "Create Account"

### 2. Login
- You'll be redirected to /login
- Enter your credentials
- Access your dashboard!

---

## 🔑 Getting API Keys

### Polygon.io (Required for Market Data)

1. Visit [polygon.io](https://polygon.io/dashboard/signup)
2. Create free account
3. Verify email
4. Get your API key from dashboard
5. Add to `.env`:
   ```
   POLYGON_API_KEY="your_actual_key_here"
   ```

**Note:** Free tier has limits (5 calls/min). For production, consider:
- **Starter Plan:** $99/mo - Real-time WebSocket data
- **Developer Plan:** $249/mo - Unlimited access

---

## ✅ Verification Checklist

Before proceeding, verify:

- [ ] `.env` file configured with DATABASE_URL
- [ ] `.env` has NEXTAUTH_SECRET set
- [ ] PostgreSQL is running (check: `sudo systemctl status postgresql`)
- [ ] Prisma client generated successfully
- [ ] Database migrated (tables created)
- [ ] Development server starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can create account at /register
- [ ] Can login at /login

---

## 🐛 Common Issues

### ❌ "DATABASE_URL not found"
**Solution:** Make sure you copied `.env.example` to `.env` and filled in the DATABASE_URL

### ❌ "Can't connect to database"
**Solution:** 
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start it if stopped
sudo systemctl start postgresql
```

### ❌ "Port 3000 already in use"
**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### ❌ "Prisma Client not generated"
**Solution:**
```bash
npx prisma generate
```

### ❌ NextAuth errors
**Solution:** Make sure NEXTAUTH_SECRET is set in `.env`

---

## 📊 Optional: View Database

Want to see your data?

```bash
# Open Prisma Studio (database GUI)
npx prisma studio
```

This opens http://localhost:5555 where you can view/edit database records.

---

## 🚀 Next Steps

Once your app is running:

1. ✅ Create your first account
2. ✅ Explore the dashboard
3. 🔜 Add WebSocket real-time data (coming next)
4. 🔜 Customize your dashboard with widgets
5. 🔜 Connect Polygon.io for live market data

---

## 💡 Pro Tips

1. **Use strong passwords** - Even in development
2. **Don't commit `.env`** - It contains secrets
3. **Bookmark Prisma Studio** - Great for debugging
4. **Check server logs** - Run `npm run dev` in a terminal you can monitor

---

Need help? Check the main [README.md](./README.md) or open an issue!
