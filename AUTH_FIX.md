# Authentication Configuration Fix

## Issue

When attempting dev login, the following error occurred:
```
PrismaClientKnownRequestError: Invalid `prisma.user.upsert()` invocation
```

This happened because:
1. Credentials provider was using `upsert()` which could fail if the database wasn't initialized
2. JWT strategy requires proper error handling for auth callbacks
3. Missing `AUTH_SECRET` environment variable

## Solution

### 1. Improved Error Handling in Dev Login
- Changed from `upsert()` to `findUnique()` + `create()` for better error visibility
- Added validation checks for email and name inputs
- Added try-catch with detailed error logging
- Falls back gracefully if user creation fails

### 2. JWT Session Strategy
- Switched to JWT session strategy for better compatibility with Credentials provider
- Kept PrismaAdapter for OAuth providers (Google, Discord)
- JWT callbacks properly inject user ID into sessions

### 3. Environment Configuration
- Created `.env.example` template for required variables
- `AUTH_SECRET` is required for JWT signing
- `DATABASE_URL` must be set to a valid PostgreSQL connection

### 4. Database Initialization
- Ensure database is created and migrations are run
- Use `npx prisma migrate dev` to initialize schema
- Credentials provider now creates users on first login

## Quick Fix for Local Development

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Set required variables in .env.local
# - DATABASE_URL (Supabase or local PostgreSQL)
# - AUTH_SECRET (generate with: openssl rand -base64 32)

# 3. Initialize database
npx prisma migrate dev

# 4. Start dev server
npm run dev

# 5. Dev login with:
# Email: dev@gymtycoon.app
# Name: Dev Trainer (or any name)
```

## Key Changes

**File: `src/auth.ts`**
- Dev login `authorize` callback refactored for better error handling
- Added email validation and user existence checks
- Improved logging for debugging database issues

**File: `.env.example`**
- Template for all required environment variables
- Documentation for optional OAuth providers
- Clear explanations for database setup

**File: `SETUP.md`**
- Complete local development setup guide
- Database options (Supabase or local PostgreSQL)
- OAuth provider configuration instructions
- Troubleshooting guide

## Testing

1. Ensure `.env.local` has `DATABASE_URL` and `AUTH_SECRET`
2. Run `npx prisma migrate dev` to initialize database
3. Start dev server: `npm run dev`
4. Go to http://localhost:3000/login
5. Click "Dev Login" and use `dev@gymtycoon.app`
6. Should redirect to onboarding or dashboard if already onboarded

## Production Deployment

For Vercel or other platforms:
1. Set all environment variables in platform dashboard
2. Ensure database is created and migrations are run
3. Deploy as normal - authentication will work automatically
