# Environment Configuration Test

This test script verifies that your frontend environment variables are correctly configured.

## Quick Start

1. **Create your `.env.local` file** (if you haven't already):
   ```bash
   cp .env.local.example .env.local
   ```

2. **Fill in your actual values** in `.env.local`

3. **Run the test**:
   ```bash
   npm run test:env
   ```

   Or directly:
   ```bash
   node test-env.js
   ```

## What the Test Checks

### ✅ Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key

### ⚠️ Optional Environment Variables
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL (defaults to `http://localhost:8000`)

### 🔍 Connection Tests

1. **Supabase Service Role Connection**
   - Tests if the service role key can connect to Supabase
   - Verifies basic database access

2. **Supabase Admin API Access**
   - Tests if the service role key has admin permissions
   - Required for user creation and management operations
   - ⚠️ This is critical for the `/api/ensure-user` endpoint
   - **Note**: If you don't own the Supabase project, you may not have admin access (this is expected)

3. **Supabase Anonymous Key Connection**
   - Tests if the anonymous key can connect
   - Used for client-side operations

4. **Clerk Configuration**
   - Validates key format (publishable keys start with `pk_`, secret keys start with `sk_`)

5. **Backend API Connection**
   - Tests if the backend is accessible
   - ⚠️ This test will fail if the backend isn't running (which is okay for frontend-only testing)

## Understanding the Results

### ✅ All Tests Pass
Your environment is correctly configured! You can proceed with development.

### ❌ Some Tests Fail

**Missing Environment Variables:**
- Create or update your `.env.local` file
- Make sure all required variables are set

**Supabase Connection Failed:**
- Verify your Supabase URL and keys are correct
- Check Supabase Dashboard → Settings → API
- Make sure you're using the **service_role** key (not anon key) for `SUPABASE_SERVICE_ROLE_KEY`

**Admin API Access Denied:**
- **If you don't own the Supabase project**: This is expected and normal
  - You won't be able to use the `/api/ensure-user` endpoint
  - User creation features will return 500 errors
  - **Solution**: Request admin access from the project owner, or ask them to create users manually
- **If you own the project**: Make sure you're using the correct key
  - The `SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** key (starts with `eyJ...`)
  - The service_role key has admin permissions and can bypass Row Level Security (RLS)
  - Get it from Supabase Dashboard → Settings → API → **service_role** (not anon/public)

**Clerk Configuration Failed:**
- Verify your Clerk keys are correct
- Check Clerk Dashboard → API Keys
- Publishable keys start with `pk_`
- Secret keys start with `sk_`

**Backend API Not Accessible:**
- This is okay if you're only testing the frontend
- To test the backend connection, start the backend:
  ```bash
  cd ../insightLLM_backend
  uvicorn backend.main:app --reload
  ```

## Getting Your Credentials

### Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep this secret!

### Clerk
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys**
4. Copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY` ⚠️ Keep this secret!

## Troubleshooting

### "User not allowed" / "not_admin" Error
This means your `SUPABASE_SERVICE_ROLE_KEY` doesn't have admin permissions. Make sure:
- You're using the **service_role** key (not anon key)
- The key is from Supabase Dashboard → Settings → API → **service_role** (not anon/public)

### "Missing Supabase env vars"
- Make sure your `.env.local` file is in the frontend root directory
- Restart your Next.js dev server after creating/updating `.env.local`
- Next.js only loads `.env.local` on server start

### Test Script Can't Find Environment Variables
The test script loads from `.env.local` automatically. If it's not working:
- Make sure the file is named exactly `.env.local` (not `.env` or `.env.example`)
- Make sure it's in the `insightLLM_frontend_2.0/` directory (same level as `package.json`)

## Example Output

```
============================================================
🔍 Frontend Environment Configuration Test
============================================================

📋 Checking Required Environment Variables...
✓ NEXT_PUBLIC_SUPABASE_URL: Valid
✓ SUPABASE_SERVICE_ROLE_KEY: Valid
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY: Valid
✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Valid
✓ CLERK_SECRET_KEY: Valid

📊 Testing Supabase Connections...
✓ Service Role Key: Connection successful
✓ Admin API: Access granted
✓ Anonymous Key: Connection successful

🔐 Testing Clerk Configuration...
✓ Clerk keys format validation passed

🔌 Testing Backend API Connection...
⚠ Backend API: Connection refused (backend may not be running)

✅ All critical tests passed! Your environment is configured correctly.
```

