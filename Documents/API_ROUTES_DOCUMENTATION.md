# API Routes Documentation

This document provides detailed documentation for all Next.js API routes in the frontend.

---

## Table of Contents
1. [Chat API Routes](#chat-api-routes)
2. [OCR API Routes](#ocr-api-routes)
3. [Pro Subscription API Routes](#pro-subscription-api-routes)
4. [Other API Routes](#other-api-routes)
5. [Error Handling](#error-handling)
6. [Authentication](#authentication)

---

## Chat API Routes

### `POST /api/chat/route.ts`
**Location**: `src/app/api/chat/route.ts`

**Purpose**: Main chat endpoint for LLM interactions using OpenAI.

**Authentication**: Required (Clerk)

**Request Body**:
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}
```

**Response**: Streaming text response (text/plain)

**Features**:
- Uses OpenAI GPT-4 model
- Streaming response for real-time updates
- Records usage (input/output tokens)
- Checks monthly token limits
- Returns 429 if limit exceeded
- Automatic usage tracking via Supabase RPC

**Flow**:
1. Authenticate user via Clerk
2. Get user email from Clerk
3. Find Supabase user by email
4. Calculate input tokens (~4 chars per token)
5. Record input tokens via `record_usage` RPC
6. Create OpenAI streaming completion
7. Stream response chunks
8. Calculate output tokens after completion
9. Record output tokens via `record_usage` RPC

**Error Responses**:
- `401`: Unauthorized (no userId)
- `400`: Invalid messages array
- `404`: User not found in Supabase
- `429`: Monthly token limit exceeded
- `500`: Server error or usage tracking failed

**Usage Example**:
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  })
});

// Handle streaming response
const reader = response.body?.getReader();
// ... process stream
```

---

### `GET /api/chat/usage/route.ts`
**Location**: `src/app/api/chat/usage/route.ts`

**Purpose**: Get user's chat usage statistics.

**Authentication**: Required (Clerk)

**Response**:
```typescript
{
  success: boolean;
  usage?: {
    tokens_input_used: number;
    tokens_output_used: number;
    period_start: string;
  };
  limits?: {
    input_tokens: number;
    output_tokens: number;
  };
  error?: string;
}
```

**Features**:
- Retrieves current month's usage
- Returns usage limits (Pro vs Free)
- Shows period start date
- Calculates remaining tokens

**Error Responses**:
- `401`: Unauthorized
- `404`: User not found
- `500`: Server error

---

### `GET /api/chat/check-limit/route.ts`
**Location**: `src/app/api/chat/check-limit/route.ts`

**Purpose**: Check if user has reached chat usage limit.

**Authentication**: Required (Clerk)

**Response**:
```typescript
{
  success: boolean;
  hasLimit: boolean;        // true if limit reached
  remaining?: {
    input_tokens: number;
    output_tokens: number;
  };
  error?: string;
}
```

**Features**:
- Quick limit check before making requests
- Returns remaining tokens
- Prevents unnecessary API calls

**Error Responses**:
- `401`: Unauthorized
- `500`: Server error

---

## OCR API Routes

### `POST /api/ocr/record-usage/route.ts`
**Location**: `src/app/api/ocr/record-usage/route.ts`

**Purpose**: Record OCR evaluation usage.

**Authentication**: Required (Clerk)

**Request Body**:
```typescript
{
  userId: string;           // Supabase user ID
  fileSize?: number;        // File size in bytes
  // ... other metadata
}
```

**Response**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Features**:
- Records OCR evaluation count
- Checks OCR limits (Pro vs Free)
- Updates usage tracking
- Returns error if limit exceeded

**Error Responses**:
- `401`: Unauthorized
- `400`: Invalid request
- `429`: OCR limit exceeded
- `500`: Server error

**Usage Example**:
```typescript
const response = await fetch('/api/ocr/record-usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: supabaseUserId,
    fileSize: file.size
  })
});
```

---

### `POST /api/ocr/check-limit/route.ts`
**Location**: `src/app/api/ocr/check-limit/route.ts`

**Purpose**: Check OCR usage limits before upload.

**Authentication**: Required (Clerk)

**Response**:
```typescript
{
  success: boolean;
  can_proceed: boolean;     // true if user can upload
  message: string;
  is_pro: boolean;
  ocr_count: number;        // Current OCR count
  ocr_limit: number;        // Monthly limit
}
```

**Features**:
- Checks OCR limit via Supabase RPC `check_ocr_limit`
- Returns detailed limit information
- Prevents upload if limit reached
- Shows Pro vs Free status

**Error Responses**:
- `401`: Unauthorized
- `404`: User not found
- `429`: Limit exceeded (can_proceed: false)
- `500`: Server error

**Usage Example**:
```typescript
const response = await fetch('/api/ocr/check-limit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

const data = await response.json();
if (!data.can_proceed) {
  // Show limit reached message
}
```

---

## Pro Subscription API Routes

### `GET /api/pro/status/route.ts`
**Location**: `src/app/api/pro/status/route.ts`

**Purpose**: Get user's Pro subscription status and usage.

**Authentication**: Required (Clerk)

**Response**:
```typescript
{
  success: boolean;
  hasAccess: boolean;       // true if Pro active
  isPro: boolean;           // Pro status
  downgraded?: boolean;     // true if downgraded from Pro
  daysLeft?: number;        // Days until expiry (used by renewal notifications)
  end_date?: string;        // Expiry date ISO string
  usage?: {
    tokens_input: number;
    tokens_output: number;
    period_start: string;
  };
  limits: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

**Usage in Renewal Notifications**:
- The `daysLeft` field is used by `renewal-notification-banner.tsx` to trigger notifications
- Notifications appear when `daysLeft` is exactly 7, 3, or 1
- Banner automatically hides when subscription is renewed (daysLeft increases)

**Features**:
- Checks active Pro key in `keys` table
- Verifies key not expired
- Gets usage data via `record_usage` RPC
- Handles downgraded users (exceeded limits)
- Returns appropriate limits (Pro vs Free)
- Calculates days until expiry

**Logic Flow**:
1. Authenticate user
2. Get user email from Clerk (with retry logic)
3. Find Supabase user
4. Check for active Pro key (not expired)
5. Call `record_usage` RPC to get usage and Pro status
6. Handle downgraded users (exceeded limits = Free limits)
7. Calculate days left until expiry
8. Return comprehensive status

**Error Responses**:
- `401`: Unauthorized
- `404`: User not found
- `503`: Clerk service unavailable (after retries)
- `500`: Server error

**Usage Example**:
```typescript
const response = await fetch('/api/pro/status', {
  method: 'GET',
  cache: 'no-store'
});

const data = await response.json();
if (data.isPro) {
  // Show Pro features
}
```

---

### `POST /api/pro/verify-key/route.ts`
**Location**: `src/app/api/pro/verify-key/route.ts`

**Purpose**: Verify and activate Pro subscription key. **⚠️ NOTE: Subscription renewal functionality is currently disabled.** Only new activations are allowed. Users with active subscriptions are blocked from activating new keys.

**Authentication**: Required (Clerk)

**Request Body**:
```typescript
{
  key: string;              // Pro subscription key
}
```

**Response (New Activation)**:
```typescript
{
  success: boolean;
  message: string;          // "Pro access activated successfully!"
  isRenewal: false;
  expiryDate: string;       // ISO date string
  durationDays: number;     // Key duration in days
}
```

**Response (Renewal)**:
```typescript
{
  success: boolean;
  message: string;          // "Subscription extended successfully!"
  isRenewal: true;
  oldExpiryDate: string;    // Original expiry before renewal
  expiryDate: string;        // New expiry after renewal (extended)
  durationAddedDays: number; // Days added to subscription
  wasCapped: boolean;        // Whether expiry was capped at maximum (12 months)
}
```

**Features**:
- Validates Pro key format
- Checks if key is already used or expired
- **⚠️ Renewal Support DISABLED**: Users with active subscriptions are blocked from activating new keys
- **New Activation**: Creates new subscription if user has no active subscription
- **Expiry Cap**: Removed (renewal disabled)
- **Usage Preservation**: N/A (renewal disabled)
- Returns activation information only (renewal responses disabled)

**⚠️ Renewal Logic DISABLED**:
- Users with active subscriptions are blocked from activating new keys
- Only new activations are allowed (users must wait until subscription expires)
- Renewal functionality will be enabled in the future

**New Activation Logic**:
- If user has no active subscription → creates new activation
- Creates `usage_pro` record with 0 usage
- Resets all counters to 0
- Clears free usage for current month

**Error Responses**:
- `401`: Unauthorized
- `400`: Invalid key, already used, expired, or activation failed
- `404`: Key not found
- `500`: Server error

**Usage Example**:
```typescript
const response = await fetch('/api/pro/verify-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'PRO-KEY-123' })
});

const data = await response.json();
if (data.success) {
  if (data.isRenewal) {
    // Subscription extended
    console.log(`Extended from ${data.oldExpiryDate} to ${data.expiryDate}`);
    if (data.wasCapped) {
      console.log('Note: Renewal was capped at 12 months maximum');
    }
  } else {
    // New activation
    console.log(`Activated until ${data.expiryDate}`);
  }
}
```

**Implementation Notes**:
- Uses `activate_pro_key` database function (Migration 016)
- **⚠️ Renewal functionality is disabled**: Blocking logic re-enabled to prevent renewals
- Database function supports renewals but API blocks users with active subscriptions
- Expiry cap validation removed (renewal disabled)
- Returns activation information only (renewal responses disabled)
- See `SUBSCRIPTION_RENEWAL_IMPLEMENTATION.md` for implementation details (currently disabled)

**Related Components**:
- `renewal-notification-banner.tsx`: Banner notifications at 7/3/1 days before expiration
- `pro-access-modal.tsx`: Modal with renewal confirmation UI
- `custom-apikey.tsx`: Renewal button and status display

---

## Other API Routes

### `GET /api/genres/route.ts`
**Location**: `src/app/api/genres/route.ts`

**Purpose**: Get available genres/categories.

**Authentication**: Optional (public endpoint)

**Response**:
```typescript
{
  success: boolean;
  genres: string[];         // Array of genre names
  error?: string;
}
```

**Features**:
- Returns list of available genres
- Used for filtering/prompt selection
- Cached response (if implemented)

---

### `POST /api/ensure-user/route.ts`
**Location**: `src/app/api/ensure-user/route.ts`

**Purpose**: Ensure user exists in Supabase database.

**Authentication**: Required (Clerk)

**Response**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Features**:
- Syncs Clerk user to Supabase
- Creates user if doesn't exist
- Updates user information
- Called on app initialization

**Error Responses**:
- `401`: Unauthorized
- `500`: Server error

---

### `POST /api/llm/route.ts`
**Location**: `src/app/api/llm/route.ts`

**Purpose**: LLM proxy endpoint (legacy/alternative to /api/chat).

**Authentication**: Required (Clerk)

**Request Body**:
```typescript
{
  prompt: string;           // User prompt
}
```

**Response**:
```typescript
{
  success: boolean;
  text?: string;            // AI response
  error?: string;
}
```

**Features**:
- Alternative chat endpoint
- Non-streaming response
- Used for response modifications
- Simpler interface than /api/chat

---

### `GET /api/quiz/mcqs/route.ts`
**Location**: `src/app/quiz/mcqs/route.ts`

**Purpose**: Get MCQ questions for quiz.

**Authentication**: Required (Clerk)

**Query Parameters**:
- `subject`: Subject name (optional)
- `limit`: Number of questions (optional)
- `difficulty`: Difficulty level (optional)

**Response**:
```typescript
{
  success: boolean;
  questions?: Array<{
    id: string;
    question: string;
    options: string[];
    correct_answer: number;
    explanation?: string;
  }>;
  error?: string;
}
```

**Features**:
- Returns MCQ questions
- Filterable by subject/difficulty
- Includes correct answers
- Explanations (if available)

---

## Error Handling

### Standard Error Response Format
```typescript
{
  success: false;
  error?: string;
  message?: string;
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (resource doesn't exist)
- `429`: Too Many Requests (limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable (external service error)

### Error Handling Best Practices
1. Always return consistent error format
2. Log errors server-side for debugging
3. Don't expose sensitive information in errors
4. Provide helpful error messages to users
5. Use appropriate HTTP status codes
6. Handle edge cases gracefully

---

## Authentication

### Clerk Integration
All protected API routes use Clerk for authentication:

```typescript
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  // ... rest of handler
}
```

### Supabase User Lookup
Most routes need to find the Supabase user:

```typescript
// Get Clerk user email
const client = await clerkClient();
const clerkUser = await client.users.getUser(userId);
const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

// Find Supabase user
const { data: supUser } = await supabase
  .from('users')
  .select('id')
  .eq('email', userEmail)
  .single();
```

### Service Role Key
API routes use Supabase service role key for admin operations:
- Bypasses Row Level Security (RLS)
- Allows direct database access
- Should never be exposed to client

---

## Rate Limiting

### Token Limits
- **Free Users**:
  - Input tokens: 250,000/month
  - Output tokens: 500,000/month
- **Pro Users**:
  - Input tokens: 1,000,000/month
  - Output tokens: 3,000,000/month

### OCR Limits
- **Free Users**: 5 evaluations/month
- **Pro Users**: Unlimited

### Limit Enforcement
- Limits checked before processing
- Usage recorded after successful operations
- Returns 429 if limit exceeded
- Monthly reset via database functions

---

## Database Functions (RPC)

### `record_usage`
Records token usage and checks limits.

**Parameters**:
```typescript
{
  p_user_id: string;
  p_input_tokens: number;
  p_output_tokens: number;
}
```

**Returns**:
```typescript
{
  success: boolean;
  is_pro: boolean;
  usage: {
    tokens_input_used: number;
    tokens_output_used: number;
    period_start: string;
  };
  downgraded?: boolean;
}
```

### `check_ocr_limit`
Checks OCR evaluation limits.

**Parameters**:
```typescript
{
  p_user_id: string;
}
```

**Returns**:
```typescript
{
  can_proceed: boolean;
  message: string;
  is_pro: boolean;
  ocr_count: number;
  ocr_limit: number;
}
```

---

## Testing API Routes

### Manual Testing
Use tools like:
- Postman
- curl
- Browser DevTools
- Next.js API route testing

### Example curl Commands
```bash
# Check Pro status
curl -X GET http://localhost:3000/api/pro/status \
  -H "Cookie: __clerk_db_jwt=..."

# Check OCR limit
curl -X POST http://localhost:3000/api/ocr/check-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: __clerk_db_jwt=..."
```

---

**Last Updated**: 2024

