# Fix ETIMEDOUT Error (Database Connection Timeout)

## Problem
When trying to log in with dev credentials, you see:
```
code: 'ETIMEDOUT'
Error [PrismaClientKnownRequestError]: timeout
```

## Root Cause
Your Supabase `DATABASE_URL` is using the **direct connection** (port 5432) instead of the **Connection Pooler** (port 6543). 

Direct connections don't work reliably with serverless/Next.js API routes and frequently timeout.

## Quick Fix (2 Minutes)

### Step 1: Get the Connection Pooler URL from Supabase

1. Go to [app.supabase.com](https://app.supabase.com) and open your project
2. Click **Settings** (bottom left) → **Database**
3. Under **Connection string**, find two tabs:
   - ~~Direct~~ (causes timeout - don't use this)
   - **Connection pooler** (✓ use this one)
4. Click the **Connection pooler** tab
5. Copy the entire URL

**Important:** The URL should contain `:6543` and include `?schema=public` at the end

Example:
```
postgresql://postgres.abcdefg:YOUR_PASSWORD@aws-0-us-east-1.pooling.supabase.com:6543/postgres?schema=public
```

### Step 2: Update Your .env.local

Replace the current `DATABASE_URL` with the Connection Pooler URL:

```bash
# Old (causes timeout - direct connection)
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-us-east-1.supabase.co:5432/postgres?schema=public"

# New (use this - connection pooler)
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooling.supabase.com:6543/postgres?schema=public"
```

Key differences:
- Change `supabase.co` → `pooling.supabase.com`
- Change `:5432` → `:6543`

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

### Step 4: Try Login Again

Click "Dev Login" → `dev@gymtycoon.app` → Should work now!

## How to Verify

If the connection pooler is set up correctly, you should see this in the console:
```
✓ Ready in XXXms
```

If you're still using direct connection, you'll see:
```
[Prisma] Warning: DATABASE_URL doesn't use Supabase pooler.
Change :5432 to :6543 in your connection string for better reliability.
```

## Why Connection Pooler?

- **Supabase Direct Connection (5432):** One connection per client, slow with serverless
- **Connection Pooler (6543):** Reuses connections, fast, reliable with serverless/Next.js

## Still Timing Out?

If it's still timing out after switching to Connection Pooler:

1. **Check Supabase project status** - Make sure it's not paused
   - Go to [app.supabase.com](https://app.supabase.com)
   - Look for blue "Resume" button at top
   - Click it if visible

2. **Test connection directly:**
   ```bash
   npx prisma db push
   npx prisma studio
   ```
   If these fail, your DATABASE_URL is still wrong.

3. **Try with local PostgreSQL** instead (skip Supabase for now):
   ```bash
   docker-compose up -d
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gymtyc_miniapp"
   npx prisma migrate dev
   npm run dev
   ```

## References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supabase PgBouncer Configuration](https://supabase.com/docs/guides/database/pgbouncer)
