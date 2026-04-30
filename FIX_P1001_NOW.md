# Quick Fix: P1001 "Can't reach database server"

## The Problem
```
Error: Can't reach database server at db.vabqqozdnhzeibcxmdoz.supabase.co
code: 'P1001'
```

## The Solution (Try in This Order)

### ✅ FIRST: Check if Supabase Project is Paused

**This is the #1 cause (95% of cases)**

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Look at the top of the page - if you see a **blue "Resume" button**, click it
4. Wait 1-2 minutes for the project to wake up
5. Go back to your terminal and try logging in again

If this was the issue, you're done!

---

### ✅ SECOND: Verify Your Database Password

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **Settings** (gear icon, bottom left)
3. Go to **Database** tab
4. Find **Connection string** section
5. Click **URI** tab
6. Look at the string - it should show: `postgresql://postgres:PASSWORD@host:port/database`
7. Replace `PASSWORD` with your **actual database password** (from when you created the project)
8. Copy the full string and paste it into `.env.local` as `DATABASE_URL`
9. Save and try again

---

### ✅ THIRD: Test Connection with Prisma Studio

Run this command to test if the database is actually reachable:

```bash
npx prisma studio
```

- **If it opens a web UI:** Your connection works! The issue might be elsewhere.
- **If it still fails with P1001:** Skip to FOURTH option.

---

### ✅ FOURTH: Use Local PostgreSQL Instead

If Supabase continues to fail, switch to local development:

**macOS:**
```bash
brew install postgresql
brew services start postgresql
createdb gymtyc_miniapp
```

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Run installer and remember the password you set
- Use pgAdmin to create database named `gymtyc_miniapp`

**Linux:**
```bash
sudo apt-get install postgresql
sudo systemctl start postgresql
createdb gymtyc_miniapp
```

Then update `.env.local`:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/gymtyc_miniapp"
```

Run:
```bash
npx prisma migrate dev
npm run dev
```

---

### ✅ FIFTH: Use Docker (Easiest)

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

## What's Really Happening?

1. **P1001 error** = "App found the database host but can't connect to it"
2. **Common cause** = Supabase free tier projects pause after 7 days of inactivity
3. **Other causes** = Wrong password, network issues, connection pooling misconfigured
4. **The fix** = Either wake up Supabase, fix credentials, or switch to local database

---

## After You Fix It

Once the connection works, you should be able to:
1. Run `npm run dev`
2. Open http://localhost:3000
3. Click "Dev Login"
4. Enter email: `dev@gymtycoon.app`
5. Click "Sign in"

---

## Still Not Working?

See the full troubleshooting guide: [TROUBLESHOOT_P1001.md](./TROUBLESHOOT_P1001.md)

It covers:
- Supabase project paused detection
- Password verification
- Network connectivity checks
- Connection pooling settings
- Database name verification
- Step-by-step fixes for each issue

