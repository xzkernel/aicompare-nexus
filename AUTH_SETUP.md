# Supabase Authentication Setup

This document explains how to set up Supabase authentication for the ModelWise application.

## Prerequisites

1. A Supabase project (create one at [supabase.com](https://supabase.com))
2. Node.js and npm installed
3. Python 3.8+ for the backend

## Frontend Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Supabase Project Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Configure the following:

#### Site URL
```
http://localhost:3000
```

#### Redirect URLs
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
```

#### Google OAuth (Optional)
1. Go to **Authentication** → **Providers**
2. Enable Google provider
3. Add your Google OAuth credentials

## Backend Setup

### 1. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ai_compare

# Stripe Configuration (if using subscriptions)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_BASIC=price_basic_id_here
STRIPE_PRICE_PRO=price_pro_id_here
```

### 2. Get JWT Secret

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **JWT Secret** (this is your `SUPABASE_JWT_SECRET`)

### 3. Database Setup

1. Run the Alembic migrations:
```bash
cd backend
alembic upgrade head
```

2. The database will automatically create users on first login

## How It Works

### Frontend Flow

1. **useSession Hook**: Manages authentication state
2. **AuthUI Component**: Provides login/signup interface
3. **AuthProvider**: Wraps the app with authentication context
4. **Header Component**: Shows user info and logout button

### Backend Flow

1. **JWT Validation**: Verifies Supabase JWT tokens
2. **User Creation**: Automatically creates users on first login
3. **/me Endpoint**: Returns user info, plan, and usage
4. **Usage Tracking**: Monitors API usage per user

### Authentication Endpoints

- `POST /api/v1/users/me` - Get current user info
- `GET /api/v1/users/usage` - Get usage history
- `GET /api/v1/users/usage/{date}` - Get usage for specific date

## Security Features

1. **JWT Validation**: All requests require valid Supabase JWT
2. **Local Storage**: API keys stored only in browser
3. **User Isolation**: Each user has separate usage tracking
4. **Rate Limiting**: Plan-based usage limits enforced

## Testing

### Frontend
1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should see the login screen
4. Sign up with email or use Google OAuth

### Backend
1. Start the backend: `cd backend && uvicorn main:app --reload`
2. Test the health endpoint: `GET http://localhost:8000/health`
3. Test with authentication: Include `Authorization: Bearer <jwt>` header

## Troubleshooting

### Common Issues

1. **JWT Validation Errors**
   - Check `SUPABASE_JWT_SECRET` is correct
   - Ensure token hasn't expired

2. **CORS Errors**
   - Verify Supabase site URL configuration
   - Check redirect URLs are correct

3. **User Creation Fails**
   - Check database connection
   - Verify database migrations are applied

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=DEBUG
```

## Next Steps

1. **Email Verification**: Configure email templates in Supabase
2. **Password Reset**: Set up password reset flow
3. **Social Login**: Add more OAuth providers
4. **User Profiles**: Extend user model with additional fields
5. **Subscription Integration**: Connect with Stripe for paid plans






