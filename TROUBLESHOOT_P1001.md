# Error P1001: DatabaseNotReachable

## Problem
```
Error [PrismaClientKnownRequestError]: 
Can't reach database server at db.vabqqozdnhzeibcxmdoz.supabase.co
code: 'P1001'
meta: {
  driverAdapterError: Error [DriverAdapterError]: DatabaseNotReachable
}
```

The app found your database URL but **cannot connect** to the Supabase server.

## Common Causes (In Order of Likelihood)

### 1. ⏸️ Supabase Project is PAUSED (Most Common)

**Free tier Supabase projects pause after 7 days of inactivity.**

**Fix:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Look for a **"Resume"** button at the top
4. Click it and wait 1-2 minutes for the project to wake up
5. Try logging in again

**If you're on free tier:** Consider upgrading to Pro ($25/month) to prevent auto-pausing, or keep your project active by logging in weekly.

---

### 2. 🔐 Wrong DATABASE_URL Credentials

Your password or credentials may be incorrect.

**Fix:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **"Project Settings"** (bottom left, gear icon)
3. Go to **"Database"** tab
4. Scroll to **"Connection string"**
5. Click on **"URI"** tab (important!)
6. Copy the full connection string
7. Look for `[YOUR-PASSWORD]` placeholder
8. Replace it with your **actual database password** (from when you created the project)
9. Update `.env.local` with the correct string
10. Save and try again

**Example:**
```
❌ Wrong: postgresql://postgres:[YOUR-PASSWORD]@...
✅ Correct: postgresql://postgres:MyActualPassword123!@...
```

---

### 3. 🔌 Network/Connectivity Issue

Your machine may not have internet access to Supabase servers.

**Check:**
```bash
# Test if you can reach Supabase
ping db.vabqqozdnhzeibcxmdoz.supabase.co

# Or try a more direct test (if you have psql installed):
psql "postgresql://postgres:PASSWORD@db.vabqqozdnhzeibcxmdoz.supabase.co:5432/postgres"
```

**If ping fails:**
- Check your internet connection
- Try turning off VPN (if using one)
- Try on a different network (mobile hotspot)
- Check if your company firewall blocks database connections

**If psql fails with "password authentication failed":**
- Your password is wrong (see #2 above)

---

### 4. ⚙️ Connection Pooling Configuration

If using connection pooling, the settings might be wrong.

**Fix:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. **Project Settings** → **Database**
3. Check **"Connection pooling"** section
4. Ensure **Pool mode** is set to **"Transaction"**
5. The connection string should use port **6543** for pooling
6. Update your DATABASE_URL and try again

**Example with pooling:**
```
postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooling.supabase.com:6543/postgres?schema=public
```

---

### 5. 🗃️ Database Doesn't Exist

The database name in your connection string may not exist.

**Fix:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. **Project Settings** → **Database**
3. Check the database name in the connection string (usually `postgres`)
4. Verify it matches the database in Supabase
5. Update if needed and try again

---

## Verification Checklist

Before trying again, verify each of these:

- [ ] **Project is active** - No "Resume" button visible at top of Supabase dashboard
- [ ] **DATABASE_URL is set** - Check `.env.local` has `DATABASE_URL="postgresql://..."`
- [ ] **Password is correct** - Password matches what you set when creating Supabase project
- [ ] **Connection string format** - Matches pattern: `postgresql://user:password@host:port/database`
- [ ] **Port is correct** - Use 5432 for direct connection, 6543 for pooling
- [ ] **Schema is included** - String ends with `?schema=public` if using pooling
- [ ] **Internet is working** - You can browse normally
- [ ] **No VPN conflicts** - Try disabling VPN if you're using one

---

## Step-by-Step Fix (If Still Failing)

### Option A: Fresh Supabase Setup

1. Create a **new Supabase project** (to ensure it's active)
2. Get the connection string from **Project Settings** → **Database** → **URI**
3. Replace DATABASE_URL in `.env.local` with the new string
4. Run: `npx prisma db push`
5. Try logging in

### Option B: Switch to Local PostgreSQL

If Supabase continues to fail, use local PostgreSQL instead:

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb gymtyc_miniapp

# Update .env.local
DATABASE_URL="postgresql://postgres:@localhost:5432/gymtyc_miniapp"

# Initialize
npx prisma migrate dev

# Start dev server
npm run dev
```

### Option C: Use Docker

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: gymtyc_miniapp
    ports:
      - "5432:5432"
EOF

# Start
docker-compose up -d

# Update .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gymtyc_miniapp"

# Initialize
npx prisma migrate dev

# Start dev server
npm run dev
```

---

## Still Not Working?

Try these debugging steps:

```bash
# 1. Verify Prisma can generate
npx prisma generate

# 2. Check connection string format
node -e "console.log(process.env.DATABASE_URL)" # Should show full URL

# 3. Test with Prisma Studio (no need for auth)
npx prisma studio
# If this opens the UI but shows "Error", it's a connection issue
# If it shows database tables, connection works!

# 4. Check for typos in .env.local
cat .env.local | grep DATABASE_URL
```

---

## Getting Help

If none of these work:

1. **Verify Supabase is active** - This is the #1 cause
2. **Double-check your password** - This is the #2 cause
3. **Try local PostgreSQL** instead to isolate the issue
4. **Check your internet** - VPN or firewall blocking?
5. **Review connection string format** - Make sure it's correct for your setup
6. **Open a GitHub issue** with:
   - Your DATABASE_URL (hide the password): `postgresql://postgres:***@db.xxxxx.supabase.co:6543/postgres`
   - Error message from the console
   - Steps you've already tried
   - Whether Supabase project shows as "Active" in dashboard

---

## Prevention

- **For Free Tier:** Log into Supabase dashboard at least once per week to keep project active
- **For Production:** Upgrade to Pro tier ($25/month) to prevent auto-pausing
- **Best Practice:** Use `.env.local` instead of hardcoding URLs, never commit secrets to git

