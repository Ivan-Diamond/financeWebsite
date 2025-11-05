# 📈 FinanceDash - Real-time Finance Dashboard

A fully customizable, real-time finance dashboard built with Next.js, featuring drag-and-drop widgets, live market data via WebSockets, and personalized layouts.

## ✨ Features

- **🔐 Username-based Authentication** - Secure login/register system
- **📊 Real-time Market Data** - Live stock prices, options, and Greeks via Polygon.io
- **🎨 Customizable Dashboard** - Drag, drop, and resize widgets to your preference
- **💾 Persistent Layouts** - Your dashboard configuration is saved per user
- **🌙 Dark Theme** - Modern, eye-friendly dark interface
- **⚡ WebSocket Updates** - Sub-second data refresh rates

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Auth:** NextAuth.js v5 (username/password)
- **Database:** PostgreSQL + Prisma ORM
- **State Management:** Zustand
- **Styling:** TailwindCSS
- **Charts:** TradingView Lightweight Charts
- **Real-time:** WebSockets (Socket.io)
- **Data Source:** Polygon.io API

## 📋 Prerequisites

- Node.js 20+ 
- PostgreSQL 14+
- Polygon.io API key ([Get one here](https://polygon.io/))

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd /root/CascadeProjects/finance-dashboard
npm install
```

### 2. Database Setup

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (if not installed)
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE finance_dashboard;
CREATE USER finance_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE finance_dashboard TO finance_user;
\q
```

**Option B: Vercel Postgres (for deployment)**
```bash
# Install Vercel CLI
npm i -g vercel

# Create Postgres database
vercel postgres create
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL="postgresql://finance_user:your_password@localhost:5432/finance_dashboard?schema=public"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-key-change-this"
NEXTAUTH_URL="http://localhost:3000"

# Polygon.io API
POLYGON_API_KEY="your-polygon-api-key"

# Redis (optional, for rate limiting)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Database Migration

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Optional: Open Prisma Studio to view database
npx prisma studio
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
finance-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   └── auth/          # Authentication endpoints
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/                # Reusable UI components
│   │   ├── dashboard/         # Dashboard widgets
│   │   └── layout/            # Layout components
│   ├── lib/                   # Utilities and configurations
│   │   ├── api/               # API clients
│   │   ├── hooks/             # Custom React hooks
│   │   ├── socket/            # WebSocket client
│   │   ├── utils/             # Helper functions
│   │   ├── auth.ts            # NextAuth configuration
│   │   └── prisma.ts          # Prisma client
│   ├── stores/                # Zustand state stores
│   │   ├── authStore.ts       # Authentication state
│   │   ├── dashboardStore.ts  # Dashboard state
│   │   ├── marketStore.ts     # Market data state
│   │   └── uiStore.ts         # UI state
│   └── types/                 # TypeScript type definitions
├── prisma/
│   └── schema.prisma          # Database schema
└── public/                    # Static assets
```

## 🔑 API Keys Setup

### Polygon.io

1. Sign up at [polygon.io](https://polygon.io/)
2. Choose a plan:
   - **Free:** 5 API calls/min (limited)
   - **Starter ($99/mo):** Real-time WebSocket, 5 req/sec
   - **Developer ($249/mo):** Unlimited WebSocket
3. Copy your API key to `.env`

### Upstash Redis (Optional)

For rate limiting:
1. Sign up at [upstash.com](https://upstash.com/)
2. Create a Redis database
3. Copy REST URL and token to `.env`

## 📦 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open database GUI
npx prisma migrate   # Create/run migrations
```

## 🧪 Creating Your First User

1. Navigate to `http://localhost:3000/register`
2. Create account with:
   - **Username:** `trader1` (3-20 chars, alphanumeric + _ -)
   - **Password:** `Password123` (8+ chars, letters + numbers)
3. Login at `http://localhost:3000/login`

## 🚧 Development Roadmap

- [x] Authentication system (username/password)
- [x] Database schema with Prisma
- [x] Basic dashboard layout
- [ ] WebSocket real-time data integration
- [ ] Drag & drop widget system (React Grid Layout)
- [ ] TradingView chart widgets
- [ ] Options chain table widget
- [ ] Price ticker widget
- [ ] Watchlist widget
- [ ] Layout persistence API
- [ ] Theme customization

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql -h localhost -U finance_user -d finance_dashboard
```

### Prisma Client Not Found
```bash
npx prisma generate
```

### Port 3000 Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

---

**Built with ❤️ using Next.js and TypeScript**
