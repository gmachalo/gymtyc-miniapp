# Gym Tycoon MVP - Local Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm/pnpm/yarn package manager
- PostgreSQL database (local or cloud)
- Supabase account (or use local PostgreSQL)

## Database Setup

### Option 1: Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the PostgreSQL connection string from Settings → Database
4. Set it as `DATABASE_URL` in your `.env.local`

### Option 2: Local PostgreSQL

```bash
# Create local database
createdb gymtyc_miniapp

# Get connection string
DATABASE_URL="postgresql://user:password@localhost:5432/gymtyc_miniapp"
```

## Environment Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in required values:**
   ```bash
   # Set a secure AUTH_SECRET
   AUTH_SECRET=$(openssl rand -base64 32)
   
   # Add your DATABASE_URL (from Supabase or local PostgreSQL)
   DATABASE_URL="your-database-url"
   
   # Optional: Add Google OAuth credentials
   AUTH_GOOGLE_ID="..."
   AUTH_GOOGLE_SECRET="..."
   
   # Optional: Add Discord OAuth credentials
   AUTH_DISCORD_ID="..."
   AUTH_DISCORD_SECRET="..."
   ```

3. **Verify `.env.local` is in `.gitignore`** (to keep secrets safe)

## Database Initialization

```bash
# Install dependencies
npm install

# Initialize database schema
npx prisma migrate dev

# (Optional) Seed with sample data
npx prisma db seed
```

## Development

```bash
# Start dev server
npm run dev

# Open http://localhost:3000 in browser
```

### Dev Login

For testing without OAuth, use:
- **Email:** `dev@gymtycoon.app`
- **Name:** `Dev Trainer` (or any name)

No password required during development.

## OAuth Setup (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
6. Copy Client ID and Secret to `.env.local`

### Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 → General
4. Add `http://localhost:3000/api/auth/callback/discord` to redirect URIs
5. Copy Client ID and Secret to `.env.local`

## Troubleshooting

### "DATABASE_URL is not set"
- Ensure `.env.local` exists with `DATABASE_URL`
- Restart the dev server after updating `.env.local`

### "Invalid `prisma.user.upsert()`"
- Database might not be initialized. Run `npx prisma migrate dev`
- Check PostgreSQL is running and DATABASE_URL is correct

### Dev login not working
- Check `.env.local` has `AUTH_SECRET` set
- Clear browser cookies and try again
- Check server logs for specific errors

## Testing the MVP

1. **Login:** Click "Dev Login" and use `dev@gymtycoon.app`
2. **Onboarding:** Complete character creation with body type, name, plan, and mode
3. **Dashboard:** View character stats and streak
4. **Workouts:** Log a workout and see rewards calculated
5. **Gyms:** Browse system gyms
6. **Rewards:** View token balance and transaction history

## Building for Production

```bash
# Build Next.js app
npm run build

# Start production server
npm start
```

For deployment to Vercel:
1. Push changes to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

## Database Migrations

If schema changes, run:
```bash
npx prisma migrate dev --name description_of_changes
```

This creates a migration and updates the database.

## Need Help?

- Check logs: `npm run dev` will show server errors
- Prisma docs: https://www.prisma.io/docs/
- NextAuth docs: https://authjs.dev/getting-started/installation
