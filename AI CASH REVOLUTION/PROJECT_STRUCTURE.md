# AI Cash Revolution - Project Structure

This document describes the professional organization of the AI Cash Revolution project.

## Directory Structure

```
AI CASH REVOLUTION/
├── railway-ml-service/      # Railway ML API (Separate Repository)
├── frontend/                 # React Frontend (Vercel)
├── backend/                  # Backend Services
│   ├── supabase/            # Supabase Backend
│   └── api/                 # Serverless APIs
├── scripts/                  # Utility Scripts
│   ├── ml/                  # ML Training & Optimization
│   ├── database/            # Database Maintenance
│   └── deployment/          # Deployment Utilities
├── database/                 # Database SQL
│   ├── schemas/             # Table Schemas
│   ├── migrations/          # SQL Migrations
│   └── setup/               # Setup Scripts
├── docs/                     # Documentation
│   ├── api/                 # API Documentation
│   ├── deployment/          # Deployment Guides
│   └── guides/              # User Guides
├── config/                   # Configuration Files
│   ├── ml/                  # ML Configurations
│   └── trading/             # Trading Configurations
└── tools/                    # Utility Tools
    └── mt5-expert/          # MT5 Expert Advisors
```

## Repository Structure

### Main Repository (Vercel + Supabase)
Contains the frontend application, Supabase backend, and supporting infrastructure.

**Key Files:**
- `package.json` - Frontend dependencies
- `vercel.json` - Vercel deployment configuration
- `.env` - Environment variables (local)
- `.env.production` - Production environment variables

### Railway ML Service (Separate Repository)
Independent microservice for ML predictions deployed on Railway.

**Location:** `railway-ml-service/`

This should be initialized as a separate Git repository for Railway deployment.

## Directories

### `/frontend`
React + TypeScript frontend application built with Vite.

**Stack:**
- React + TypeScript
- Vite
- Tailwind CSS
- Shadcn/ui components

### `/backend`
Backend services and APIs.

**Sub-directories:**
- `supabase/` - Supabase Edge Functions and configuration
- `api/` - Vercel serverless API endpoints

### `/scripts`
Organized utility scripts for various operations.

**Categories:**
- `ml/` - ML model training, optimization, backtesting
- `database/` - Database maintenance and analysis
- `deployment/` - Deployment automation

### `/database`
SQL schemas, migrations, and setup scripts.

**Organization:**
- `schemas/` - Table definitions and schema files
- `migrations/` - Database migration scripts
- `setup/` - Initial setup and maintenance scripts

### `/docs`
Comprehensive project documentation.

**Sections:**
- `api/` - API endpoint documentation
- `deployment/` - Deployment procedures
- `guides/` - User and developer guides

### `/config`
Configuration files for different components.

**Categories:**
- `ml/` - ML model configurations
- `trading/` - Trading strategy configurations

### `/tools`
Utility tools and executables.

**Includes:**
- `mt5-expert/` - MetaTrader 5 Expert Advisors (.mq5, .ex5)

## Quick Start

1. **Frontend Development:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Railway ML Service:**
   ```bash
   cd railway-ml-service
   # Initialize as separate git repo
   git init
   # Deploy to Railway
   ```

3. **Database Setup:**
   ```bash
   # Execute schema files from database/schemas/
   # Run migrations from database/migrations/
   ```

## Deployment

- **Frontend:** Deployed to Vercel (see `DEPLOYMENT_GUIDE.md`)
- **ML Service:** Deployed to Railway as separate service
- **Database:** Supabase (managed)
- **Edge Functions:** Supabase Edge Functions

## Environment Variables

Required environment variables are documented in:
- Frontend: `frontend/.env.example`
- Railway: `railway-ml-service/.env.example`

## Additional Documentation

- `README.md` - Project overview
- `CLAUDE.md` - Claude AI assistant context
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
