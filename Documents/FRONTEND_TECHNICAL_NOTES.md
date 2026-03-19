# Frontend Technical Notes

This file consolidates previously scattered frontend markdown documentation into one structured reference.

## Included Sources

- Frontend architecture and component docs
- API and utilities docs
- Process, template, and implementation notes


---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\API_ROUTES_DOCUMENTATION.md

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

**Purpose**: Verify and activate Pro subscription key. **âš ï¸ NOTE: Subscription renewal functionality is currently disabled.** Only new activations are allowed. Users with active subscriptions are blocked from activating new keys.

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
- **âš ï¸ Renewal Support DISABLED**: Users with active subscriptions are blocked from activating new keys
- **New Activation**: Creates new subscription if user has no active subscription
- **Expiry Cap**: Removed (renewal disabled)
- **Usage Preservation**: N/A (renewal disabled)
- Returns activation information only (renewal responses disabled)

**âš ï¸ Renewal Logic DISABLED**:
- Users with active subscriptions are blocked from activating new keys
- Only new activations are allowed (users must wait until subscription expires)
- Renewal functionality will be enabled in the future

**New Activation Logic**:
- If user has no active subscription â†’ creates new activation
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
- **âš ï¸ Renewal functionality is disabled**: Blocking logic re-enabled to prevent renewals
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



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\ASYNC_JOBS_FRONTEND_IMPLEMENTATION.md

# Async Background Jobs - Frontend Implementation

**Date**: December 2025  
**Status**: âœ… **IMPLEMENTED**  
**Related**: Backend Async Background Jobs Implementation

---

## Executive Summary

The frontend has been updated to use async background jobs for OCR processing. This replaces the synchronous blocking approach with a non-blocking job-based system that provides instant feedback, real-time progress tracking, and job cancellation support.

**Key Changes**:
- New async job API functions in `ocr-api.ts`
- Updated `OCRUpload.tsx` to use async jobs
- Real-time progress polling
- Job status tracking
- Job cancellation support
- Improved user experience

---

## Problem Addressed

### Before Implementation

**Issues**:
- **Blocking UI**: User waits 10-15 minutes for HTTP response
- **Fake Progress**: Progress updates based on timers, not actual processing
- **No Cancellation**: Can't cancel long-running jobs
- **HTTP Timeouts**: Long requests may timeout
- **Poor UX**: No way to check status or leave page

### After Implementation

**Solution**:
- **Instant Response**: Job ID returned immediately
- **Real Progress**: Polls actual backend progress
- **Job Cancellation**: Can cancel running jobs
- **No Timeouts**: HTTP requests complete instantly
- **Better UX**: Can check status, leave page, return later

---

## Implementation Details

### Files Modified

1. **`src/utils/ocr-api.ts`**
   - Added async job functions
   - Job submission, status polling, progress polling
   - Job cancellation and result retrieval

2. **`src/components/OCRUpload.tsx`**
   - Updated to use async jobs
   - Real-time progress polling
   - Job cancellation UI
   - Status tracking

---

## New API Functions

### 1. `submitOCRJob(file, userId, subject)`

**Purpose**: Submit an OCR job for background processing.

**Returns**: `{ jobId: string, requestId: string }`

**Example**:
```typescript
const { jobId, requestId } = await submitOCRJob(file, userId, subject)
```

**Features**:
- Checks OCR usage limits
- Records OCR usage
- Submits job to backend
- Returns immediately with job ID

---

### 2. `getJobStatus(jobId)`

**Purpose**: Get current status of an OCR job.

**Returns**: `JobStatus | null`

**Example**:
```typescript
const status = await getJobStatus(jobId)
if (status) {
  console.log(`Job status: ${status.status}`)
}
```

**Status Values**:
- `pending`: Job created but not started
- `running`: Job is processing
- `completed`: Job completed successfully
- `failed`: Job failed with error
- `cancelled`: Job was cancelled

---

### 3. `getProgress(requestId)`

**Purpose**: Get real-time progress for an OCR job.

**Returns**: `ProgressData | null`

**Example**:
```typescript
const progress = await getProgress(requestId)
if (progress) {
  console.log(`Progress: ${progress.progress_percent}%`)
  console.log(`Step: ${progress.step}`)
  console.log(`Message: ${progress.message}`)
}
```

**Progress Data**:
- `progress_percent`: 0-100
- `step`: Current step name
- `step_number`: Current step (1-11)
- `total_steps`: Total steps (11)
- `message`: Human-readable message
- `details`: Additional details (e.g., pages_completed, total_pages)

---

### 4. `cancelJob(jobId)`

**Purpose**: Cancel a running OCR job.

**Returns**: `void`

**Example**:
```typescript
try {
  await cancelJob(jobId)
  console.log("Job cancelled successfully")
} catch (err) {
  console.error("Failed to cancel job:", err)
}
```

---

### 5. `getJobResult(jobId)`

**Purpose**: Get result of a completed OCR job.

**Returns**: `{ pdfBlob: Blob, metadata: OCRResult }`

**Example**:
```typescript
const { pdfBlob, metadata } = await getJobResult(jobId)
// Use pdfBlob and metadata
```

---

## Component Updates

### OCRUpload Component

**Key Changes**:

1. **State Management**:
   - Added `jobId` and `requestId` state
   - Added `jobStatus` state
   - Added refs for polling intervals

2. **Job Submission**:
   - Calls `submitOCRJob()` instead of `annotateDocument()`
   - Gets job ID immediately
   - Starts polling for status and progress

3. **Progress Polling**:
   - Polls `/api/ocr/progress/{requestId}` every 2 seconds
   - Updates progress bar with real data
   - Updates status message with real step information

4. **Status Polling**:
   - Polls `/api/ocr/job/{jobId}` every 2 seconds
   - Checks for completion, failure, or cancellation
   - Retrieves results when complete

5. **Cancellation**:
   - Cancel button in progress indicator
   - Calls `cancelJob()` to stop processing
   - Cleans up polling intervals

6. **Cleanup**:
   - Clears polling intervals on unmount
   - Stops polling when job completes
   - Resets state on cancellation

---

## User Flow

### 1. Job Submission

1. User selects file, exam, and subject
2. User clicks "Analyze"
3. Frontend calls `submitOCRJob()`
4. Backend returns `jobId` and `requestId` immediately
5. Frontend starts polling for status and progress

### 2. Progress Tracking

1. Frontend polls `/api/ocr/progress/{requestId}` every 2 seconds
2. Updates progress bar with real percentage
3. Updates status message with current step
4. Shows page-level progress during OCR (if available)

### 3. Status Monitoring

1. Frontend polls `/api/ocr/job/{jobId}` every 2 seconds
2. Checks job status (pending, running, completed, failed, cancelled)
3. Updates UI based on status

### 4. Completion

1. When status is `completed`:
   - Stops polling
   - Calls `getJobResult()` to retrieve PDF and metadata
   - Displays results
   - Shows download button

2. When status is `failed`:
   - Stops polling
   - Displays error message
   - Allows user to retry

3. When status is `cancelled`:
   - Stops polling
   - Displays cancellation message
   - Allows user to start new job

---

## UI Updates

### Progress Indicator

**Before**:
- Fake progress based on timers
- Generic messages
- No cancellation

**After**:
- Real progress from backend
- Actual step information
- Page-level progress during OCR
- Cancel button

**New Features**:
- Cancel button (X icon) in progress indicator
- Job ID display (for reference)
- Message about background processing
- Real-time progress percentage

### Status Messages

**Real Messages from Backend**:
- "Starting evaluation..."
- "Converting PDF pages to images..."
- "Running OCR on PDF pages..."
- "Processing page X of Y..."
- "Detecting sections and headings..."
- "Grading with subject rubric..."
- "Annotating answer pages..."
- "âœ… Evaluation complete!"

---

## Error Handling

### Job Submission Errors

**Handled**:
- OCR limit reached
- File too large
- Invalid subject
- Network errors

**User Feedback**:
- Error message displayed
- Toast notification
- Pro status refresh (if applicable)

### Job Processing Errors

**Handled**:
- Job failure
- Network errors during polling
- Result retrieval errors

**User Feedback**:
- Error message from job status
- Allows retry
- Clear error messages

### Cancellation Errors

**Handled**:
- Cancellation failure
- Network errors

**User Feedback**:
- Error message if cancellation fails
- Job continues if cancellation fails

---

## Polling Strategy

### Status Polling

**Frequency**: Every 2 seconds

**Stops When**:
- Job status is `completed`
- Job status is `failed`
- Job status is `cancelled`
- Component unmounts

**Error Handling**:
- Continues polling despite errors
- Logs errors to console
- Doesn't break user experience

### Progress Polling

**Frequency**: Every 2 seconds

**Stops When**:
- Progress reaches 100%
- Component unmounts
- Job is cancelled

**Error Handling**:
- Silently fails (progress is optional)
- Continues polling
- Falls back to status-based progress

---

## Cleanup and Memory Management

### Interval Cleanup

**On Unmount**:
```typescript
useEffect(() => {
  return () => {
    if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current)
    }
    if (progressPollIntervalRef.current) {
      clearInterval(progressPollIntervalRef.current)
    }
  }
}, [])
```

**On Completion**:
- Stops all polling
- Clears intervals
- Resets state

**On Cancellation**:
- Stops all polling
- Clears intervals
- Resets state
- Calls cancellation API

---

## Backward Compatibility

### âœ… Fully Backward Compatible

**Existing Functions**:
- `annotateDocument()` - Still available (synchronous)
- `analyzeDocument()` - Still available (synchronous)

**Migration**:
- Frontend now uses async jobs by default
- Old synchronous functions still work
- Can switch back if needed

---

## Testing Checklist

### Functional Testing

- [x] Job submission works
- [x] Status polling works
- [x] Progress polling works
- [x] Job cancellation works
- [x] Result retrieval works
- [x] Error handling works
- [x] Cleanup works

### UI Testing

- [ ] Progress bar updates correctly
- [ ] Status messages display correctly
- [ ] Cancel button works
- [ ] Error messages display correctly
- [ ] Results display correctly
- [ ] Download works

### Edge Cases

- [ ] Network errors during polling
- [ ] Job not found (404)
- [ ] Job already completed
- [ ] Job cancellation during processing
- [ ] Component unmount during polling
- [ ] Multiple concurrent jobs

---

## Performance Considerations

### Polling Frequency

**Current**: 2 seconds for both status and progress

**Rationale**:
- Balance between responsiveness and server load
- Fast enough for good UX
- Not too frequent to overload server

**Future Optimization**:
- Exponential backoff on errors
- Adaptive polling (faster when active, slower when idle)
- WebSocket for real-time updates (future)

### Network Requests

**Per Job**:
- 1 submission request
- ~150-300 status polls (5-10 minutes)
- ~150-300 progress polls (5-10 minutes)
- 1 result retrieval request

**Total**: ~300-600 requests per job

**Optimization**:
- Can reduce polling frequency
- Can use WebSocket (future)
- Can batch requests (future)

---

## User Experience Improvements

### Before

- **Wait Time**: 10-15 minutes blocking
- **Progress**: Fake, based on timers
- **Cancellation**: Not possible
- **Status**: Unknown
- **Flexibility**: Must stay on page

### After

- **Wait Time**: Instant response
- **Progress**: Real, from backend
- **Cancellation**: Available
- **Status**: Always visible
- **Flexibility**: Can leave page, return later

---

## Future Enhancements

### Potential Improvements

1. **WebSocket Support**:
   - Real-time updates without polling
   - Reduced server load
   - Better user experience

2. **Job History**:
   - List of past jobs
   - Resume failed jobs
   - View job details

3. **Notifications**:
   - Browser notifications when job completes
   - Email notifications (optional)
   - In-app notifications

4. **Job Queue UI**:
   - See all active jobs
   - Manage multiple jobs
   - Priority queue

5. **Offline Support**:
   - Queue jobs when offline
   - Sync when online
   - Local job storage

---

## Configuration

### Polling Intervals

**Current**: 2 seconds

**Can be configured**:
```typescript
const STATUS_POLL_INTERVAL = 2000 // 2 seconds
const PROGRESS_POLL_INTERVAL = 2000 // 2 seconds
```

### Backend URL

**Current**: From environment variable

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
```

---

## Files Modified

### Primary Changes

1. **`src/utils/ocr-api.ts`**
   - Added `submitOCRJob()` function
   - Added `getJobStatus()` function
   - Added `getProgress()` function
   - Added `cancelJob()` function
   - Added `getJobResult()` function
   - Added TypeScript interfaces

2. **`src/components/OCRUpload.tsx`**
   - Updated imports
   - Added state for job tracking
   - Added polling logic
   - Added cancellation support
   - Updated progress display
   - Added cleanup logic

### Documentation

3. **`Documents/ASYNC_JOBS_FRONTEND_IMPLEMENTATION.md`** (this file)
   - Complete implementation documentation

---

## Success Criteria

### âœ… Implementation Complete

- [x] Async job submission works
- [x] Status polling works
- [x] Progress polling works
- [x] Job cancellation works
- [x] Result retrieval works
- [x] Error handling works
- [x] Cleanup works
- [x] UI updates correctly
- [x] Backward compatible

### â³ Testing (Pending)

- [ ] End-to-end testing
- [ ] Error scenario testing
- [ ] Performance testing
- [ ] User acceptance testing

---

## Conclusion

The frontend async background jobs implementation is complete. The system now provides:

- **Instant API responses**: No blocking
- **Real-time progress**: Actual backend progress
- **Job cancellation**: User control
- **Better UX**: Can leave page, return later
- **Status tracking**: Always know job status

**Key Achievements**:
- âœ… Async job submission
- âœ… Real-time progress polling
- âœ… Job status tracking
- âœ… Job cancellation support
- âœ… Result retrieval
- âœ… Error handling
- âœ… Cleanup and memory management

**Expected Impact**:
- Better user experience (no blocking)
- Real progress feedback
- Job cancellation support
- No HTTP timeout issues
- Can leave page and return

---

**Last Updated**: December 2025  
**Status**: âœ… Implementation Complete  
**Next**: Testing and User Acceptance



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\CHATBOT_NAVIGATION_REDESIGN.md

# Chatbot Page Navigation Redesign - Implementation Complete

## Overview
Successfully transformed the chatbot page to use a right-side hamburger navigation instead of the top navbar, removed the genre selection requirement, and unified the UI styling across all pages.

## Changes Made

### 1. New Components Created

#### `RightNavbar.tsx`
- Created a new right-side navigation component specifically for chat pages
- Features a hamburger menu button fixed on the top-right corner
- Opens a sliding sidebar from the right with navigation links
- Includes theme toggle and user profile/login
- Smooth animations using Framer Motion
- Responsive design with backdrop overlay

#### `NavigationWrapper.tsx`
- Smart routing component that conditionally renders navigation based on page
- Shows `RightNavbar` for chat pages (`/app` and `/app/[chat]`)
- Shows regular `Navbar` for all other pages (home, evaluations, MCQs, etc.)
- Excludes non-chat app routes like `/app/ocr`, `/app/help`, etc.

### 2. Layout Updates

#### `app/layout.tsx`
- Replaced direct `Navbar` import with `NavigationWrapper`
- Now conditionally renders appropriate navigation based on route

#### `app/(routes)/(general)/layout.tsx`
- Added `isChatPage` detection for styling
- Chat pages now have clean white/dark background
- Non-chat pages keep the gradient background
- Removed redundant header component reference

### 3. Genre Selection Removal

#### `input-prompt-components/input-prompt.tsx`
- Removed mandatory genre selection check
- Genre now defaults to "General" if not selected
- Users can send messages without selecting a genre
- Streamlined chat experience

#### `sidebar-components/sidebar.tsx`
- Removed `InsightLogo` (genre selector) from mobile view
- Cleaned up dynamic imports

#### `header-components/header.tsx`
- Removed `InsightLogo` component completely
- Centered the `TopLoader` component
- Cleaner, minimal header design

### 4. UI Styling Improvements

#### Chat Pages (`/app` and `/app/[chat]`)
- Clean white/dark background instead of gradient
- Increased top padding for better spacing (pt-8 â†’ pt-16)
- Better visual hierarchy
- Consistent with modern chat interfaces

#### Home Page (`/app`)
- Enhanced gradient glow effect
- Better animation timing
- Improved responsive spacing

#### Landing Page
- Updated background color for consistency
- Maintains grid pattern for visual interest

## User Experience Improvements

1. **Cleaner Chat Interface**
   - No top navbar cluttering the chat view
   - More screen space for conversations
   - Hamburger menu on right keeps UI clean

2. **Streamlined Workflow**
   - No mandatory genre selection
   - Faster access to chatbot
   - Reduced friction for new users

3. **Consistent Navigation**
   - Regular navbar on non-chat pages
   - Right-side navigation on chat pages
   - Smooth transitions between pages

4. **Better Mobile Experience**
   - Touch-optimized hamburger button
   - Full-screen chat interface
   - Responsive sidebar with overlay

## Technical Details

### Route Detection Logic
```tsx
const isChatPage = pathname === '/app' || 
    (pathname?.match(/^\/app\/[^/]+$/) && 
     !pathname.includes('/ocr') && 
     !pathname.includes('/help') &&
     !pathname.includes('/quiz') &&
     !pathname.includes('/prompt-gallery') &&
     !pathname.includes('/activity'));
```

### Navigation Behavior
- **Chat Pages**: Right hamburger menu â†’ Sliding sidebar
- **Other Pages**: Top navbar with rounded translucent background
- **All Pages**: Theme toggle, user profile, same navigation links

## Files Modified
1. `src/components/RightNavbar.tsx` (NEW)
2. `src/components/NavigationWrapper.tsx` (NEW)
3. `src/app/layout.tsx`
4. `src/app/(routes)/(general)/layout.tsx`
5. `src/app/(routes)/(general)/app/page.tsx`
6. `src/app/(routes)/(general)/app/[chat]/page.tsx`
7. `src/app/page.tsx`
8. `src/components/input-prompt-components/input-prompt.tsx`
9. `src/components/sidebar-components/sidebar.tsx`
10. `src/components/header-components/header.tsx`

## Testing Recommendations
1. Navigate to `/app` and verify right-side hamburger menu appears
2. Click hamburger to open navigation sidebar
3. Send a chat message without selecting genre (should work)
4. Navigate to `/app/ocr` and verify top navbar appears
5. Test theme toggle in both navigation modes
6. Test on mobile devices for responsive behavior
7. Verify smooth transitions between chat and non-chat pages

## Next Steps (Optional Enhancements)
- Add keyboard shortcuts (ESC to close sidebar)
- Add swipe gestures for mobile sidebar
- Consider adding chat history in sidebar
- Add notification badges for new messages


---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\COMPONENTS_DOCUMENTATION.md

# Components Documentation

This document provides detailed documentation for all frontend components organized by category.

---

## Table of Contents
1. [Chat Provider Components](#chat-provider-components)
2. [Header Components](#header-components)
3. [Sidebar Components](#sidebar-components)
4. [Input Prompt Components](#input-prompt-components)
5. [Landing Components](#landing-components)
6. [UI Components](#ui-components)
7. [Dev Components](#dev-components)
8. [Other Components](#other-components)

---

## Chat Provider Components

### `chat-provider.tsx`
**Location**: `src/components/chat-provider-components/chat-provider.tsx`

**Purpose**: Main chat interface component that displays user prompts and AI responses with editing capabilities.

**Props**:
```typescript
{
  llmResponse: string;        // AI response text
  chatUniqueId: string;       // Unique chat message ID
  userPrompt: string;          // User's prompt/question
  imgName?: string;            // Optional image name
  imgInfo: {                   // Image information
    imgSrc: string;
    imgAlt: string;
  };
}
```

**Features**:
- Displays user prompt with edit capability
- Renders AI response in rich text editor (EditorShell)
- Text selection and modification dropdown
- Multiple modification options (Lengthen, Shorten, Simplify, etc.)
- Custom prompt modification
- Text-to-speech integration
- Image display support
- Updates response in database via `updateResponse` action

**State Management**:
- Uses Zustand store for `topLoader`, `currChat`, `setCurrChat`, `setTopLoader`
- Local state for dropdown, editor, selected text, etc.

**Key Functions**:
- `handleSelectNode()`: Gets selected text from editor
- `handlePrompt()`: Modifies response based on prompt type
- `handleToSetPrompt()`: Updates prompt in state
- `handleTxtToSpeech()`: Gets text for TTS

**Dependencies**:
- `EditorShell`: Rich text editor
- `TextToSpeech`: TTS component
- `ChatActionsBtns`: Action buttons
- `updateResponse` action

**Usage**:
```tsx
<ChatProvider
  llmResponse={response}
  chatUniqueId={messageId}
  userPrompt={prompt}
  imgInfo={{ imgSrc: "/avatar.png", imgAlt: "AI" }}
/>
```

---

### `optimistic-chat.tsx`
**Location**: `src/components/chat-provider-components/optimistic-chat.tsx`

**Purpose**: Displays chat messages with optimistic UI updates.

**Props**:
```typescript
{
  message: MessageProps[];     // Array of chat messages
  name: string;                // User name
  image: string;               // User avatar URL
}
```

**Features**:
- Renders chat message history
- Optimistic UI for immediate feedback
- User and AI message differentiation
- Image support in messages

---

### `msg-loader.tsx`
**Location**: `src/components/chat-provider-components/msg-loader.tsx`

**Purpose**: Displays loading state while AI is generating a response.

**Props**:
```typescript
{
  name: string;                // User name
  image: string;               // User avatar URL
}
```

**Features**:
- Shows loading animation during AI response generation
- Uses Zustand `msgLoader` state
- Displays user avatar and name

---

### `MarkdownRenderer.tsx`
**Location**: `src/components/chat-provider-components/MarkdownRenderer.tsx`

**Purpose**: Renders markdown content with syntax highlighting.

**Features**:
- Markdown parsing and rendering
- Code block syntax highlighting
- Link rendering
- List formatting

---

### `code-block.tsx`
**Location**: `src/components/chat-provider-components/code-block.tsx`

**Purpose**: Displays code blocks with syntax highlighting.

**Features**:
- Syntax highlighting using highlight.js
- Language detection
- Copy to clipboard functionality
- Multiple language support

---

### `text-to-speech.tsx`
**Location**: `src/components/chat-provider-components/text-to-speech.tsx`

**Purpose**: Converts text to speech using browser Web Speech API.

**Props**:
```typescript
{
  handleTxtToSpeech: () => string;  // Function that returns text to speak
}
```

**Features**:
- Play/pause controls
- Voice selection
- Rate and pitch adjustment
- Browser compatibility handling

---

### `speech-to-text.tsx`
**Location**: `src/components/chat-provider-components/speech-to-text.tsx`

**Purpose**: Converts speech to text for input.

**Features**:
- Browser Web Speech API integration
- Start/stop recording
- Real-time transcription
- Error handling

---

### `share-chat.tsx`
**Location**: `src/components/chat-provider-components/share-chat.tsx`

**Purpose**: Shares chat conversations via various methods.

**Features**:
- Copy to clipboard
- Social media sharing
- Email sharing
- Share link generation

---

### `modify-response.tsx`
**Location**: `src/components/chat-provider-components/modify-response.tsx`

**Purpose**: Provides UI for modifying AI responses.

**Features**:
- Response modification options
- Text selection
- Custom modification prompts
- Real-time preview

---

### `chat-actions-btns.tsx`
**Location**: `src/components/chat-provider-components/chat-actions-btns.tsx`

**Purpose**: Action buttons for chat messages (copy, share, delete, etc.).

**Props**:
```typescript
{
  chatID: string;              // Chat ID
  userPrompt: string;           // User prompt
  llmResponse: string;          // AI response
  shareMsg: string;             // Message to share
}
```

**Features**:
- Copy message
- Share chat
- Delete message
- Edit message
- Regenerate response

---

### `EditorShell.tsx`
**Location**: `src/components/chat-provider-components/EditorShell.tsx`

**Purpose**: Wraps TipTap rich text editor with extensions.

**Props**:
```typescript
{
  initialResponse: string;      // Initial editor content
  selectedNode: string;         // Selected text
  dropdown: boolean;            // Dropdown visibility
  onSelectNode: () => void;     // Selection handler
  onButtonClick: () => void;   // Button click handler
  onEditorReady: (editor) => void;  // Editor ready callback
}
```

**Features**:
- TipTap editor integration
- Rich text formatting
- Code block support
- Markdown support
- Text selection handling

---

### `set-conversation-id.tsx`
**Location**: `src/components/chat-provider-components/set-conversation-id.tsx`

**Purpose**: Sets conversation ID in Zustand store.

**Props**:
```typescript
{
  conversationID: string | null;  // Conversation ID
}
```

**Features**:
- Updates global state with conversation ID
- Used for tracking conversation context

---

### `gradient-loader.tsx`
**Location**: `src/components/chat-provider-components/gradient-loader.tsx`

**Purpose**: Animated gradient loading indicator.

**Features**:
- Smooth gradient animation
- Customizable colors
- Lightweight

---

## Header Components

### `header.tsx`
**Location**: `src/components/header-components/header.tsx`

**Purpose**: Main application header/navbar.

**Features**:
- Logo display
- Navigation links
- User profile menu
- Usage display
- Theme toggle
- Responsive design

---

### `insight-logo.tsx`
**Location**: `src/components/header-components/insight-logo.tsx`

**Purpose**: Application logo component.

**Features**:
- Logo image/icon
- Link to home page
- Responsive sizing

---

### `ProfileMenu.tsx`
**Location**: `src/components/header-components/ProfileMenu.tsx`

**Purpose**: User profile dropdown menu.

**Features**:
- User avatar
- Profile options
- Sign out functionality
- Pro status display
- Settings access

---

### `usage-display.tsx`
**Location**: `src/components/header-components/usage-display.tsx`

**Purpose**: Displays user's usage statistics.

**Features**:
- Token usage display
- OCR count display
- Monthly limits
- Progress indicators
- Pro vs Free limits

---

### `pro-access-modal.tsx`
**Location**: `src/components/header-components/pro-access-modal.tsx`

**Purpose**: Modal for Pro subscription management, activation, and renewal.

**Props**:
```typescript
{
  onClose: () => void;  // Close handler
  onSuccess?: (data: { end_date: string }) => void;  // Success callback with expiry date
}
```

**Features**:
- Pro subscription information and status checking
- Key verification input for activation/renewal
- Renewal confirmation UI (shows current expiry and days remaining)
- Dynamic modal title ("Renew Subscription" vs "Get Pro Access")
- Enhanced success messages distinguishing renewals from new activations
- Displays old/new expiry dates, days added, and cap warnings for renewals
- Confetti animation on successful activation/renewal
- Automatic pro status refresh after activation/renewal

**Renewal Support**:
- Automatically detects if user has active subscription
- Shows renewal-specific UI with current expiry information
- Preserves usage on renewal (no reset)
- Handles expiry cap warnings (12 months maximum)

---

### `custom-apikey.tsx`
**Location**: `src/components/header-components/custom-apikey.tsx`

**Purpose**: Displays Pro subscription status and provides access to Pro subscription management.

**Features**:
- Pro subscription status display (active/inactive)
- Days remaining indicator for active subscriptions
- "Pro Active" button (clickable, opens renewal modal)
- "Renew Subscription" button (for users with active subscriptions)
- "Try Pro" button (for users without active subscriptions)
- Opens ProAccessModal for both new activations and renewals
- Usage dashboard integration
- Confetti celebration on successful activation/renewal
- Automatic status refresh after subscription changes

**Renewal Support**:
- Allows modal access regardless of current Pro status
- Handles both new activations and renewals
- Updates status correctly after renewal (preserves days left calculation)

---

### `renewal-notification-banner.tsx`
**Location**: `src/components/header-components/renewal-notification-banner.tsx`

**Purpose**: Banner notification component that alerts users when their Pro subscription is expiring soon.

**Features**:
- Automatic subscription expiry checking on app load
- Banner notifications at 7, 3, and 1 days before expiration
- Dismissible notifications (shows again next day if still expiring)
- "Renew Now" button that opens renewal modal
- Visual urgency indicators:
  - Blue gradient banner for 7/3 days remaining
  - Orange/red gradient banner for 1 day remaining (urgent)
- Automatic hiding after successful renewal
- localStorage-based dismissal tracking (per day threshold)
- Listens for subscription renewal events
- Responsive design with proper spacing

**Notification Triggers**:
- Shows when subscription has exactly 7, 3, or 1 days remaining
- Only for users with active Pro subscriptions
- Automatically hides when subscription is renewed

**Dismissal Logic**:
- Dismissals stored in localStorage with date
- If dismissed today, don't show again today
- If dismissed yesterday, show again (allows daily reminders)
- All dismissals cleared when subscription is renewed

**Integration**:
- Integrated into `(routes)/(general)/layout.tsx`
- Appears on all app pages (except landing page)
- Fixed at top of page (z-index: 50)
- Opens ProAccessModal for renewal flow

---

### `signin-now.tsx`
**Location**: `src/components/header-components/signin-now.tsx`

**Purpose**: Sign-in prompt component.

**Features**:
- Sign-in button
- Authentication prompt
- Redirect handling

---

### `top-loader.tsx`
**Location**: `src/components/header-components/top-loader.tsx`

**Purpose**: Top navigation loading indicator.

**Features**:
- Progress bar at top of page
- Route change indication
- Smooth animations

---

## Sidebar Components

### `sidebar.tsx`
**Location**: `src/components/sidebar-components/sidebar.tsx`

**Purpose**: Main sidebar component with chat list and navigation.

**Features**:
- Chat list display
- New chat button
- Chat search
- Pinned chats
- Chat actions (delete, rename, pin)
- Responsive design

---

### `sidebar-wrapper.tsx`
**Location**: `src/components/sidebar-components/sidebar-wrapper.tsx`

**Purpose**: Wrapper component that manages sidebar state.

**Features**:
- Sidebar open/close state
- Context provider
- Mobile responsiveness
- Animation handling

---

### `sidebar-chat-list.tsx`
**Location**: `src/components/sidebar-components/sidebar-chat-list.tsx`

**Purpose**: Displays list of chat conversations.

**Features**:
- Chat list rendering
- Chat selection
- Active chat highlighting
- Chat metadata (title, date, icon)
- Infinite scroll (if implemented)

---

### `theme-switch.tsx`
**Location**: `src/components/sidebar-components/theme-switch.tsx`

**Purpose**: Dark/light theme toggle switch.

**Features**:
- Theme switching
- Persistent theme preference
- Smooth transitions
- Icon indicators

---

### `right-hamburger-menu.tsx`
**Location**: `src/components/sidebar-components/right-hamburger-menu.tsx`

**Purpose**: Mobile hamburger menu for right-aligned navigation.

**Features**:
- Mobile menu toggle
- Navigation links
- User menu
- Responsive design

---

## Input Prompt Components

### `input-prompt.tsx`
**Location**: `src/components/input-prompt-components/input-prompt.tsx`

**Purpose**: Main input component for user prompts.

**Features**:
- Text input
- Image upload
- Auto-resize textarea
- Submit button
- Character count
- Validation
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

---

### `input-actions.tsx`
**Location**: `src/components/input-prompt-components/input-actions.tsx`

**Purpose**: Action buttons for input (send, clear, attach, etc.).

**Features**:
- Send button
- Clear button
- Attach image
- Voice input
- Keyboard shortcuts

---

## Landing Components

### `RotatingImages.tsx`
**Location**: `src/components/landing-components/RotatingImages.tsx`

**Purpose**: Rotating image carousel for landing page.

**Features**:
- Image rotation
- Smooth transitions
- Auto-play
- Manual navigation
- Responsive images

---

### `FAQ.tsx`
**Location**: `src/components/landing-components/FAQ.tsx`

**Purpose**: FAQ accordion component.

**Features**:
- Expandable questions
- Smooth animations
- Search functionality (if implemented)
- Categorized FAQs

---

### `animated-background.tsx`
**Location**: `src/components/landing-components/animated-background.tsx`

**Purpose**: Animated background effects.

**Features**:
- Particle effects
- Gradient animations
- Performance optimized
- Customizable patterns

---

## UI Components

### `button.tsx`
**Location**: `src/components/ui/button.tsx`

**Purpose**: Base button component (shadcn/ui style).

**Variants**:
- `default`: Standard button
- `destructive`: Delete/danger actions
- `outline`: Outlined button
- `secondary`: Secondary actions
- `ghost`: Minimal button
- `link`: Link-style button

**Sizes**: `sm`, `md`, `lg`

---

### `card.tsx`
**Location**: `src/components/ui/card.tsx`

**Purpose**: Card container component.

**Sub-components**:
- `CardHeader`: Card header
- `CardTitle`: Card title
- `CardDescription`: Card description
- `CardContent`: Card content
- `CardFooter`: Card footer

---

### `badge.tsx`
**Location**: `src/components/ui/badge.tsx`

**Purpose**: Badge component for labels and tags.

**Variants**: `default`, `secondary`, `destructive`, `outline`

---

### `alert.tsx`
**Location**: `src/components/ui/alert.tsx`

**Purpose**: Alert/notification component.

**Variants**: `default`, `destructive`, `success`, `warning`

---

### `sheet.tsx`
**Location**: `src/components/ui/sheet.tsx`

**Purpose**: Sheet/drawer component (side panel).

**Features**:
- Slide-in from sides
- Overlay backdrop
- Close on outside click
- Responsive

---

### `loading-state.tsx`
**Location**: `src/components/ui/loading-state.tsx`

**Purpose**: Loading spinner component.

**Variants**: Different sizes and styles

---

### `typewriter-effect.tsx`
**Location**: `src/components/ui/typewriter-effect.tsx`

**Purpose**: Typewriter animation effect.

**Features**:
- Character-by-character animation
- Customizable speed
- Cursor blinking

---

### `glass-monolith.tsx`
**Location**: `src/components/ui/glass-monolith.tsx`

**Purpose**: Glass morphism effect component.

**Features**:
- Frosted glass effect
- Backdrop blur
- Transparency
- Border styling

---

### `neon-wave-background.tsx`
**Location**: `src/components/ui/neon-wave-background.tsx`

**Purpose**: Neon wave animation background.

**Features**:
- Animated wave patterns
- Neon color effects
- Smooth animations

---

## Dev Components

### `dev-button.tsx`
**Location**: `src/components/dev-components/dev-button.tsx`

**Purpose**: Enhanced button component with custom styling.

**Features**:
- Multiple variants
- Icon support
- Loading states
- Disabled states
- Custom animations

---

### `dev-modal.tsx`
**Location**: `src/components/dev-components/dev-modal.tsx`

**Purpose**: Custom modal component.

**Features**:
- Overlay backdrop
- Close on outside click
- Animation transitions
- Size variants

---

### `dev-drawer.tsx`
**Location**: `src/components/dev-components/dev-drawer.tsx`

**Purpose**: Drawer/side panel component.

**Features**:
- Slide-in animations
- Multiple positions (left, right, top, bottom)
- Overlay backdrop

---

### `dev-input.tsx`
**Location**: `src/components/dev-components/dev-input.tsx`

**Purpose**: Enhanced input component.

**Features**:
- Validation states
- Error messages
- Icons
- Placeholder animations

---

### `dev-toast.tsx`
**Location**: `src/components/dev-components/dev-toast.tsx`

**Purpose**: Toast notification component.

**Features**:
- Success/error/info variants
- Auto-dismiss
- Manual dismiss
- Stacking

---

### `dev-popover.tsx`
**Location**: `src/components/dev-components/dev-popover.tsx`

**Purpose**: Popover component.

**Features**:
- Position control
- Trigger elements
- Content rendering

---

### `dev-emoji-picker.tsx`
**Location**: `src/components/dev-components/dev-emoji-picker.tsx`

**Purpose**: Emoji picker component.

**Features**:
- Emoji categories
- Search functionality
- Recent emojis
- Custom emoji sets

---

### `react-tooltip.tsx`
**Location**: `src/components/dev-components/react-tooltip.tsx`

**Purpose**: Tooltip component.

**Features**:
- Position control
- Delay options
- Arrow indicators
- Multiple triggers

---

### `sleek-toggle.tsx`
**Location**: `src/components/dev-components/sleek-toggle.tsx`

**Purpose**: Toggle switch component.

**Features**:
- Smooth animations
- Customizable colors
- Size variants
- Disabled states

---

## Other Components

### `NavigationWrapper.tsx`
**Location**: `src/components/NavigationWrapper.tsx`

**Purpose**: Conditionally renders Navbar or RightNavbar based on route.

**Logic**:
- Shows `RightNavbar` for chat pages (`/app`, `/app/[chat]`)
- Shows `Navbar` for all other pages
- Excludes specific routes (ocr, help, quiz, prompt-gallery, activity)

---

### `Navbar.tsx`
**Location**: `src/components/Navbar.tsx`

**Purpose**: Standard navigation bar.

**Features**:
- Logo
- Navigation links
- User menu
- Responsive design

---

### `RightNavbar.tsx`
**Location**: `src/components/RightNavbar.tsx`

**Purpose**: Right-aligned navbar for chat pages.

**Features**:
- Right-side positioning
- Hamburger menu
- Chat-specific navigation

---

### `ErrorBoundary.tsx`
**Location**: `src/components/ErrorBoundary.tsx`

**Purpose**: React error boundary for error handling.

**Features**:
- Catches React errors
- Displays error UI
- Error logging
- Fallback UI

---

### `Footer.tsx`
**Location**: `src/components/Footer.tsx`

**Purpose**: Application footer.

**Features**:
- Links
- Copyright information
- Social media links
- Contact information

---

### `OCRUpload.tsx`
**Location**: `src/components/OCRUpload.tsx`

**Purpose**: PDF upload and OCR evaluation component with async background job processing and real-time progress tracking.

**Props**:
```typescript
{
  onResults?: (results: OCRResult) => void;      // Callback when results are ready
  onAnnotatedPDF?: (pdfUrl: string) => void;     // Callback with annotated PDF URL
}
```

**Features**:
- **Async Background Jobs**: Submits jobs for background processing (non-blocking)
- **Real-time Progress Tracking**: Polls backend for actual progress updates
- **Page-level Progress**: Shows pages completed during OCR processing
- **Job Cancellation**: Can cancel running jobs
- **Job Status Tracking**: Monitors job status (pending, running, completed, failed, cancelled)
- **Result Retrieval**: Gets results when job completes
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Progress Display**: Visual progress bar with detailed status messages
- **Subject Selection**: Exam-based subject selection (CSS/PMS)
- **File Upload**: PDF file upload with validation

**State Management**:
- `file`: Selected PDF file
- `exam`: Selected exam type (CSS/PMS)
- `subject`: Selected subject
- `loading`: Processing state
- `progress`: Progress percentage (0-100)
- `loadingStage`: Current step message
- `jobId`: Current job ID
- `requestId`: Current request ID
- `jobStatus`: Current job status
- `progressData`: Full progress data with details
- `error`: Error message
- `results`: OCR results
- `annotatedPdfBlob`: Annotated PDF blob

**Key Functions**:
- `handleEvaluate()`: Submits job and starts polling
- `handleCancel()`: Cancels running job
- `stopPolling()`: Clears polling intervals
- `pollStatus()`: Polls job status every 2 seconds
- `pollProgress()`: Polls progress every 2 seconds
- `resetEvaluation()`: Resets component state

**Async Job Flow**:
1. User clicks "Analyze"
2. `submitOCRJob()` called â†’ Returns `jobId` and `requestId` immediately
3. Starts polling:
   - Status polling: Every 2 seconds (`getJobStatus()`)
   - Progress polling: Every 2 seconds (`getProgress()`)
4. Updates UI with real-time progress
5. When status = "completed": Calls `getJobResult()` to retrieve PDF and metadata
6. Displays results and download button

**Progress Tracking**:
- Polls `/api/ocr/progress/{requestId}` for real-time progress
- Displays:
  - Overall progress percentage
  - Current step message
  - Page-level progress (during OCR): "X / Y pages"
  - Step information: "Step X / 11"
  - Job ID for reference

**Job Cancellation**:
- Cancel button (X icon) in progress indicator
- Calls `cancelJob(jobId)` to stop processing
- Stops all polling
- Resets state

**Dependencies**:
- `@/utils/ocr-api`: Async job functions (`submitOCRJob`, `getJobStatus`, `getProgress`, `cancelJob`, `getJobResult`)
- `@clerk/nextjs`: User authentication (`useUser`)
- `@/utils/insight-zustand`: Toast notifications
- `lucide-react`: Icons (Upload, X)

**Usage**:
```tsx
<OCRUpload
  onResults={(metadata) => {
    console.log("Results:", metadata);
  }}
  onAnnotatedPDF={(url) => {
    console.log("PDF URL:", url);
  }}
/>
```

**Recent Changes** (December 2025):
- âœ… Replaced synchronous `annotateDocument()` with async `submitOCRJob()`
- âœ… Added real-time progress polling (replaces fake timer-based progress)
- âœ… Added job status tracking
- âœ… Added job cancellation support
- âœ… Enhanced progress display with page-level details
- âœ… Added cleanup on unmount and cancellation

**See Also**: 
- [Async Jobs Frontend Implementation](../Documents/ASYNC_JOBS_FRONTEND_IMPLEMENTATION.md) for detailed documentation

**Purpose**: File upload component for OCR evaluations.

**Features**:
- File drag & drop
- File validation
- Progress indicator
- Error handling
- Multiple file support (if applicable)

---

### `OCRCard.tsx`
**Location**: `src/components/OCRCard.tsx`

**Purpose**: Displays OCR evaluation results.

**Features**:
- Result display
- Score visualization
- Feedback sections
- Download options
- Share functionality

---

### `usage-dashboard.tsx`
**Location**: `src/components/usage-dashboard.tsx`

**Purpose**: Usage statistics dashboard.

**Features**:
- Usage charts
- Token consumption
- OCR count
- Monthly limits
- Progress indicators

---

### `EnsureSupabaseUser.tsx`
**Location**: `src/components/EnsureSupabaseUser.tsx`

**Purpose**: Ensures user exists in Supabase database.

**Features**:
- Syncs Clerk user to Supabase
- Creates user if doesn't exist
- Updates user information
- Error handling

---

### `TypingText.tsx`
**Location**: `src/components/TypingText.tsx`

**Purpose**: Typing animation text component.

**Features**:
- Character-by-character typing
- Customizable speed
- Cursor blinking

---

## Component Best Practices

1. **Type Safety**: Always use TypeScript types for props
2. **Error Handling**: Implement error boundaries and try-catch
3. **Loading States**: Show loading indicators for async operations
4. **Accessibility**: Use semantic HTML and ARIA attributes
5. **Performance**: Use React.memo for expensive components
6. **Documentation**: Document complex logic and props
7. **Testing**: Write tests for critical components

---

**Last Updated**: 2024



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\DOCUMENTATION_PROCESS.md

# Documentation Process Guide

**IMPORTANT**: All code changes must be documented. This is now a mandatory part of the development workflow.

---

## ðŸ“‹ Quick Checklist

Before committing any changes, ensure:

- [ ] Code changes are complete and tested
- [ ] Documentation template is filled out
- [ ] Relevant documentation file is updated
- [ ] "Last Updated" date is set
- [ ] Code examples are included (if applicable)
- [ ] Related files are cross-referenced
- [ ] Documentation is reviewed along with code

---

## ðŸš€ Documentation Workflow

### Step 1: Make Your Code Changes
Write your code, test it, and ensure it works.

### Step 2: Choose the Right Template
Based on what you changed:

- **API Route** â†’ Use `API_ROUTES_DOCUMENTATION.md` template
- **Component** â†’ Use `COMPONENTS_DOCUMENTATION.md` template
- **Utility/Hook** â†’ Use `UTILITIES_AND_HOOKS.md` template
- **Bug Fix** â†’ Use bug fix template
- **Feature** â†’ Use feature addition template
- **Refactoring** â†’ Use refactoring template

### Step 3: Fill Out the Template
Copy the relevant template from:
- **Frontend**: `insightLLM_frontend_2.0/Documents/DOCUMENTATION_TEMPLATE.md`

Fill in all sections with:
- What changed
- Why it changed
- How it works
- Usage examples
- Any breaking changes

### Step 4: Update the Documentation File
Add your documentation to the appropriate file:

**Frontend:**
- Component changes â†’ `insightLLM_frontend_2.0/Documents/COMPONENTS_DOCUMENTATION.md`
- API changes â†’ `insightLLM_frontend_2.0/Documents/API_ROUTES_DOCUMENTATION.md`
- Utility changes â†’ `insightLLM_frontend_2.0/Documents/UTILITIES_AND_HOOKS.md`
- Architecture changes â†’ `insightLLM_frontend_2.0/Documents/FRONTEND_DOCUMENTATION.md`

### Step 5: Update "Last Updated" Date
At the bottom of the documentation file, update:
```markdown
**Last Updated**: [Current Date]
```

### Step 6: Commit Together
Commit documentation along with code changes:
```bash
git add .
git commit -m "feat: Add new feature

- Implemented new feature
- Updated documentation
- Added usage examples"
```

---

## ðŸ“ Quick Reference

### What to Document

#### Always Document:
- âœ… New API endpoints
- âœ… New components
- âœ… New utilities/hooks
- âœ… Bug fixes
- âœ… New features
- âœ… Refactoring
- âœ… Performance optimizations
- âœ… Breaking changes
- âœ… Configuration changes

#### Don't Need Full Documentation:
- Minor typo fixes
- Formatting changes
- Comment-only changes

---

## ðŸŽ¯ Examples

### Example 1: Adding a New Component

1. **Code**: Create `src/components/new-component.tsx`
2. **Template**: Use component template from `DOCUMENTATION_TEMPLATE.md`
3. **Update**: Add to `COMPONENTS_DOCUMENTATION.md`
4. **Commit**: Include both code and documentation

### Example 2: Adding a New API Route

1. **Code**: Create `src/app/api/new-route/route.ts`
2. **Template**: Use API route template from `DOCUMENTATION_TEMPLATE.md`
3. **Update**: Add to `API_ROUTES_DOCUMENTATION.md`
4. **Commit**: Include both code and documentation

### Example 3: Fixing a Bug

1. **Code**: Fix the bug
2. **Template**: Use bug fix template
3. **Update**: Add to relevant documentation file
4. **Commit**: Include both fix and documentation

---

## âš ï¸ Important Notes

### Documentation Quality Standards

1. **Be Specific**: Include file paths, function names, and code examples
2. **Explain Why**: Not just what changed, but why
3. **Include Examples**: Code examples help understanding
4. **Cross-Reference**: Link to related documentation
5. **Keep It Updated**: Update docs when code changes

### Common Mistakes to Avoid

- âŒ Forgetting to document changes
- âŒ Vague descriptions ("fixed bug")
- âŒ Missing code examples
- âŒ Not updating "Last Updated" date
- âŒ Documenting in wrong file
- âŒ Incomplete template sections

---

## ðŸ” Finding the Right Template

### Frontend Templates
Location: `insightLLM_frontend_2.0/Documents/DOCUMENTATION_TEMPLATE.md`

Templates available:
- Component Change Template
- API Route Change Template
- Utility/Hook Change Template
- State Management Change Template
- Bug Fix Template
- Feature Addition Template
- Refactoring Template
- Performance Optimization Template

---

## ðŸ“ž Need Help?

### Can't Find the Right Template?
- Check the template files for all available options
- Use the most similar template and adapt it
- Ask for help if unsure

### Not Sure What to Document?
- When in doubt, document it
- Better to over-document than under-document
- Review similar changes in existing documentation

### Documentation Review
- Code reviews should include documentation review
- Ensure documentation matches implementation
- Check for completeness and clarity

---

## âœ… Success Criteria

Good documentation should:
- âœ… Allow a new developer to understand the change
- âœ… Include code examples
- âœ… Explain the "why" not just the "what"
- âœ… Be easy to find and navigate
- âœ… Stay up-to-date with code

---

## ðŸŽ“ Remember

**Documentation is not optional - it's part of the code.**

Just like you wouldn't commit code without tests (when applicable), don't commit code without documentation.

---

**Last Updated**: 2024



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\DOCUMENTATION_SUMMARY.md

# Documentation Summary

This document summarizes the comprehensive documentation that has been created for the Rubrik AI frontend codebase.

---

## ðŸ“‹ What Was Documented

### 1. Main Architecture Documentation
**File**: `FRONTEND_DOCUMENTATION.md`

Comprehensive overview covering:
- Project structure and organization
- Technology stack and dependencies
- Routing system and route protection
- State management (Zustand & Context)
- Authentication flow (Clerk + Supabase)
- Styling and theming system
- Error handling patterns
- Development guidelines and best practices

### 2. Component Documentation
**File**: `COMPONENTS_DOCUMENTATION.md`

Detailed documentation for **all 60+ components** organized by category:
- **Chat Provider Components** (13 components)
  - Chat interface, message rendering, editor, TTS/STT, sharing, etc.
- **Header Components** (8 components)
  - Navigation, user menu, usage display, Pro modal, etc.
- **Sidebar Components** (5 components)
  - Sidebar, chat list, theme toggle, hamburger menu
- **Input Prompt Components** (2 components)
  - Input field, action buttons
- **Landing Components** (3 components)
  - Rotating images, FAQ, animated backgrounds
- **UI Components** (9 base components)
  - Buttons, cards, badges, alerts, sheets, loaders, etc.
- **Dev Components** (9 custom components)
  - Enhanced buttons, modals, drawers, inputs, toasts, etc.
- **Other Components** (10+ components)
  - Navigation, error boundary, OCR components, etc.

Each component includes:
- Purpose and location
- Props interface
- Features list
- Usage examples
- Dependencies

### 3. API Routes Documentation
**File**: `API_ROUTES_DOCUMENTATION.md`

Complete documentation for **all API endpoints**:

- **Chat API** (`/api/chat/*`)
  - Main chat endpoint with streaming
  - Usage statistics
  - Limit checking
- **OCR API** (`/api/ocr/*`)
  - File upload and evaluation
  - Usage recording
  - Limit checking
- **Pro Subscription API** (`/api/pro/*`)
  - Status checking
  - Key verification
- **Other APIs**
  - Genres, user management, LLM proxy, quiz endpoints

Each route includes:
- Purpose and authentication requirements
- Request/response formats
- Error handling
- Usage examples
- Database operations

### 4. Utilities & Hooks Documentation
**File**: `UTILITIES_AND_HOOKS.md`

Documentation for:
- **Utility Functions**
  - Database utilities (`db.ts`)
  - Usage tracking (`usage-tracking.ts`)
  - OCR API helpers (`ocr-api.ts`)
  - PDF utilities (`pdf-utils.ts`)
  - Theme providers
  - And more...
- **Custom Hooks**
  - `useProAccess` - Pro subscription management
  - `useSidebarData` - Sidebar data fetching
- **State Management**
  - Zustand store (`insight-zustand.ts`) - Complete state interface
  - React Context (`SidebarContext.tsx`)
- **Type Definitions**
  - All TypeScript types and interfaces

### 5. Documentation Template
**File**: `DOCUMENTATION_TEMPLATE.md`

Templates and guidelines for documenting future changes:
- Component change template
- API route change template
- Bug fix template
- Feature addition template
- Refactoring template
- Performance optimization template
- Documentation update template

Includes checklists and best practices.

### 6. Documentation Index
**File**: `Documents/DOCUMENTS_INDEX.md`

Quick reference guide with:
- Links to all documentation
- Quick start guide
- Finding information guide
- Documentation standards

---

## ðŸ“ File Structure

```
insightLLM_frontend_2.0/
â”œâ”€â”€ Documents/
â”‚   â”œâ”€â”€ DOCUMENTS_INDEX.md                 # Documentation index
â”‚   â”œâ”€â”€ FRONTEND_DOCUMENTATION.md          # Main architecture (80+ sections)
â”‚   â”œâ”€â”€ COMPONENTS_DOCUMENTATION.md        # All components (60+ components)
â”‚   â”œâ”€â”€ API_ROUTES_DOCUMENTATION.md        # All API routes (10+ endpoints)
â”‚   â”œâ”€â”€ UTILITIES_AND_HOOKS.md             # Utilities & hooks
â”‚   â”œâ”€â”€ DOCUMENTATION_TEMPLATE.md          # Templates for future changes
â”‚   â””â”€â”€ DOCUMENTATION_SUMMARY.md           # This file
â””â”€â”€ README.md                              # Updated with docs links
```

---

## ðŸŽ¯ How to Use This Documentation

### For New Developers
1. **Start Here**: Read `Documents/DOCUMENTS_INDEX.md` for overview
2. **Architecture**: Read `FRONTEND_DOCUMENTATION.md` to understand the system
3. **Components**: Use `COMPONENTS_DOCUMENTATION.md` as a reference when working with components
4. **APIs**: Check `API_ROUTES_DOCUMENTATION.md` when working with backend
5. **Utilities**: Refer to `UTILITIES_AND_HOOKS.md` for helper functions

### For Making Changes
1. **Before Coding**: Review relevant documentation sections
2. **While Coding**: Follow patterns and examples from docs
3. **After Coding**: Use `DOCUMENTATION_TEMPLATE.md` to document changes
4. **Update Docs**: Update relevant documentation files
5. **Commit**: Include documentation updates in your commit

### For Debugging
1. **Component Issues**: Check `COMPONENTS_DOCUMENTATION.md` for component details
2. **API Errors**: Review `API_ROUTES_DOCUMENTATION.md` for endpoint details
3. **State Problems**: See `UTILITIES_AND_HOOKS.md` for state management
4. **Architecture Questions**: Refer to `FRONTEND_DOCUMENTATION.md`

---

## âœ… Documentation Coverage

### Fully Documented âœ…
- âœ… All components (60+)
- âœ… All API routes (10+)
- âœ… All utilities and hooks
- âœ… State management
- âœ… Project structure
- âœ… Routing system
- âœ… Authentication flow
- âœ… Error handling
- âœ… Development guidelines

### Documentation Quality
- âœ… Clear descriptions
- âœ… Code examples
- âœ… Type definitions
- âœ… Usage examples
- âœ… File locations
- âœ… Dependencies listed
- âœ… Best practices included

---

## ðŸ”„ Keeping Documentation Updated

### When to Update
- âœ… Adding new components
- âœ… Modifying existing components
- âœ… Adding new API routes
- âœ… Changing API behavior
- âœ… Adding utilities/hooks
- âœ… Changing state management
- âœ… Fixing bugs
- âœ… Adding features

### How to Update
1. Use templates from `DOCUMENTATION_TEMPLATE.md`
2. Follow the existing documentation style
3. Include code examples
4. Update "Last Updated" dates
5. Cross-reference related docs
6. Commit docs with code changes

### Documentation Standards
- âœ… Use clear, descriptive language
- âœ… Include file paths
- âœ… Provide code examples
- âœ… Explain "why" not just "what"
- âœ… Keep it concise but complete
- âœ… Use consistent formatting

---

## ðŸ“Š Documentation Statistics

- **Total Documentation Files**: 7
- **Total Pages**: ~50+ pages of documentation
- **Components Documented**: 60+
- **API Routes Documented**: 10+
- **Utilities Documented**: 15+
- **Hooks Documented**: 2
- **Templates Provided**: 8+

---

## ðŸš€ Benefits

### For Developers
- âœ… Faster onboarding for new team members
- âœ… Quick reference for components and APIs
- âœ… Clear understanding of architecture
- âœ… Reduced debugging time
- âœ… Consistent code patterns

### For the Project
- âœ… Better code maintainability
- âœ… Easier bug tracking and fixing
- âœ… Clearer project structure
- âœ… Reduced technical debt
- âœ… Improved collaboration

### For Future Development
- âœ… Templates for documenting changes
- âœ… Standards for code documentation
- âœ… Guidelines for best practices
- âœ… Examples to follow
- âœ… Knowledge preservation

---

## ðŸ“ Next Steps

### Immediate Actions
1. âœ… Review the documentation structure
2. âœ… Familiarize yourself with the documentation files
3. âœ… Bookmark frequently used sections
4. âœ… Share with team members

### Ongoing Maintenance
1. Update documentation when making changes
2. Use templates for consistency
3. Review documentation during code reviews
4. Keep "Last Updated" dates current
5. Add examples for complex features

### Future Enhancements
- Add diagrams for architecture
- Include video tutorials
- Add interactive examples
- Create component storybook
- Add API testing examples

---

## ðŸŽ“ Learning Resources

### Documentation Files
- Start with `Documents/DOCUMENTS_INDEX.md` for navigation
- Read `FRONTEND_DOCUMENTATION.md` for architecture
- Use `COMPONENTS_DOCUMENTATION.md` as reference
- Check `API_ROUTES_DOCUMENTATION.md` for APIs
- Review `UTILITIES_AND_HOOKS.md` for helpers

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

## âœ¨ Summary

The frontend codebase is now **fully documented** with:
- âœ… Comprehensive architecture documentation
- âœ… Complete component reference (60+ components)
- âœ… Full API documentation (10+ routes)
- âœ… Utilities and hooks reference
- âœ… Templates for future documentation
- âœ… Quick reference guides

**All changes going forward should be documented using the provided templates to maintain this comprehensive documentation standard.**

---

**Documentation Created**: 2024
**Last Updated**: 2024
**Maintained By**: Development Team

---

**Remember**: Good documentation is an investment. Keep it updated! ðŸ“šâœ¨



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\DOCUMENTATION_TEMPLATE.md

# Documentation Template for Future Changes

This template should be used whenever making changes to the frontend codebase. Follow this structure to ensure all changes are properly documented.

---

## Change Documentation Template

### Basic Information
```markdown
## Change: [Brief Description]

**Date**: [YYYY-MM-DD]
**Author**: [Your Name]
**Type**: [Feature/ Bug Fix/ Refactor/ Performance/ Documentation]
**Files Changed**: [List of files]
**Related Issues/PRs**: [Issue numbers or PR links]
```

### Detailed Description
```markdown
### What Changed?
[Describe what was changed and why]

### Why Was This Change Needed?
[Explain the problem or requirement that led to this change]

### How Does It Work?
[Explain the implementation approach]

### Breaking Changes
[If any, list breaking changes and migration steps]

### Testing
[Describe how to test the changes]
```

---

## Component Change Template

When adding or modifying a component:

```markdown
## Component: [ComponentName]

**Location**: `src/components/[path]/[ComponentName].tsx`

### Purpose
[What does this component do?]

### Props
```typescript
interface Props {
  // List all props with types and descriptions
}
```

### Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

### State Management
[Describe any state management used (Zustand, Context, local state)]

### Dependencies
[List key dependencies and why they're needed]

### Usage Example
```tsx
<ComponentName prop1={value1} prop2={value2} />
```

### Notes
[Any important notes, gotchas, or future improvements]
```

---

## API Route Change Template

When adding or modifying an API route:

```markdown
## API Route: [Method] /api/[route]

**Location**: `src/app/api/[route]/route.ts`

### Purpose
[What does this endpoint do?]

### Authentication
[Required/Optional - describe auth requirements]

### Request
**Method**: [GET/POST/PUT/DELETE]
**Body**:
```typescript
{
  // Request body structure
}
```

**Query Parameters**:
- `param1`: [Description]
- `param2`: [Description]

### Response
**Success (200)**:
```typescript
{
  success: true;
  // Response structure
}
```

**Error Responses**:
- `400`: [Description]
- `401`: [Description]
- `500`: [Description]

### Features
- [Feature 1]
- [Feature 2]

### Database Operations
[Describe any database queries or RPC calls]

### Error Handling
[Describe error handling approach]

### Usage Example
```typescript
const response = await fetch('/api/route', {
  method: 'POST',
  body: JSON.stringify({ ... })
});
```
```

---

## Utility/Hook Change Template

When adding or modifying utilities or hooks:

```markdown
## Utility/Hook: [Name]

**Location**: `src/utils/[name].ts` or `src/hooks/[name].ts`

### Purpose
[What does this utility/hook do?]

### Parameters
```typescript
function utilityName(param1: Type, param2: Type): ReturnType {
  // ...
}
```

### Return Value
[Describe return value]

### Features
- [Feature 1]
- [Feature 2]

### Usage Example
```typescript
import { utilityName } from '@/utils/utility';

const result = utilityName(arg1, arg2);
```

### Notes
[Any important notes]
```

---

## State Management Change Template

When modifying Zustand store or Context:

```markdown
## State Change: [Store/Context Name]

**Location**: `src/utils/[store].ts` or `src/context/[Context].tsx`

### What Changed?
[Describe the state change]

### New State Properties
```typescript
{
  newProperty: Type;  // Description
}
```

### New Actions
```typescript
setNewProperty: (value: Type) => void;  // Description
```

### Migration Notes
[If existing code needs updates, describe migration steps]

### Usage
```typescript
const { newProperty, setNewProperty } = useStore();
```
```

---

## Bug Fix Template

When fixing a bug:

```markdown
## Bug Fix: [Bug Description]

**Date**: [YYYY-MM-DD]
**Issue**: [Issue number or description]

### Problem
[Describe the bug and its symptoms]

### Root Cause
[Explain what caused the bug]

### Solution
[Describe how the bug was fixed]

### Files Changed
- `file1.tsx`: [What was changed]
- `file2.ts`: [What was changed]

### Testing
[How to verify the fix works]

### Prevention
[How to prevent similar bugs in the future]
```

---

## Feature Addition Template

When adding a new feature:

```markdown
## Feature: [Feature Name]

**Date**: [YYYY-MM-DD]
**Status**: [In Progress/Completed]

### Description
[Describe the feature]

### User Story
[As a [user type], I want [goal] so that [benefit]]

### Implementation
[Describe the implementation approach]

### Components Added/Modified
- `Component1.tsx`: [Purpose]
- `Component2.tsx`: [Purpose]

### API Routes Added/Modified
- `POST /api/route`: [Purpose]

### State Management
[Describe any new state or context]

### UI/UX Changes
[Describe visual or interaction changes]

### Testing
[How to test the feature]

### Future Improvements
[Planned enhancements or known limitations]
```

---

## Refactoring Template

When refactoring code:

```markdown
## Refactor: [What Was Refactored]

**Date**: [YYYY-MM-DD]
**Reason**: [Why was this refactored?]

### Before
[Describe the old implementation]

### After
[Describe the new implementation]

### Benefits
- [Benefit 1]
- [Benefit 2]

### Breaking Changes
[If any, list them]

### Migration Guide
[If needed, provide migration steps]
```

---

## Performance Optimization Template

When optimizing performance:

```markdown
## Performance: [Optimization Description]

**Date**: [YYYY-MM-DD]
**Impact**: [High/Medium/Low]

### Problem
[Describe the performance issue]

### Solution
[Describe the optimization]

### Metrics
- **Before**: [Metrics]
- **After**: [Metrics]
- **Improvement**: [Percentage or description]

### Changes Made
[Files and specific changes]

### Testing
[How to verify the improvement]
```

---

## Documentation Update Template

When updating documentation:

```markdown
## Documentation: [What Was Updated]

**Date**: [YYYY-MM-DD]

### Files Updated
- `Documents/file.md`: [What was added/changed]

### Reason
[Why was documentation updated?]

### Changes
[Describe the changes made to documentation]
```

---

## Checklist for All Changes

Before committing changes, ensure:

- [ ] Code follows project style guidelines
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Loading states are handled
- [ ] Component is responsive (if UI change)
- [ ] Accessibility considerations (if UI change)
- [ ] Documentation is updated
- [ ] Comments explain complex logic
- [ ] No console.logs left in production code
- [ ] Environment variables are documented (if new ones added)
- [ ] Breaking changes are documented
- [ ] Migration guide provided (if needed)

---

## How to Use This Template

1. **Copy the relevant template** for your change type
2. **Fill in all sections** with relevant information
3. **Add the documentation** to the appropriate file:
   - Component changes â†’ Update `COMPONENTS_DOCUMENTATION.md`
   - API changes â†’ Update `API_ROUTES_DOCUMENTATION.md`
   - New features â†’ Add to `FRONTEND_DOCUMENTATION.md` or create new doc
4. **Commit documentation** along with code changes
5. **Update "Last Updated"** date in main documentation files

---

## Documentation File Structure

```
Documents/
â”œâ”€â”€ FRONTEND_DOCUMENTATION.md      # Main overview and architecture
â”œâ”€â”€ COMPONENTS_DOCUMENTATION.md     # All components
â”œâ”€â”€ API_ROUTES_DOCUMENTATION.md     # All API routes
â”œâ”€â”€ DOCUMENTATION_TEMPLATE.md       # This file
â””â”€â”€ [feature-name].md              # Feature-specific docs (if needed)
```

---

## Best Practices

1. **Document as you code**: Don't wait until the end
2. **Be specific**: Include code examples and file paths
3. **Explain why**: Not just what, but why decisions were made
4. **Keep it updated**: Update docs when code changes
5. **Use clear language**: Write for developers who aren't familiar with the code
6. **Include examples**: Code examples help understanding
7. **Link related docs**: Cross-reference related documentation
8. **Version information**: Note when changes were made

---

**Remember**: Good documentation saves time in the future and helps prevent bugs!



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\DOCUMENTS_INDEX.md

# Frontend Documentation Index

Welcome to the Rubrik AI Frontend documentation! This directory contains comprehensive documentation for the entire frontend codebase.

---

## ðŸ“š Documentation Files

### Main Documentation

- **[FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md)** - Complete overview of the frontend architecture, structure, routing, authentication, and development guidelines.

### Component Documentation

- [COMPONENTS_DOCUMENTATION.md](./COMPONENTS_DOCUMENTATION.md)- Detailed documentation for all React components organized by category (chat, header, sidebar, UI, etc.).

### API Documentation

- **[API_ROUTES_DOCUMENTATION.md](./API_ROUTES_DOCUMENTATION.md)** - Complete documentation for all Next.js API routes, including request/response formats, authentication, and error handling.

### Utilities & Hooks

- **[UTILITIES_AND_HOOKS.md](./UTILITIES_AND_HOOKS.md)** - Documentation for utility functions, custom React hooks, and state management.

### Documentation Guide

- **[DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md)** - **â­ START HERE** - Complete guide on how to document changes (mandatory process).
- **[QUICK_DOCUMENTATION_REFERENCE.md](./QUICK_DOCUMENTATION_REFERENCE.md)** - One-page quick reference for documenting changes.
- **[DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)** - Templates and guidelines for documenting future changes to the codebase.

### Implementation Documentation

#### Async Background Jobs & Progress Tracking

- **[ASYNC_JOBS_FRONTEND_IMPLEMENTATION.md](./ASYNC_JOBS_FRONTEND_IMPLEMENTATION.md)** - Complete frontend implementation of async background jobs and progress tracking - âœ… Completed

---

## ðŸš€ Quick Start

### For New Developers

1. Start with **[FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md)** to understand the overall architecture
2. Review **[COMPONENTS_DOCUMENTATION.md](./COMPONENTS_DOCUMENTATION.md)** to learn about available components
3. Check **[API_ROUTES_DOCUMENTATION.md](./API_ROUTES_DOCUMENTATION.md)** to understand API endpoints
4. Read **[UTILITIES_AND_HOOKS.md](./UTILITIES_AND_HOOKS.md)** for utility functions and hooks

### For Making Changes

1. **â­ READ FIRST**: [DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md) - Complete documentation workflow
2. **Quick Reference**: [QUICK_DOCUMENTATION_REFERENCE.md](./QUICK_DOCUMENTATION_REFERENCE.md) - One-page guide
3. Use the appropriate template from [DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)
4. Update relevant documentation files
5. Commit documentation along with code changes

**âš ï¸ IMPORTANT**: Documentation is now mandatory for all code changes!

---

## ðŸ“– Documentation Structure

```
Documents/
â”œâ”€â”€ DOCUMENTS_INDEX.md                 # This file - documentation index
â”œâ”€â”€ FRONTEND_DOCUMENTATION.md          # Main architecture and overview
â”œâ”€â”€ COMPONENTS_DOCUMENTATION.md        # All components
â”œâ”€â”€ API_ROUTES_DOCUMENTATION.md        # All API routes
â”œâ”€â”€ UTILITIES_AND_HOOKS.md             # Utilities and hooks
â”œâ”€â”€ DOCUMENTATION_TEMPLATE.md          # Templates for future changes
â””â”€â”€ DOCUMENTATION_SUMMARY.md           # Documentation summary
```

---

## ðŸ” Finding Information

### I want to know about...

- **Project structure** â†’ [FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md#project-structure)
- **How routing works** â†’ [FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md#routing)
- **A specific component** â†’ [COMPONENTS_DOCUMENTATION.md](./COMPONENTS_DOCUMENTATION.md)
- **API endpoints** â†’ [API_ROUTES_DOCUMENTATION.md](./API_ROUTES_DOCUMENTATION.md)
- **State management** â†’ [UTILITIES_AND_HOOKS.md](./UTILITIES_AND_HOOKS.md#state-management)
- **How to document changes** â†’ [DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)

---

## ðŸ“ Documentation Standards

### When to Update Documentation

- âœ… Adding a new component
- âœ… Modifying an existing component
- âœ… Adding a new API route
- âœ… Changing API route behavior
- âœ… Adding new utilities or hooks
- âœ… Changing state management
- âœ… Fixing bugs (document the fix)
- âœ… Adding features (document the feature)

### Documentation Checklist

- [ ] Code follows project style
- [ ] TypeScript types are defined
- [ ] Error handling is documented
- [ ] Usage examples are provided
- [ ] Related files are cross-referenced
- [ ] "Last Updated" date is set

---

## ðŸ› ï¸ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Zustand, React Context
- **Authentication**: Clerk
- **Database**: Supabase
- **Animations**: Framer Motion

---

## ðŸ“ž Getting Help

### Common Issues

1. **Can't find a component?** â†’ Check [COMPONENTS_DOCUMENTATION.md](./COMPONENTS_DOCUMENTATION.md)
2. **API route not working?** â†’ Check [API_ROUTES_DOCUMENTATION.md](./API_ROUTES_DOCUMENTATION.md)
3. **State management question?** â†’ Check [UTILITIES_AND_HOOKS.md](./UTILITIES_AND_HOOKS.md#state-management)
4. **How to document changes?** â†’ Check [DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)

### Still Need Help?

- Review the main [README.md](../README.md) in the project root
- Check the code comments in the relevant files
- Review the component/API implementation

---

## ðŸ”„ Keeping Documentation Updated

### Best Practices

1. **Document as you code** - Don't wait until the end
2. **Update docs with code** - Commit documentation with code changes
3. **Be specific** - Include file paths, code examples, and clear descriptions
4. **Explain why** - Not just what, but why decisions were made
5. **Use templates** - Follow the templates in [DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)

### Review Process

1. Code review should include documentation review
2. Ensure documentation matches implementation
3. Update "Last Updated" dates
4. Cross-reference related documentation

---

## ðŸ“… Documentation History

- **2024**: Initial comprehensive documentation created
- All documentation files include "Last Updated" dates

---

## ðŸŽ¯ Quick Reference

### Component Categories

- **Chat Provider Components**: Chat interface, messages, editor
- **Header Components**: Navigation, user menu, usage display
- **Sidebar Components**: Chat list, navigation, theme toggle
- **Input Prompt Components**: User input, actions
- **Landing Components**: Homepage components
- **UI Components**: Base UI components (buttons, cards, etc.)
- **Dev Components**: Custom reusable components

### API Route Categories

- **Chat API**: `/api/chat/*` - Chat and LLM interactions
- **OCR API**: `/api/ocr/*` - OCR evaluation endpoints
- **Pro API**: `/api/pro/*` - Subscription management
- **Other API**: Genres, user management, etc.

### Key Utilities

- **db.ts**: Database/Supabase utilities
- **usage-tracking.ts**: Usage tracking functions
- **ocr-api.ts**: OCR API helpers
- **insight-zustand.ts**: Global state store

---

**Remember**: Good documentation is an investment in the future. Keep it updated! ðŸ“šâœ¨


---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\FEEDBACK_FEATURE_PLAN.md

# Feedback Feature - Implementation Plan

## ðŸ“‹ Table of Contents

1. [Overview](#overview)
2. [Feature Requirements](#feature-requirements)
3. [Architecture & Design](#architecture--design)
4. [Implementation Plan](#implementation-plan)
5. [Technical Specifications](#technical-specifications)
6. [Improvements & Enhancements](#improvements--enhancements)
7. [What to Remove/Simplify](#what-to-removesimplify)
8. [File Structure](#file-structure)
9. [API Documentation](#api-documentation)
10. [Testing Considerations](#testing-considerations)
11. [Future Enhancements](#future-enhancements)

---

## Overview

### Feature Description
A global feedback system that allows users to submit feedback from any page in the application. The feature includes:

- **Floating Feedback Button**: A persistent red circular button with the edit-list icon, positioned at the bottom-right of all pages
- **Feedback Modal**: A popup dialog that appears when the button is clicked, containing a text input area
- **Backend Integration**: API endpoint that receives feedback and optionally integrates with Google Forms/Sheets
- **User Experience**: Smooth animations, loading states, and success/error notifications

### Goals
- Collect user feedback easily and unobtrusively
- Improve product based on user input
- Track common issues and feature requests
- Maintain a clean, accessible UI

---

## Feature Requirements

### Functional Requirements

1. **Floating Button**
   - Visible on all pages (global component)
   - Fixed position: bottom-right corner
   - Red circular background with white icon
   - Hover and click animations
   - Accessible (ARIA labels)

2. **Feedback Modal**
   - Opens when button is clicked
   - Centered on screen with backdrop
   - Contains:
     - Title: "Share Your Feedback"
     - Textarea for feedback input
     - Character counter (max 1000 characters)
     - Cancel button (closes modal, resets form)
     - Send button (submits feedback)
   - Loading state during submission
   - Closes after successful submission

3. **Backend API**
   - Endpoint: `POST /api/feedback/submit` or `/feedback/submit`
   - Accepts feedback message and metadata
   - Validates input
   - Rate limiting (prevent spam)
   - Stores feedback in database
   - Optional: Sends to Google Forms/Sheets

4. **User Feedback**
   - Success notification after submission
   - Error handling with user-friendly messages
   - Form validation (non-empty, max length)

### Non-Functional Requirements

- **Performance**: Modal opens instantly (< 200ms)
- **Accessibility**: Keyboard navigation, screen reader support
- **Responsive**: Works on mobile and desktop
- **Security**: Rate limiting, input sanitization
- **Reliability**: Graceful error handling

---

## Architecture & Design

### Frontend Architecture

```
Root Layout (layout.tsx)
  â””â”€â”€ FeedbackButton (global component)
       â””â”€â”€ FeedbackModal (popup)
            â””â”€â”€ API Call (feedback-api.ts)
```

### Backend Architecture

```
FastAPI Router
  â””â”€â”€ /feedback/submit
       â”œâ”€â”€ Validation
       â”œâ”€â”€ Rate Limiting
       â”œâ”€â”€ Database Storage
       â””â”€â”€ Google Forms/Sheets Integration (optional)
```

### Data Flow

```
User clicks button
  â†’ Modal opens
  â†’ User types feedback
  â†’ User clicks "Send"
  â†’ Frontend validates
  â†’ API call to backend
  â†’ Backend validates & rate limits
  â†’ Backend stores in database
  â†’ Backend sends to Google Forms (optional)
  â†’ Success response
  â†’ Frontend shows success toast
  â†’ Modal closes
```

---

## Implementation Plan

### Phase 1: Frontend Components

#### 1.1 Create FeedbackButton Component
- **Location**: `src/components/feedback/FeedbackButton.tsx`
- **Features**:
  - Floating button with SVG icon
  - Framer Motion animations
  - Fixed positioning (bottom-right)
  - Click handler to open modal

#### 1.2 Create FeedbackModal Component
- **Location**: `src/components/feedback/FeedbackModal.tsx`
- **Features**:
  - Uses existing `DevModal` component
  - Textarea with character counter
  - Cancel and Send buttons
  - Loading state
  - Form validation

#### 1.3 Create API Utility
- **Location**: `src/utils/feedback-api.ts`
- **Features**:
  - `submitFeedback()` function
  - Error handling
  - TypeScript interfaces

#### 1.4 Integrate into Root Layout
- **Location**: `src/app/layout.tsx`
- **Action**: Add `<FeedbackButton />` component

### Phase 2: Backend API

#### 2.1 Create Feedback Route
- **Location**: `backend/api/routes/feedback.py`
- **Features**:
  - Pydantic models for request/response
  - Validation logic
  - Rate limiting middleware
  - Database storage function

#### 2.2 Database Schema (if needed)
- **Location**: `backend/migrations/` or Supabase
- **Table**: `feedback` or `user_feedback`
- **Columns**:
  - `id` (UUID, primary key)
  - `user_id` (string, nullable)
  - `user_email` (string, nullable)
  - `message` (text)
  - `page_url` (string, nullable)
  - `category` (string, default: 'general')
  - `created_at` (timestamp)
  - `status` (string, default: 'pending')

#### 2.3 Google Forms/Sheets Integration (Optional)
- **Location**: `backend/utils/google_forms.py` or `backend/utils/google_sheets.py`
- **Features**:
  - Google Forms API client
  - Or Google Sheets API client
  - Error handling and retries

#### 2.4 Register Route in Main App
- **Location**: `backend/main.py`
- **Action**: Add `app.include_router(feedback.router)`

### Phase 3: Testing & Refinement

- Test on different screen sizes
- Test error scenarios
- Test rate limiting
- Test with/without authentication
- Performance testing

---

## Technical Specifications

### Frontend Components

#### FeedbackButton.tsx

```typescript
// Key features:
- Fixed position: bottom-6 right-6
- z-index: 999 (below modals)
- Size: 56px (w-14 h-14)
- Background: red-500, hover: red-600
- Icon: edit-list-icon.svg (24x24, white)
- Animations: scale on hover/tap
```

#### FeedbackModal.tsx

```typescript
// Key features:
- Uses DevModal component
- Textarea: min-h-[150px], maxLength: 1000
- Character counter display
- Cancel button: outline variant
- Send button: red-500 background
- Loading state: disabled inputs + loader
- Form validation: non-empty, max length
```

#### feedback-api.ts

```typescript
// API function signature:
async function submitFeedback(data: {
  message: string;
  userId?: string;
  userEmail?: string;
  pageUrl?: string;
  category?: string;
}): Promise<{ success: boolean; message: string }>
```

### Backend API

#### Request Model

```python
class FeedbackRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    userId: Optional[str] = None
    userEmail: Optional[str] = None
    pageUrl: Optional[str] = None
    category: Optional[str] = "general"  # bug, feature, general, question
```

#### Response Model

```python
class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: Optional[str] = None
```

#### Endpoint

```python
@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackRequest,
    background_tasks: BackgroundTasks
):
    # Implementation
```

### Environment Variables

#### Backend (.env)
```bash
# Google Forms/Sheets (optional)
GOOGLE_FORMS_URL=<form_url>
GOOGLE_SHEETS_ID=<spreadsheet_id>
GOOGLE_SERVICE_ACCOUNT_KEY=<json_key_path>

# Rate Limiting
FEEDBACK_RATE_LIMIT_PER_HOUR=3
FEEDBACK_RATE_LIMIT_PER_DAY=10
```

---

## Improvements & Enhancements

### Recommended Additions

1. **User Context & Metadata**
   - âœ… User ID (if authenticated)
   - âœ… User email (if authenticated)
   - âœ… Page URL where feedback was submitted
   - âœ… Timestamp
   - âœ… User agent / browser info
   - âœ… Feedback category selector (Bug, Feature, Question, General)

2. **Rate Limiting & Spam Prevention**
   - âœ… Backend rate limiting (3 per hour per user/IP)
   - âœ… Frontend: disable button after submission
   - âš ï¸ Optional: CAPTCHA for unauthenticated users (if spam becomes an issue)

3. **Better UX**
   - âœ… Character counter (500-1000 chars recommended)
   - âœ… Loading state during submission
   - âœ… Success/error toast notifications (using existing DevToast)
   - âš ï¸ Optional: Auto-save draft to localStorage
   - âœ… Feedback type/category selector

4. **Google Forms Integration Options**
   - **Option A**: Google Forms API (direct submission)
   - **Option B**: Google Sheets API (append rows)
   - **Option C**: Webhook/Email service
   - **Option D**: Store in database only (recommended for analytics)

5. **Analytics & Tracking**
   - Track feedback volume over time
   - Identify common issues/requests
   - Optional: Follow-up email capability
   - Dashboard for viewing feedback

### UI/UX Enhancements

- **Smooth Animations**: Use Framer Motion for modal open/close
- **Accessibility**: ARIA labels, keyboard navigation (ESC to close)
- **Mobile Optimization**: Responsive modal sizing
- **Visual Feedback**: Button pulse animation when new feedback is encouraged
- **Thank You Message**: Brief success message before closing

---

## What to Remove/Simplify

### Simplifications

1. **Google Forms Dependency** (Consider Alternatives)
   - **Current Plan**: Direct Google Forms integration
   - **Simpler Alternative**: Store in database (Supabase) only
   - **Why**: More control, easier analytics, no external dependencies
   - **Recommendation**: Start with database storage, add Google Forms later if needed

2. **Browser Alert** â†’ **Toast Notification**
   - âŒ Remove: `window.alert("Feedback sent!")`
   - âœ… Use: Existing `DevToast` component
   - **Why**: Better UX, non-blocking, matches app design

3. **Cancel Button** (Keep)
   - âœ… Keep: Standard UX pattern
   - **Functionality**: Closes modal, resets form

### Optional Removals (Future)

- Remove Google Forms if database storage proves sufficient
- Simplify category selector if not needed initially
- Remove auto-save if not used

---

## File Structure

### Frontend Files

```
insightLLM_frontend_2.0/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â””â”€â”€ layout.tsx                    # Add FeedbackButton here
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â””â”€â”€ feedback/                    # New directory
â”‚   â”‚       â”œâ”€â”€ FeedbackButton.tsx       # Floating button component
â”‚   â”‚       â””â”€â”€ FeedbackModal.tsx        # Modal component
â”‚   â””â”€â”€ utils/
â”‚       â””â”€â”€ feedback-api.ts              # API utility function
â””â”€â”€ public/
    â””â”€â”€ assets/
        â””â”€â”€ edit-list-icon.svg           # Already exists
```

### Backend Files

```
insightLLM_backend/
â””â”€â”€ backend/
    â”œâ”€â”€ api/
    â”‚   â””â”€â”€ routes/
    â”‚       â””â”€â”€ feedback.py              # New feedback route
    â”œâ”€â”€ utils/
    â”‚   â””â”€â”€ google_forms.py              # Optional: Google Forms integration
    â””â”€â”€ main.py                           # Register feedback router
```

---

## API Documentation

### Endpoint: `POST /feedback/submit`

#### Request

**URL**: `{BACKEND_URL}/feedback/submit`

**Method**: `POST`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <token> (optional, for authenticated users)
```

**Body**:
```json
{
  "message": "The OCR feature is great but could use better error messages.",
  "userId": "user_123",                    // Optional
  "userEmail": "user@example.com",        // Optional
  "pageUrl": "https://rubric.pk/app/ocr", // Optional
  "category": "feature"                   // Optional: "bug", "feature", "question", "general"
}
```

#### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "feedback_id": "uuid-here"
}
```

**Error (400 - Validation)**:
```json
{
  "success": false,
  "message": "Feedback message is required",
  "error": "validation_error"
}
```

**Error (429 - Rate Limited)**:
```json
{
  "success": false,
  "message": "Too many feedback submissions. Please try again later.",
  "error": "rate_limit_exceeded",
  "retry_after": 3600
}
```

**Error (500 - Server Error)**:
```json
{
  "success": false,
  "message": "Failed to submit feedback. Please try again.",
  "error": "server_error"
}
```

---

## Testing Considerations

### Unit Tests

- **Frontend**:
  - FeedbackButton renders correctly
  - FeedbackModal opens/closes
  - Form validation works
  - Character counter updates
  - API call with correct payload

- **Backend**:
  - Request validation
  - Rate limiting logic
  - Database storage
  - Error handling

### Integration Tests

- Full flow: Button click â†’ Modal open â†’ Submit â†’ API call â†’ Success
- Error scenarios: Network failure, validation errors, rate limiting
- Authentication: With/without user context

### Manual Testing Checklist

- [ ] Button appears on all pages
- [ ] Button is clickable and opens modal
- [ ] Modal displays correctly on mobile and desktop
- [ ] Character counter works
- [ ] Cancel button closes modal and resets form
- [ ] Send button validates input
- [ ] Loading state shows during submission
- [ ] Success toast appears after submission
- [ ] Error handling works (network errors, validation)
- [ ] Rate limiting prevents spam
- [ ] Keyboard navigation works (ESC to close)
- [ ] Screen reader accessibility

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Feedback Dashboard**
   - Admin panel to view all feedback
   - Filter by category, date, user
   - Mark as resolved/archived

2. **Email Notifications**
   - Auto-email to admins on new feedback
   - Optional: Confirmation email to user

3. **Feedback Categories**
   - Visual category selector in modal
   - Icons for each category
   - Color-coded tags

4. **Rich Text Support**
   - Markdown support in feedback
   - Image attachments (optional)

5. **Follow-up System**
   - Ability to respond to feedback
   - User notification when feedback is addressed

6. **Analytics**
   - Feedback volume trends
   - Most common categories
   - User satisfaction metrics

7. **A/B Testing**
   - Test different button positions
   - Test different modal designs
   - Optimize conversion rate

---

## Implementation Checklist

### Frontend
- [ ] Create `FeedbackButton.tsx` component
- [ ] Create `FeedbackModal.tsx` component
- [ ] Create `feedback-api.ts` utility
- [ ] Add FeedbackButton to root layout
- [ ] Test on mobile and desktop
- [ ] Add accessibility features
- [ ] Style with Tailwind CSS

### Backend
- [ ] Create `feedback.py` route file
- [ ] Define Pydantic models
- [ ] Implement validation logic
- [ ] Add rate limiting
- [ ] Set up database storage (Supabase)
- [ ] Optional: Google Forms/Sheets integration
- [ ] Register route in `main.py`
- [ ] Add error handling and logging

### Testing
- [ ] Unit tests for components
- [ ] Integration tests for API
- [ ] Manual testing checklist
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing

### Documentation
- [ ] Update API documentation
- [ ] Add component documentation
- [ ] Update README if needed

---

## Notes

- **Icon**: The `edit-list-icon.svg` is already available in `public/assets/`
- **Modal Component**: Reuse existing `DevModal` component for consistency
- **Toast Component**: Use existing `DevToast` from `insight-zustand`
- **Authentication**: Feedback works for both authenticated and unauthenticated users
- **Rate Limiting**: Start with 3 submissions per hour, adjust based on usage
- **Database**: Use Supabase for storage (already integrated in project)

---

## Questions & Decisions Needed

1. **Google Forms Integration**: 
   - Do we need Google Forms, or is database storage sufficient?
   - If Google Forms, should we use Forms API or Sheets API?

2. **Rate Limiting**:
   - What limits are appropriate? (Suggested: 3/hour, 10/day)

3. **Feedback Categories**:
   - Should we include category selector in MVP or add later?

4. **Admin Dashboard**:
   - Do we need a feedback viewing interface, or is database query sufficient for now?

5. **Email Notifications**:
   - Should admins be notified immediately, or is periodic review acceptable?

---

## Conclusion

This feedback feature provides a simple, unobtrusive way for users to share their thoughts and report issues. The implementation is straightforward and can be extended with additional features as needed. The modular design allows for easy customization and future enhancements.

**Recommended Approach**: Start with MVP (database storage only), then add Google Forms integration and other enhancements based on actual usage and needs.



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\FRONTEND_DOCUMENTATION.md

# Frontend Documentation - Rubrik AI

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Routing](#routing)
6. [State Management](#state-management)
7. [Authentication](#authentication)
8. [Components](#components)
9. [API Routes](#api-routes)
10. [Utilities & Helpers](#utilities--helpers)
11. [Styling & Theming](#styling--theming)
12. [Error Handling](#error-handling)
13. [Development Guidelines](#development-guidelines)

---

## Project Overview

**Rubrik AI** is an AI-powered essay evaluation and feedback platform for CSS exam preparation. The frontend is built with Next.js 14 (App Router), TypeScript, and React, providing a modern, responsive user interface for:

- AI-powered essay/subject question evaluations
- MCQ practice questions
- Chat functionality (coming soon)
- User authentication and subscription management
- Usage tracking and analytics

---

## Architecture

### Framework
- **Next.js 14** with App Router
- **React 18.3.1** with TypeScript
- **Server Components** for initial page loads
- **Client Components** for interactive features

### Key Architectural Patterns
1. **Component-Based Architecture**: Modular, reusable components organized by feature
2. **Server/Client Separation**: Server components for data fetching, client components for interactivity
3. **State Management**: Zustand for global state, React Context for sidebar state
4. **API Routes**: Next.js API routes for backend communication
5. **Middleware**: Route protection and authentication handling

---

## Technology Stack

### Core Dependencies
- **Next.js 14.2.25**: React framework with App Router
- **React 18.3.1**: UI library
- **TypeScript 5**: Type safety
- **Tailwind CSS 3.4.1**: Utility-first CSS framework

### Authentication
- **@clerk/nextjs 6.32.0**: Authentication and user management

### State Management
- **zustand 4.5.4**: Lightweight state management
- **React Context**: Sidebar state management

### UI Libraries
- **framer-motion 11.2.13**: Animations
- **lucide-react 0.545.0**: Icon library
- **radix-ui**: Accessible UI primitives
- **next-themes 0.3.0**: Dark/light theme support

### Data & API
- **@supabase/supabase-js 2.79.0**: Database client
- **@supabase/ssr 0.7.0**: Server-side Supabase
- **axios 1.7.2**: HTTP client
- **openai 6.8.1**: OpenAI API integration

### Rich Text & Code
- **@tiptap/react 2.4.0**: Rich text editor
- **react-markdown 9.1.0**: Markdown rendering
- **highlight.js 11.10.0**: Syntax highlighting

### Other Utilities
- **nanoid 5.0.7**: Unique ID generation
- **tiktoken 1.0.22**: Token counting
- **sonner 1.5.0**: Toast notifications

---

## Project Structure

```
insightLLM_frontend_2.0/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/                    # Next.js App Router pages
â”‚   â”‚   â”œâ”€â”€ (routes)/           # Route groups
â”‚   â”‚   â”‚   â””â”€â”€ (general)/
â”‚   â”‚   â”‚       â””â”€â”€ app/        # Main app routes
â”‚   â”‚   â”‚           â”œâ”€â”€ [chat]/ # Dynamic chat route
â”‚   â”‚   â”‚           â”œâ”€â”€ ocr/    # OCR evaluation page
â”‚   â”‚   â”‚           â”œâ”€â”€ quiz/   # MCQ quiz page
â”‚   â”‚   â”‚           â””â”€â”€ ...
â”‚   â”‚   â”œâ”€â”€ api/                # API routes
â”‚   â”‚   â”‚   â”œâ”€â”€ chat/          # Chat API endpoints
â”‚   â”‚   â”‚   â”œâ”€â”€ ocr/           # OCR API endpoints
â”‚   â”‚   â”‚   â”œâ”€â”€ pro/           # Pro subscription API
â”‚   â”‚   â”‚   â””â”€â”€ ...
â”‚   â”‚   â”œâ”€â”€ layout.tsx         # Root layout
â”‚   â”‚   â”œâ”€â”€ page.tsx           # Landing page
â”‚   â”‚   â””â”€â”€ globals.css        # Global styles
â”‚   â”‚
â”‚   â”œâ”€â”€ components/             # React components
â”‚   â”‚   â”œâ”€â”€ chat-provider-components/  # Chat-related components
â”‚   â”‚   â”œâ”€â”€ header-components/         # Header/navbar components
â”‚   â”‚   â”œâ”€â”€ sidebar-components/       # Sidebar components
â”‚   â”‚   â”œâ”€â”€ input-prompt-components/  # Input/prompt components
â”‚   â”‚   â”œâ”€â”€ landing-components/       # Landing page components
â”‚   â”‚   â”œâ”€â”€ prompt-gallery-components/ # Prompt gallery components
â”‚   â”‚   â”œâ”€â”€ dev-components/            # Custom UI components
â”‚   â”‚   â”œâ”€â”€ ui/                        # Base UI components
â”‚   â”‚   â””â”€â”€ temp-components/           # Temporary/experimental components
â”‚   â”‚
â”‚   â”œâ”€â”€ context/                # React Context providers
â”‚   â”‚   â””â”€â”€ SidebarContext.tsx
â”‚   â”‚
â”‚   â”œâ”€â”€ hooks/                  # Custom React hooks
â”‚   â”‚   â”œâ”€â”€ useProAccess.ts
â”‚   â”‚   â””â”€â”€ useSidebarData.ts
â”‚   â”‚
â”‚   â”œâ”€â”€ lib/                    # Library utilities
â”‚   â”‚   â””â”€â”€ utils.ts           # Utility functions (cn, etc.)
â”‚   â”‚
â”‚   â”œâ”€â”€ types/                  # TypeScript type definitions
â”‚   â”‚   â”œâ”€â”€ types.ts           # Application types
â”‚   â”‚   â””â”€â”€ database.types.ts  # Supabase database types
â”‚   â”‚
â”‚   â”œâ”€â”€ utils/                  # Utility functions
â”‚   â”‚   â”œâ”€â”€ insight-zustand.ts # Zustand store
â”‚   â”‚   â”œâ”€â”€ db.ts              # Database utilities
â”‚   â”‚   â”œâ”€â”€ usage-tracking.ts  # Usage tracking utilities
â”‚   â”‚   â”œâ”€â”€ ocr-api.ts         # OCR API utilities
â”‚   â”‚   â””â”€â”€ ...
â”‚   â”‚
â”‚   â”œâ”€â”€ actions/                # Server actions
â”‚   â”‚   â””â”€â”€ actions.ts          # Server-side functions
â”‚   â”‚
â”‚   â”œâ”€â”€ db/                     # Database migrations
â”‚   â”‚   â””â”€â”€ migrations/        # SQL migration files
â”‚   â”‚
â”‚   â””â”€â”€ middleware.ts           # Next.js middleware
â”‚
â”œâ”€â”€ public/                     # Static assets
â”‚   â””â”€â”€ assets/                # Images, icons, etc.
â”‚
â”œâ”€â”€ Documents/                  # Documentation
â”‚   â””â”€â”€ FRONTEND_DOCUMENTATION.md
â”‚
â””â”€â”€ package.json               # Dependencies and scripts
```

---

## Routing

### Route Structure

#### Public Routes
- `/` - Landing page (home)
- `/sign-in` - Sign in page (Clerk)
- `/sign-up` - Sign up page (Clerk)
- `/api/*` - API routes (public endpoints)

#### Protected Routes (Require Authentication)
- `/app` - Main chat interface
- `/app/[chat]` - Individual chat conversation
- `/app/ocr` - OCR evaluation page
- `/app/quiz` - MCQ quiz page
- `/app/prompt-gallery` - Prompt gallery
- `/app/help` - Help page

### Route Protection
Route protection is handled in `src/middleware.ts`:
- Uses Clerk middleware for authentication
- Public routes are explicitly defined
- Unauthenticated users are redirected to `/` with `auth=required` query param
- Original destination is preserved in `from` query param

### Dynamic Routes
- `/app/[chat]` - Dynamic route for individual chat conversations
  - `chat` parameter is the chat ID
  - Fetches chat history from Supabase
  - Renders chat messages and input interface

---

## State Management

### Zustand Store (`src/utils/insight-zustand.ts`)

The main global state store using Zustand:

#### State Properties
- `msgLoader`: Boolean - Controls message loading state
- `prevChat`: Message - Previous chat message
- `topLoader`: Boolean - Top navigation loader state
- `currChat`: Message - Current chat message
- `optimisticResponse`: string | null - Optimistic UI response
- `optimisticPrompt`: string | null - Optimistic prompt
- `devToast`: string | null - Toast message
- `inputImgName`: string | null - Input image name
- `customPrompt`: {prompt, placeholder} - Custom prompt configuration
- `geminiApiKey`: string | null - User's Gemini API key
- `selectedGenre`: string - Selected genre/category
- `availableGenres`: string[] - Available genres list
- `autoSend`: boolean - Auto-send flag
- `conversationID`: string | null - Current conversation ID

#### Usage Example
```typescript
import insightZustand from "@/utils/insight-zustand";

// In component
const { msgLoader, setMsgLoader, currChat, setCurrChat } = insightZustand();
```

### React Context

#### SidebarContext (`src/context/SidebarContext.tsx`)
Manages sidebar state (open/closed, chat list, etc.)

---

## Authentication

### Clerk Integration
- **Provider**: `ClerkProvider` wraps the app in `layout.tsx`
- **Middleware**: `src/middleware.ts` handles route protection
- **User Data**: Accessed via `@clerk/nextjs` hooks and server functions
- **Supabase Sync**: `EnsureSupabaseUser` component syncs Clerk users to Supabase

### User Flow
1. User signs in/up via Clerk
2. `EnsureSupabaseUser` component ensures user exists in Supabase
3. User data is available throughout the app via Clerk hooks
4. Protected routes check authentication via middleware

### Key Components
- `EnsureSupabaseUser.tsx`: Syncs Clerk â†’ Supabase user
- `ProfileMenu.tsx`: User profile dropdown
- `signin-now.tsx`: Sign-in prompt component

---

## Components

### Component Organization

Components are organized by feature/functionality:

#### Chat Provider Components (`components/chat-provider-components/`)
- `chat-provider.tsx`: Main chat interface with editor
- `optimistic-chat.tsx`: Optimistic UI for chat messages
- `msg-loader.tsx`: Loading state for messages
- `MarkdownRenderer.tsx`: Renders markdown content
- `code-block.tsx`: Code block with syntax highlighting
- `text-to-speech.tsx`: Text-to-speech functionality
- `speech-to-text.tsx`: Speech-to-text input
- `share-chat.tsx`: Share chat functionality
- `modify-response.tsx`: Modify AI response
- `chat-actions-btns.tsx`: Chat action buttons
- `EditorShell.tsx`: Rich text editor wrapper
- `set-conversation-id.tsx`: Sets conversation ID in state

#### Header Components (`components/header-components/`)
- `header.tsx`: Main header/navbar
- `insight-logo.tsx`: Logo component
- `ProfileMenu.tsx`: User profile dropdown
- `usage-display.tsx`: Displays user usage stats
- `pro-access-modal.tsx`: Pro subscription modal (renewal UI disabled)
- `custom-apikey.tsx`: Pro status display (renewal button disabled)
- `renewal-notification-banner.tsx`: Expiry notification banner (disabled)
- `signin-now.tsx`: Sign-in prompt
- `top-loader.tsx`: Top navigation loader

#### Sidebar Components (`components/sidebar-components/`)
- `sidebar.tsx`: Main sidebar component
- `sidebar-wrapper.tsx`: Sidebar wrapper with state
- `sidebar-chat-list.tsx`: Chat list in sidebar
- `theme-switch.tsx`: Dark/light theme toggle
- `right-hamburger-menu.tsx`: Mobile hamburger menu

#### Input Prompt Components (`components/input-prompt-components/`)
- `input-prompt.tsx`: Main input component for prompts
- `input-actions.tsx`: Input action buttons

#### Landing Components (`components/landing-components/`)
- `RotatingImages.tsx`: Rotating image carousel
- `FAQ.tsx`: FAQ accordion component
- `animated-background.tsx`: Animated background effects

#### UI Components (`components/ui/`)
Base UI components (shadcn/ui style):
- `button.tsx`: Button component
- `card.tsx`: Card component
- `badge.tsx`: Badge component
- `alert.tsx`: Alert component
- `sheet.tsx`: Sheet/drawer component
- `loading-state.tsx`: Loading spinner
- `typewriter-effect.tsx`: Typewriter animation
- `glass-monolith.tsx`: Glass morphism effect
- `neon-wave-background.tsx`: Neon wave animation

#### Dev Components (`components/dev-components/`)
Custom reusable components:
- `dev-button.tsx`: Enhanced button
- `dev-modal.tsx`: Modal component
- `dev-drawer.tsx`: Drawer component
- `dev-input.tsx`: Input component
- `dev-toast.tsx`: Toast notification
- `dev-popover.tsx`: Popover component
- `dev-emoji-picker.tsx`: Emoji picker
- `react-tooltip.tsx`: Tooltip component
- `sleek-toggle.tsx`: Toggle switch

#### Other Components
- `NavigationWrapper.tsx`: Conditionally renders Navbar or RightNavbar
- `Navbar.tsx`: Standard navbar
- `RightNavbar.tsx`: Right-aligned navbar for chat pages
- `ErrorBoundary.tsx`: Error boundary for error handling
- `Footer.tsx`: Footer component
- `OCRUpload.tsx`: OCR file upload component
- `OCRCard.tsx`: OCR result card
- `usage-dashboard.tsx`: Usage statistics dashboard

---

## API Routes

### Chat API (`/api/chat/`)

#### `POST /api/chat/route.ts`
- **Purpose**: Main chat endpoint for LLM interactions
- **Authentication**: Required (Clerk)
- **Request Body**: `{ messages: Array<{role, content}> }`
- **Response**: Streaming text response
- **Features**:
  - Uses OpenAI GPT-4
  - Records usage (input/output tokens)
  - Checks monthly limits
  - Returns 429 if limit exceeded

#### `GET /api/chat/usage/route.ts`
- **Purpose**: Get user's chat usage statistics
- **Authentication**: Required
- **Response**: `{ success, usage, limits }`

#### `GET /api/chat/check-limit/route.ts`
- **Purpose**: Check if user has reached usage limit
- **Authentication**: Required
- **Response**: `{ success, hasLimit, remaining }`

### OCR API (`/api/ocr/`)

#### `POST /api/ocr/record-usage/route.ts`
- **Purpose**: Record OCR evaluation usage
- **Authentication**: Required
- **Request Body**: `{ userId, fileSize, etc. }`
- **Response**: `{ success }`

#### `GET /api/ocr/check-limit/route.ts`
- **Purpose**: Check OCR usage limits
- **Authentication**: Required
- **Response**: `{ success, hasLimit, remaining }`

### Pro Subscription API (`/api/pro/`)

#### `GET /api/pro/status/route.ts`
- **Purpose**: Get user's Pro subscription status
- **Authentication**: Required
- **Response**: `{ success, isPro, expiryDate }`

#### `POST /api/pro/verify-key/route.ts`
- **Purpose**: Verify and activate Pro subscription key (supports renewals)
- **Authentication**: Required
- **Request Body**: `{ key }`
- **Response (New Activation)**: `{ success, message, isRenewal: false, expiryDate, durationDays }`
- **Response (Renewal)**: `{ success, message, isRenewal: true, oldExpiryDate, expiryDate, durationAddedDays, wasCapped, expiryCapWarning, maxExpiryMonths }`
- **Features**: 
  - Automatically extends active subscriptions instead of blocking
  - Preserves usage on renewal (no reset)
  - Applies 12-month expiry cap (safety guardrail)
  - Pre-validates expiry cap before database call
  - Returns detailed renewal information for UI display
  - See `SUBSCRIPTION_RENEWAL_IMPLEMENTATION.md` for detailed documentation

### Other API Routes

#### `GET /api/genres/route.ts`
- **Purpose**: Get available genres/categories
- **Response**: `{ success, genres }`

#### `POST /api/ensure-user/route.ts`
- **Purpose**: Ensure user exists in Supabase
- **Authentication**: Required
- **Response**: `{ success }`

#### `POST /api/llm/route.ts`
- **Purpose**: LLM proxy endpoint (legacy/alternative)
- **Authentication**: Required

---

## Utilities & Helpers

### Database Utilities (`src/utils/db.ts`)
- Supabase client initialization
- Database query helpers
- User data fetching

### Usage Tracking (`src/utils/usage-tracking.ts`)
- Track user usage (tokens, OCR evaluations)
- Check limits
- Get usage statistics

### OCR API (`src/utils/ocr-api.ts`)
- OCR file upload
- OCR evaluation API calls
- Result processing

### Other Utilities
- `lib/utils.ts`: Utility functions (cn for className merging)
- `utils/theme-providers.tsx`: Theme provider setup
- `utils/prev-chat-initializer.tsx`: Initialize previous chat
- `utils/pdf-utils.ts`: PDF processing utilities
- `utils/supabase-genres.ts`: Genre management
- `utils/shadow.ts`: Shadow DOM utilities

### Custom Hooks

#### `useProAccess.ts`
- Checks Pro subscription status
- Renewal functionality disabled (UI components commented out)
- Manages Pro access state
- Provides Pro access state and methods

#### `useSidebarData.ts`
- Fetches sidebar data (chat list, etc.)
- Manages sidebar state

---

## Styling & Theming

### Tailwind CSS
- Utility-first CSS framework
- Custom configuration in `tailwind.config.ts`
- Custom animations and utilities

### Theme System
- **next-themes**: Dark/light mode support
- Theme provider in `utils/theme-providers.tsx`
- Theme toggle in sidebar
- CSS variables for theming

### Global Styles
- `app/globals.css`: Global CSS and Tailwind directives
- Custom CSS variables for colors
- Selection styles
- Responsive breakpoints

### Component Styling
- Tailwind utility classes
- CSS modules (if needed)
- Styled-components (for shadow DOM)
- Inline styles for animations

---

## Error Handling

### Error Boundary
- `ErrorBoundary.tsx`: Catches React errors
- Displays error UI
- Prevents app crashes

### API Error Handling
- Try-catch blocks in API routes
- Proper HTTP status codes
- Error messages in responses
- Client-side error handling

### User Feedback
- Toast notifications (sonner)
- Error messages in UI
- Loading states
- Retry mechanisms

---

## Development Guidelines

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Component composition
- Clear naming conventions

### File Naming
- Components: PascalCase (e.g., `ChatProvider.tsx`)
- Utilities: kebab-case (e.g., `usage-tracking.ts`)
- Types: kebab-case (e.g., `types.ts`)

### Component Structure
```typescript
// 1. Imports
import React from 'react';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component
export default function Component({ prop }: Props) {
  // 4. Hooks
  // 5. State
  // 6. Effects
  // 7. Handlers
  // 8. Render
  return <div>...</div>;
}
```

### Best Practices
1. **Server Components First**: Use server components when possible
2. **Client Components**: Mark with `"use client"` when needed
3. **Type Safety**: Use TypeScript types consistently
4. **Error Handling**: Always handle errors gracefully
5. **Loading States**: Show loading states for async operations
6. **Accessibility**: Use semantic HTML and ARIA attributes
7. **Performance**: Lazy load heavy components
8. **Documentation**: Document complex logic and components

### Environment Variables
Required environment variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SITE_URL`

---

## Future Improvements

### Planned Features
- AI Chatbot Mentor (coming soon)
- Expert Mentor Meetings (coming soon)
- Enhanced analytics dashboard
- Mobile app support
- Offline mode

### Technical Debt
- Migrate remaining legacy code
- Improve error handling
- Add comprehensive tests
- Performance optimization
- Accessibility improvements

---

## Troubleshooting

### Common Issues

#### Authentication Issues
- Check Clerk configuration
- Verify middleware routes
- Check Supabase user sync

#### API Errors
- Verify environment variables
- Check API route authentication
- Review error logs

#### Styling Issues
- Check Tailwind configuration
- Verify CSS imports
- Check theme provider

#### State Management
- Verify Zustand store updates
- Check component re-renders
- Review state dependencies

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated**: 2024
**Maintained By**: Development Team



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\image-optimization.md

Recommendation: Image optimization and Next.js Image usage

Why
- Large PNG/JPGs increase page weight. Convert to WebP or AVIF for better compression (lossless if you need perfect fidelity).
- Use Next.js <Image> to benefit from automatic responsive sizes, lazy loading, and priority/LCP handling.

Assets to convert (in public/assets)
- gemini-banner.png -> gemini-banner.webp (or .avif)
- gemini-features.png -> gemini-features.webp
- gemini-phone-banner.png -> gemini-phone-banner.webp
- readme-banner.png -> readme-banner.webp
- public/assets/projects-img/*.png -> public/assets/projects-img/*.webp

Notes on conversion (outside codebase)
- Use an image tool (avif/mozjpeg/webp) or an online converter.
- For lossless conversion (no quality loss): use cwebp with -lossless or avifenc with lossless options.
- Example (install libwebp on mac/linux):
  cwebp -lossless public/assets/gemini-banner.png -o public/assets/gemini-banner.webp

Next.js <Image> usage examples

// Critical LCP image (hero/banner)
import Image from "next/image";

<Image
  src="/assets/gemini-banner.webp"
  alt="Banner"
  width={1600}
  height={900}
  priority
  sizes="(max-width: 768px) 100vw, 1200px"
/>

// Non-critical images (default lazy)
<Image
  src="/assets/projects-img/1.webp"
  alt="Project"
  width={600}
  height={400}
  sizes="(max-width: 768px) 100vw, 600px"
/>

Tips
- Only mark one image as priority (the main LCP image).
- Keep other images lazy (default) and provide proper width/height and sizes to reduce CLS.
- If you host images on an external CDN, configure next.config.js accordingly.

Verification
- After converting assets, run a local production build and check Lighthouse/Chrome DevTools for LCP and image savings.



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\QUICK_DOCUMENTATION_REFERENCE.md

# Quick Documentation Reference

A one-page quick reference for documenting changes.

---

## ðŸŽ¯ Where to Document What

### Frontend Changes

| What Changed | Document In |
|-------------|-------------|
| Component | `COMPONENTS_DOCUMENTATION.md` |
| API Route | `API_ROUTES_DOCUMENTATION.md` |
| Utility/Hook | `UTILITIES_AND_HOOKS.md` |
| State Management | `UTILITIES_AND_HOOKS.md` |
| Architecture | `FRONTEND_DOCUMENTATION.md` |
| Bug Fix | Relevant file + note in main doc |
| New Feature | All relevant files |

---

## ðŸ“ Template Location

- **Frontend Templates**: `DOCUMENTATION_TEMPLATE.md`

---

## âœ… Pre-Commit Checklist

- [ ] Code is complete and tested
- [ ] Template is filled out
- [ ] Documentation file is updated
- [ ] "Last Updated" date is set
- [ ] Code examples included
- [ ] Related docs cross-referenced

---

## ðŸš€ Quick Process

1. Make code changes
2. Copy relevant template
3. Fill out template
4. Add to documentation file
5. Update "Last Updated" date
6. Commit together

---

**Remember**: No code changes without documentation! ðŸ“š



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\SUBSCRIPTION_RENEWAL_IMPLEMENTATION.md

# Subscription Renewal Feature Implementation

**Issue:** #8 - Missing Subscription Renewal Feature  
**Date:** December 26, 2024  
**Status:** âš ï¸ **DISABLED** - This feature has been temporarily disabled. The implementation is complete in the codebase but is currently disabled in both frontend and backend. It will be enabled in the future.

---

## Overview

This document details the implementation of subscription renewal functionality, allowing users to extend their active Pro subscriptions before expiration without service interruption.

---

## Implementation Summary

### Changes Made

1. âœ… **Database Function** - Modified `activate_pro_key` to support renewals
2. âœ… **Backend API** - Updated `verify-key` endpoint to allow renewals
3. âœ… **Maximum Expiry Cap** - Added safety guardrail (12 months maximum)
4. âœ… **Frontend UI** - Renewal confirmation UI in modal
5. âœ… **Success Messages** - Different messages for renewals vs activations
6. âœ… **Renewal Audit Trail** - Created `subscription_renewals` table for tracking
7. âœ… **Renewal Prompts/Notifications** - Banner notifications at 7, 3, and 1 days before expiration

---

## Part 1: Database Function Changes

### File: `src/db/migrations/016_add_subscription_renewal_support.sql`

### What Changed

**Before:** Function only handled new activations. Users with active subscriptions were blocked.

**After:** Function detects active subscriptions and extends them instead of blocking.

### Key Changes

#### 1. Added Renewal Detection Logic

```sql
-- Check if user has an active subscription (not expired)
SELECT 
    id,
    expiry_date
INTO existing_key_record
FROM keys
WHERE used_by = user_identifier
AND is_used = true
AND expiry_date > CURRENT_TIMESTAMP
ORDER BY expiry_date DESC
LIMIT 1;
```

**Purpose:** Finds the user's current active subscription key (if any).

**Why:** Determines if this is a renewal (has active subscription) or new activation (no active subscription).

---

#### 2. Renewal Extension Logic

```sql
IF existing_key_record IS NOT NULL THEN
    is_renewal := true;
    current_expiry_date := existing_key_record.expiry_date;
    
    -- Calculate new expiry date: current expiry + duration from new key
    new_expiry_date := current_expiry_date + (duration_days_to_add || ' days')::interval;
```

**Purpose:** Extends existing subscription by adding new key's duration to current expiry.

**Example:**
- Current expiry: January 15, 2025
- New key duration: 30 days
- New expiry: February 14, 2025 (January 15 + 30 days)

**Why:** Seamlessly extends subscription without interruption.

---

#### 3. Maximum Expiry Cap

```sql
-- Apply maximum expiry cap (12 months from today)
max_allowed_expiry := CURRENT_TIMESTAMP + (max_future_expiry_months || ' months')::interval;

-- If calculated expiry exceeds cap, cap it at maximum
IF new_expiry_date > max_allowed_expiry THEN
    new_expiry_date := max_allowed_expiry;
    RAISE NOTICE 'Subscription renewal capped at maximum...';
END IF;
```

**Purpose:** Prevents users from stacking subscriptions indefinitely.

**Example:**
- User has 11 months remaining
- Tries to add 30 days
- Result: Capped at 12 months from today (not 11 months + 30 days)

**Why:** Business rule to limit maximum subscription duration.

---

#### 4. Update Existing Key (Not Create New)

```sql
-- Update existing key's expiry_date to extend subscription
UPDATE keys
SET 
    expiry_date = new_expiry_date,
    updated_at = CURRENT_TIMESTAMP
WHERE id = existing_key_record.id
```

**Purpose:** Updates the existing active key's expiry_date instead of creating a new record.

**Why:**
- Maintains one active subscription per user
- Easier to query and manage
- Preserves subscription history

---

#### 5. Audit Trail

```sql
-- Mark the new key as used (for audit trail)
UPDATE keys
SET 
    is_used = true,
    used_by = user_identifier,
    updated_at = CURRENT_TIMESTAMP
WHERE id = key_id
```

**Purpose:** Marks the renewal key as used so we can track which key was used for renewal.

**Why:** Provides audit trail for support and analytics.

---

#### 6. Preserve Usage on Renewal

```sql
-- For renewals, we do NOT reset usage or create new usage_pro record
-- User keeps their current usage and continues with extended subscription
```

**Purpose:** User keeps their current token/OCR usage when renewing.

**Why:** Renewal extends subscription, not a fresh start. Only new activations reset usage.

---

#### 7. Enhanced Response for Renewals

```sql
RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription extended successfully',
    'is_renewal', true,
    'old_expiry_date', current_expiry_date,
    'new_expiry_date', new_expiry_date,
    'duration_added_days', duration_days_to_add,
    'was_capped', new_expiry_date = max_allowed_expiry
);
```

**Purpose:** Returns detailed information about the renewal.

**Fields:**
- `is_renewal`: Indicates this was a renewal (not new activation)
- `old_expiry_date`: Original expiry before renewal
- `new_expiry_date`: New expiry after renewal
- `duration_added_days`: How many days were added
- `was_capped`: Whether expiry was capped at maximum

**Why:** Frontend needs this information to show appropriate messages.

---

### Backward Compatibility

**New Activations Still Work:**
- If user has no active subscription, function works exactly as before
- Creates `usage_pro` record with 0 usage
- Resets all counters
- Returns activation information

**No Breaking Changes:**
- Existing activation flow unchanged
- Only adds renewal capability
- All existing functionality preserved

---

## Part 3: Frontend UI Changes

### File 1: `src/components/header-components/custom-apikey.tsx`

### What Changed

**Before:** Users with active subscriptions saw a static "Pro Active" button that couldn't be clicked. Modal only opened for users without active subscriptions.

**After:** Users with active subscriptions can click to renew. Added a "Renew Subscription" button and made the modal accessible for renewals.

---

### Change 1: Added Renew Subscription Button

**Location:** Lines 243-270

**What Was Added:**
```typescript
{proStatus.hasAccess ? (
  <div className="space-y-2">
    {/* Pro Active Status Button - Now Clickable */}
    <button onClick={handleProButtonClick} ...>
      <FaBrain />
      Pro Active ({daysLeft}d)
    </button>
    
    {/* Renew Subscription Button */}
    <button onClick={handleProButtonClick} ...>
      <RefreshIcon />
      Renew Subscription
    </button>
  </div>
) : (
  // Try Pro button for non-pro users
)}
```

**What Changed:**
- âœ… Made "Pro Active" button clickable
- âœ… Added dedicated "Renew Subscription" button below status
- âœ… Both buttons open the renewal modal
- âœ… Styled with gradient (indigo to purple) to distinguish from "Try Pro"

**Why:**
- Users need an easy way to renew their subscription
- Prominent button makes renewal discoverable
- Clear call-to-action for extending subscription

---

### Change 2: Removed Modal Access Restriction

**Location:** Line 262 (old condition)

**Before:**
```typescript
{showProModal && !proStatus.hasAccess && (
  // Modal only opened for users without active subscription
)}
```

**After:**
```typescript
{showProModal && (
  // Modal now opens for both new activations and renewals
)}
```

**What Changed:**
- âœ… Removed `!proStatus.hasAccess` condition
- âœ… Modal can now open for users with active subscriptions
- âœ… Modal automatically detects renewal vs new activation

**Why:**
- Enables renewal functionality
- Modal handles both cases automatically
- Better user experience

---

### File 2: `src/components/header-components/pro-access-modal.tsx`

### What Changed

**Before:** Modal only showed payment instructions and key input. No distinction between renewals and new activations.

**After:** Modal detects active subscriptions and shows renewal-specific UI with confirmation details.

---

### Change 1: Pro Status Check on Mount

**Location:** Lines 30-50

**What Was Added:**
```typescript
const [proStatus, setProStatus] = useState<ProStatus | null>(null);
const [checkingStatus, setCheckingStatus] = useState(true);

useEffect(() => {
  const checkProStatus = async () => {
    try {
      const response = await fetch('/api/pro/status', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-cache'
      });
      // ... set proStatus
    } finally {
      setCheckingStatus(false);
    }
  };
  checkProStatus();
}, []);
```

**Purpose:** Checks if user has active subscription when modal opens.

**Why:** Determines if this is a renewal (has active subscription) or new activation (no active subscription).

---

### Change 2: Renewal Confirmation UI

**Location:** Lines 150-200

**What Was Added:**
- Blue info box showing renewal details
- Current expiry date display
- Days remaining display
- Message about preserving usage
- Different button text ("Renew Subscription" vs "Activate")

**Features:**
- Shows current expiry date in readable format
- Displays days remaining
- Explains that usage will be preserved
- Visual distinction from new activation flow

**Why:** Users need to confirm they understand they're renewing, not creating a new subscription.

---

### Change 3: Dynamic Button Text

**Location:** Lines 240-245

**Before:**
```typescript
{loading ? 'Activating...' : 'Activate'}
```

**After:**
```typescript
{loading 
  ? (isRenewal ? 'Renewing...' : 'Activating...') 
  : (isRenewal ? 'Renew Subscription' : 'Activate')
}
```

**Purpose:** Button text reflects whether it's a renewal or new activation.

**Why:** Clear user communication about what action will be performed.

---

### Change 4: Enhanced Success Messages and Feedback

**Location:** Lines 105-200 (success handling), Lines 360-430 (success display UI)

**What Changed:**
- âœ… Added `renewalDetails` state to store API response data
- âœ… Enhanced success message UI with detailed information boxes
- âœ… Different display for renewals vs new activations
- âœ… Sequential toast messages for better user experience
- âœ… Clear visual distinction between old and new expiry dates

**Renewal Success Display:**
```typescript
// Main message
"ðŸŽ‰ Subscription extended successfully!"

// Detailed info box in success message area:
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Previous Expiry: January 15, 2025    â”‚
â”‚ New Expiry: February 14, 2025       â”‚ â† Highlighted
â”‚ Days Added: +30 days                â”‚
â”‚ âš ï¸ Capped at 12 months (if applicable)â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**New Activation Success Display:**
```typescript
// Main message
"ðŸŽ‰ Pro access activated successfully!"

// Info box:
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Expires: January 25, 2025           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Toast Messages:**
- First toast: Detailed message with dates and days added
- Second toast (after 2s): Main success message
- Cap warning toast (if applicable): Shows after detailed message

**Features:**
- Visual comparison of old vs new expiry dates
- Days added calculation displayed prominently
- Cap warnings shown clearly
- Formatted dates for readability
- Color-coded success boxes (green theme)

**Why:**
- Users need clear feedback about what happened
- Detailed information builds trust
- Visual display of dates is easier to understand than text
- Cap warnings need to be prominent
- Sequential messages prevent information overload

---

### Change 5: Loading State

**Location:** Lines 130-140

**What Was Added:**
```typescript
if (checkingStatus) {
  return (
    <div className="w-full max-w-md p-6 bg-background border rounded-lg shadow-lg space-y-4 relative">
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </div>
  );
}
```

**Purpose:** Shows loading spinner while checking pro status.

**Why:** Better UX - prevents showing incorrect UI while status is being fetched.

---

## Part 2: Backend API Changes

### File: `src/app/api/pro/verify-key/route.ts`

### What Changed

**Before:** API blocked users with active subscriptions from activating new keys.

**After:** API allows renewals and returns appropriate messages based on renewal status.

---

### Change 1: Removed Blocking Logic

**Location:** Lines 119-141 (old code)

**Before:**
```typescript
if (existingKey) {
  // ... usage check ...
  if (usageData && usageData.is_pro) {
    // User has active pro key and hasn't exceeded limits
    // Don't allow activation of another key
    return NextResponse.json(
      { success: false, message: "You already have an active pro access..." },
      { status: 400 }
    );
  }
}
```

**After:**
```typescript
// Note: We no longer block users with active subscriptions
// The activate_pro_key function now handles renewals automatically
// It will extend the existing subscription if user has active subscription,
// or create a new activation if user has no active subscription

// Optional: Check if user exceeded limits (for informational purposes only)
if (existingKey) {
  const { data: usageData } = await supabase.rpc('record_usage', {
    p_user_id: supabaseUserId,
    p_input_tokens: 0,
    p_output_tokens: 0
  });
  
  // Log if user exceeded limits (but don't block - allow renewal/activation)
  if (usageData && !usageData.success) {
    console.log(`User ${supabaseUserId} exceeded limits but activation/renewal allowed`);
  }
}
```

**What Changed:**
- âŒ Removed blocking return statement
- âœ… Changed to informational logging only
- âœ… Added comments explaining new behavior

**Why:**
- Database function now handles renewal logic
- API should not block renewals
- Logging helps with debugging

---

### Change 2: Updated Response Handling

**Location:** Lines 222-254 (new code)

**Before:**
```typescript
return NextResponse.json({
  success: true,
  message: "Pro access activated successfully!",
  expiryDate: keyData.expiry_date,
  durationDays: keyData.duration_days
});
```

**After:**
```typescript
// Check if this was a renewal or new activation
const isRenewal = activationResult.is_renewal === true;

if (isRenewal) {
  // This was a renewal - subscription was extended
  return NextResponse.json({
    success: true,
    message: "Subscription extended successfully!",
    isRenewal: true,
    oldExpiryDate: activationResult.old_expiry_date,
    expiryDate: activationResult.new_expiry_date,
    durationAddedDays: activationResult.duration_added_days,
    wasCapped: activationResult.was_capped || false
  });
} else {
  // This was a new activation
  return NextResponse.json({
    success: true,
    message: "Pro access activated successfully!",
    isRenewal: false,
    expiryDate: activationResult.expiry_date || keyData.expiry_date,
    durationDays: activationResult.duration_days || keyData.duration_days
  });
}
```

**What Changed:**
- âœ… Checks `is_renewal` flag from database function
- âœ… Returns different messages for renewals vs activations
- âœ… Includes renewal-specific information (old expiry, new expiry, duration added)
- âœ… Includes `wasCapped` flag for frontend display

**Why:**
- Frontend needs to know if it was a renewal
- Different UI messages for renewals vs activations
- Users should see old and new expiry dates

---

### Change 3: Maximum Expiry Cap (Safety Guardrail)

**Location:** Lines 13-16 (constant), Lines 177-220 (validation logic)

**What Was Added:**
```typescript
// Maximum Expiry Cap Configuration (Safety Guardrail)
const MAX_FUTURE_EXPIRY_MONTHS = 12;
```

**Pre-Validation Logic:**
```typescript
// Pre-validate expiry cap before calling database function
if (existingKey && keyData.duration_days) {
  const currentExpiry = new Date(existingKey.expiry_date);
  const calculatedExpiry = new Date(currentExpiry);
  calculatedExpiry.setDate(calculatedExpiry.getDate() + keyDurationDays);
  
  const maxAllowedExpiry = new Date();
  maxAllowedExpiry.setMonth(maxAllowedExpiry.getMonth() + MAX_FUTURE_EXPIRY_MONTHS);
  
  if (calculatedExpiry > maxAllowedExpiry) {
    wouldExceedCap = true;
    // Log warning and prepare message
    expiryCapWarning = `Note: Your subscription will be capped at ${MAX_FUTURE_EXPIRY_MONTHS} months maximum...`;
  }
}
```

**What Changed:**
- âœ… Added constant for maximum expiry cap (12 months)
- âœ… Pre-validates expiry before calling database function
- âœ… Logs warnings when cap would be exceeded
- âœ… Prepares informative warning messages
- âœ… Includes cap information in response

**Why:**
- Provides early warning to users
- Better user experience with informative messages
- Monitoring and logging for cap enforcement
- Consistent with database function's cap logic

**Response Enhancement:**
```typescript
{
  success: true,
  message: "Subscription extended successfully! Your subscription has been capped at 12 months maximum.",
  wasCapped: true,
  expiryCapWarning: "Note: Your subscription will be capped at 12 months maximum...",
  maxExpiryMonths: 12
}
```

---

### Change 4: Improved Error Handling

**Location:** Lines 197-212

**Before:**
```typescript
if (!activationResult || !activationResult.success) {
  console.error("Activation failed:", activationResult?.message || "Unknown error");
  throw new Error(activationResult?.message || "Failed to activate key");
}
```

**After:**
```typescript
if (!activationResult || !activationResult.success) {
  console.error("Activation failed:", activationResult?.message || "Unknown error");
  return NextResponse.json(
    { 
      success: false, 
      message: activationResult?.message || "Failed to activate key" 
    },
    { status: 400 }
  );
}
```

**What Changed:**
- âœ… Returns proper HTTP response instead of throwing error
- âœ… Uses 400 status code (Bad Request) instead of 500
- âœ… Returns error message from database function

**Why:**
- Better error handling
- Proper HTTP status codes
- User-friendly error messages

---

## API Response Format

### Renewal Response

```typescript
{
  success: true,
  message: "Subscription extended successfully! Your subscription has been capped at 12 months maximum.",
  isRenewal: true,
  oldExpiryDate: "2025-01-15T12:00:00Z",      // Original expiry
  expiryDate: "2025-02-14T12:00:00Z",         // New expiry (extended)
  durationAddedDays: 30,                       // Days added
  wasCapped: true,                             // Whether capped at max
  expiryCapWarning: "Note: Your subscription will be capped at 12 months maximum...", // Warning message
  maxExpiryMonths: 12                          // Maximum allowed months
}
```

### New Activation Response

```typescript
{
  success: true,
  message: "Pro access activated successfully!",
  isRenewal: false,
  expiryDate: "2025-01-25T12:00:00Z",         // Key's expiry date
  durationDays: 30                             // Key duration
}
```

### Error Response

```typescript
{
  success: false,
  message: "Key is invalid, already used, or expired"
}
```

---

## Data Flow

### Renewal Flow

```
1. User with active subscription enters renewal key
   â†“
2. Frontend calls POST /api/pro/verify-key
   â†“
3. API validates key (exists, unused, not expired)
   â†“
4. API calls activate_pro_key(key_id, user_id)
   â†“
5. Database function detects active subscription
   â†“
6. Function extends existing key's expiry_date
   â†“
7. Function marks renewal key as used (audit trail)
   â†“
8. Function returns renewal information
   â†“
9. API returns renewal response to frontend
   â†“
10. Frontend shows "Subscription extended" message
```

### New Activation Flow

```
1. User without subscription enters activation key
   â†“
2. Frontend calls POST /api/pro/verify-key
   â†“
3. API validates key
   â†“
4. API calls activate_pro_key(key_id, user_id)
   â†“
5. Database function detects no active subscription
   â†“
6. Function activates key normally
   â†“
7. Function creates usage_pro record (0 usage)
   â†“
8. Function returns activation information
   â†“
9. API returns activation response to frontend
   â†“
10. Frontend shows "Pro access activated" message
```

---

## Testing

### Test Cases

1. **New Activation**
   - User has no active subscription
   - Activates key
   - âœ… Should create usage_pro record
   - âœ… Should reset all counters to 0
   - âœ… Should return `isRenewal: false`

2. **Simple Renewal**
   - User has active subscription (10 days remaining)
   - Activates 30-day key
   - âœ… Should extend to 40 days total
   - âœ… Should keep current usage
   - âœ… Should return `isRenewal: true`

3. **Renewal with Cap**
   - User has 11 months remaining
   - Activates 30-day key
   - âœ… Should cap at 12 months from today
   - âœ… Should return `wasCapped: true`

4. **Multiple Renewals**
   - User renews multiple times
   - âœ… Each renewal should extend from latest expiry
   - âœ… Cap should apply to final expiry

5. **Error Cases**
   - Invalid key â†’ âœ… Returns error
   - Already used key â†’ âœ… Returns error
   - Expired key â†’ âœ… Returns error

---

## Migration Files

### Up Migration
- **File:** `src/db/migrations/016_add_subscription_renewal_support.sql`
- **Purpose:** Adds renewal support to `activate_pro_key` function

### Down Migration
- **File:** `src/db/migrations/016_add_subscription_renewal_support_DOWN.sql`
- **Purpose:** Reverts function to previous state (removes renewal support)

---

## Configuration

### Maximum Expiry Cap

**Location:** Migration 016, line 34

```sql
max_future_expiry_months integer := 12;  -- Maximum 12 months from today
```

**To Change:**
- Edit the constant in the migration file
- Re-run the migration

**Current Value:** 12 months

---

## Security Considerations

### Function Security

- Uses `SECURITY DEFINER` - runs with elevated privileges
- Only callable by `service_role` and `authenticated` roles
- Validates all inputs before processing

### Key Validation

- Checks key exists and is unused
- Checks key is not expired
- Prevents reuse of keys

### Audit Trail

- All renewal keys marked as used
- Tracks which key was used for renewal
- Maintains history of renewals

---

## Future Enhancements

### Potential Additions

1. **Renewal History Table**
   - Track all renewals with timestamps
   - Store old/new expiry dates
   - Analytics and reporting

2. **Renewal Prompts**
   - Show notifications when subscription expiring soon
   - 7 days, 3 days, 1 day before expiration

3. **Auto-Renewal**
   - Optional auto-renewal for users
   - Automatic extension when enabled

4. **Renewal Discounts**
   - Special pricing for renewals
   - Loyalty rewards

---

## Troubleshooting

### Common Issues

**Issue:** Renewal not working
- **Check:** Migration 016 applied?
- **Check:** Function updated correctly?
- **Check:** User has active subscription?

**Issue:** Expiry not extending
- **Check:** Database function logs
- **Check:** Key duration is correct
- **Check:** Cap not limiting extension?

**Issue:** Usage reset on renewal
- **Check:** Function logic - renewals should NOT reset usage
- **Check:** Only new activations reset usage

---

## Part 4: Renewal Audit Trail

### File: `src/db/migrations/017_add_renewal_audit_trail.sql`

### What Changed

**Before:** Renewals were tracked only by marking keys as used. No dedicated audit trail table.

**After:** Created `subscription_renewals` table to track all renewals with complete history.

---

### Change 1: Created subscription_renewals Table

**Location:** Migration 017, Part 1

**Table Structure:**
```sql
CREATE TABLE public.subscription_renewals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    old_expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    new_expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    key_id UUID NOT NULL,
    duration_added_days INTEGER NOT NULL,
    was_capped BOOLEAN DEFAULT false,
    renewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Provides complete audit trail for all subscription renewals.

**Fields:**
- `user_id`: User who renewed
- `old_expiry_date`: Expiry before renewal
- `new_expiry_date`: Expiry after renewal
- `key_id`: Renewal key used
- `duration_added_days`: Days added
- `was_capped`: Whether capped at maximum
- `renewed_at`: Timestamp of renewal

**Why:**
- Complete history of all renewals
- Analytics and reporting
- Support ticket resolution
- Debugging subscription issues

---

### Change 2: Updated activate_pro_key to Log Renewals

**Location:** Migration 017, Part 3

**What Was Added:**
```sql
-- Log renewal to audit trail
INSERT INTO public.subscription_renewals (
    user_id,
    old_expiry_date,
    new_expiry_date,
    key_id,
    duration_added_days,
    was_capped,
    renewed_at
)
VALUES (
    user_identifier,
    current_expiry_date,
    new_expiry_date,
    key_id,
    duration_days_to_add,
    renewal_was_capped,
    CURRENT_TIMESTAMP
);
```

**Purpose:** Automatically logs every renewal to the audit trail table.

**When:** Executed during renewal path (when `is_renewal = true`).

**Why:**
- Automatic logging - no manual intervention needed
- Complete record of all renewals
- Timestamped for chronological tracking

---

### Change 3: Added Indexes for Performance

**Location:** Migration 017, Part 2

**Indexes Created:**
1. `subscription_renewals_user_id_idx` - For querying user's renewal history
2. `subscription_renewals_key_id_idx` - For querying by key
3. `subscription_renewals_renewed_at_idx` - For date range queries and analytics

**Purpose:** Optimize common query patterns.

**Why:**
- Fast lookups by user
- Efficient date range queries
- Better performance for analytics

---

### Use Cases

**1. User Renewal History:**
```sql
SELECT * FROM subscription_renewals 
WHERE user_id = 'user-uuid'
ORDER BY renewed_at DESC;
```

**2. Analytics:**
```sql
-- Count renewals per user
SELECT user_id, COUNT(*) as renewal_count
FROM subscription_renewals
GROUP BY user_id
ORDER BY renewal_count DESC;
```

**3. Support:**
```sql
-- Get renewal details for support ticket
SELECT 
    sr.*,
    u.email,
    k.key as renewal_key
FROM subscription_renewals sr
JOIN users u ON sr.user_id = u.id
JOIN keys k ON sr.key_id = k.id
WHERE sr.user_id = 'user-uuid'
ORDER BY sr.renewed_at DESC;
```

**4. Business Intelligence:**
```sql
-- Renewals by month
SELECT 
    DATE_TRUNC('month', renewed_at) as month,
    COUNT(*) as renewal_count,
    SUM(duration_added_days) as total_days_added
FROM subscription_renewals
GROUP BY DATE_TRUNC('month', renewed_at)
ORDER BY month DESC;
```

---

## Related Files

- `src/db/migrations/016_add_subscription_renewal_support.sql` - Up migration (renewal support)
- `src/db/migrations/016_add_subscription_renewal_support_DOWN.sql` - Down migration
- `src/db/migrations/016_add_subscription_renewal_support_TESTING_GUIDE.md` - Testing guide
- `src/db/migrations/017_add_renewal_audit_trail.sql` - Up migration (audit trail)
- `src/db/migrations/017_add_renewal_audit_trail_DOWN.sql` - Down migration
- `src/app/api/pro/verify-key/route.ts` - Backend API endpoint
- `src/components/header-components/pro-access-modal.tsx` - Frontend modal with renewal UI
- `src/components/header-components/custom-apikey.tsx` - Renewal button component
- `src/components/header-components/renewal-notification-banner.tsx` - Renewal notification banner
- `src/app/(routes)/(general)/layout.tsx` - Layout with banner integration
- `Documents/ISSUE_8_STEP_BY_STEP_IMPLEMENTATION_GUIDE.md` - Implementation guide

---

**End of Documentation**



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\TEST_ENV_README.md

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

### âœ… Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key

### âš ï¸ Optional Environment Variables
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL (defaults to `http://localhost:8000`)

### ðŸ” Connection Tests

1. **Supabase Service Role Connection**
   - Tests if the service role key can connect to Supabase
   - Verifies basic database access

2. **Supabase Admin API Access**
   - Tests if the service role key has admin permissions
   - Required for user creation and management operations
   - âš ï¸ This is critical for the `/api/ensure-user` endpoint
   - **Note**: If you don't own the Supabase project, you may not have admin access (this is expected)

3. **Supabase Anonymous Key Connection**
   - Tests if the anonymous key can connect
   - Used for client-side operations

4. **Clerk Configuration**
   - Validates key format (publishable keys start with `pk_`, secret keys start with `sk_`)

5. **Backend API Connection**
   - Tests if the backend is accessible
   - âš ï¸ This test will fail if the backend isn't running (which is okay for frontend-only testing)

## Understanding the Results

### âœ… All Tests Pass
Your environment is correctly configured! You can proceed with development.

### âŒ Some Tests Fail

**Missing Environment Variables:**
- Create or update your `.env.local` file
- Make sure all required variables are set

**Supabase Connection Failed:**
- Verify your Supabase URL and keys are correct
- Check Supabase Dashboard â†’ Settings â†’ API
- Make sure you're using the **service_role** key (not anon key) for `SUPABASE_SERVICE_ROLE_KEY`

**Admin API Access Denied:**
- **If you don't own the Supabase project**: This is expected and normal
  - You won't be able to use the `/api/ensure-user` endpoint
  - User creation features will return 500 errors
  - **Solution**: Request admin access from the project owner, or ask them to create users manually
- **If you own the project**: Make sure you're using the correct key
  - The `SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** key (starts with `eyJ...`)
  - The service_role key has admin permissions and can bypass Row Level Security (RLS)
  - Get it from Supabase Dashboard â†’ Settings â†’ API â†’ **service_role** (not anon/public)

**Clerk Configuration Failed:**
- Verify your Clerk keys are correct
- Check Clerk Dashboard â†’ API Keys
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
3. Go to **Settings** â†’ **API**
4. Copy:
   - **Project URL** â†’ `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key â†’ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key â†’ `SUPABASE_SERVICE_ROLE_KEY` âš ï¸ Keep this secret!

### Clerk
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys**
4. Copy:
   - **Publishable key** â†’ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** â†’ `CLERK_SECRET_KEY` âš ï¸ Keep this secret!

## Troubleshooting

### "User not allowed" / "not_admin" Error
This means your `SUPABASE_SERVICE_ROLE_KEY` doesn't have admin permissions. Make sure:
- You're using the **service_role** key (not anon key)
- The key is from Supabase Dashboard â†’ Settings â†’ API â†’ **service_role** (not anon/public)

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
ðŸ” Frontend Environment Configuration Test
============================================================

ðŸ“‹ Checking Required Environment Variables...
âœ“ NEXT_PUBLIC_SUPABASE_URL: Valid
âœ“ SUPABASE_SERVICE_ROLE_KEY: Valid
âœ“ NEXT_PUBLIC_SUPABASE_ANON_KEY: Valid
âœ“ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Valid
âœ“ CLERK_SECRET_KEY: Valid

ðŸ“Š Testing Supabase Connections...
âœ“ Service Role Key: Connection successful
âœ“ Admin API: Access granted
âœ“ Anonymous Key: Connection successful

ðŸ” Testing Clerk Configuration...
âœ“ Clerk keys format validation passed

ðŸ”Œ Testing Backend API Connection...
âš  Backend API: Connection refused (backend may not be running)

âœ… All critical tests passed! Your environment is configured correctly.
```



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\UTILITIES_AND_HOOKS.md

# Utilities and Hooks Documentation

This document provides detailed documentation for all utility functions and custom React hooks.

---

## Table of Contents
1. [Utilities](#utilities)
2. [Custom Hooks](#custom-hooks)
3. [State Management](#state-management)
4. [Type Definitions](#type-definitions)

---

## Utilities

### `lib/utils.ts`
**Location**: `src/lib/utils.ts`

**Purpose**: General utility functions.

#### `cn(...classes)`
Merges Tailwind CSS class names with clsx and tailwind-merge.

**Parameters**:
- `...classes`: Array of class names (strings, objects, arrays)

**Returns**: `string` - Merged class names

**Usage**:
```typescript
import { cn } from '@/lib/utils';

const className = cn(
  'base-class',
  condition && 'conditional-class',
  { 'object-class': isActive }
);
```

---

### `utils/db.ts`
**Location**: `src/utils/db.ts`

**Purpose**: Database utilities and Supabase client helpers.

#### Functions

##### `getSupabaseClient()`
Creates and returns Supabase client instance.

**Returns**: `SupabaseClient`

**Usage**:
```typescript
import { getSupabaseClient } from '@/utils/db';

const supabase = getSupabaseClient();
const { data } = await supabase.from('table').select();
```

##### `getUserByEmail(email: string)`
Gets user from Supabase by email.

**Parameters**:
- `email`: User email address

**Returns**: `Promise<User | null>`

---

### `utils/usage-tracking.ts`
**Location**: `src/utils/usage-tracking.ts`

**Purpose**: Usage tracking utilities for tokens and OCR.

#### Functions

##### `recordUsage(userId: string, inputTokens: number, outputTokens: number)`
Records token usage for a user.

**Parameters**:
- `userId`: Supabase user ID
- `inputTokens`: Number of input tokens
- `outputTokens`: Number of output tokens

**Returns**: `Promise<{ success: boolean; error?: string }>`

**Usage**:
```typescript
import { recordUsage } from '@/utils/usage-tracking';

await recordUsage(userId, 100, 200);
```

##### `checkUsageLimit(userId: string)`
Checks if user has reached usage limit.

**Parameters**:
- `userId`: Supabase user ID

**Returns**: `Promise<{ hasLimit: boolean; remaining: number }>`

##### `getUsageStats(userId: string)`
Gets user's usage statistics.

**Parameters**:
- `userId`: Supabase user ID

**Returns**: `Promise<UsageStats>`

**Usage**:
```typescript
import { getUsageStats } from '@/utils/usage-tracking';

const stats = await getUsageStats(userId);
console.log(stats.tokensUsed, stats.ocrCount);
```

---

### `utils/ocr-api.ts`
**Location**: `src/utils/ocr-api.ts`

**Purpose**: OCR evaluation API utilities with async background job support.

#### Type Definitions

##### `OCRResult`
OCR evaluation result interface with scores, feedback, and metadata.

##### `JobStatus`
Job status interface for async processing (pending, running, completed, failed, cancelled).

##### `ProgressData`
Progress tracking data interface with step information and page-level details.

#### Synchronous Functions (Legacy - Still Available)

##### `annotateDocument(file, userId, subject)`
Upload PDF for OCR annotation and get back both the annotated PDF and metadata (synchronous, blocking).

**Note**: Still available for backward compatibility. New code should use async jobs.

##### `analyzeDocument(file, subject)`
Upload PDF for OCR analysis and get only the metadata (no PDF, synchronous).

**Note**: Still available for backward compatibility.

#### Async Job Functions (Recommended)

##### `submitOCRJob(file, userId, subject)`
Submit an OCR job for background processing. Returns job ID immediately.

**Returns**: `Promise<{ jobId: string; requestId: string }>`

**Features**: Checks OCR limits, records usage, submits job, returns immediately.

##### `getJobStatus(jobId)`
Get status of an OCR job.

**Returns**: `Promise<JobStatus | null>`

**Status Values**: pending, running, completed, failed, cancelled

##### `getProgress(requestId)`
Get real-time progress for an OCR job.

**Returns**: `Promise<ProgressData | null>`

**Progress Data**: Includes progress_percent, step, message, and page-level details.

##### `cancelJob(jobId)`
Cancel a running OCR job.

**Returns**: `Promise<void>`

##### `getJobResult(jobId)`
Get result of a completed OCR job.

**Returns**: `Promise<{ pdfBlob: Blob; metadata: OCRResult }>`

**Recent Changes** (December 2025):
- âœ… Added async job functions for non-blocking processing
- âœ… Added progress tracking support
- âœ… Added job cancellation support
- âœ… Maintained backward compatibility

**See Also**: 
- [Async Jobs Frontend Implementation](./ASYNC_JOBS_FRONTEND_IMPLEMENTATION.md) for detailed documentation

---

##### `checkOCRLimit(userId: string)`
Checks OCR usage limit.

**Parameters**:
- `userId`: Supabase user ID

**Returns**: `Promise<{ canProceed: boolean; remaining: number }>`

---

### `utils/pdf-utils.ts`
**Location**: `src/utils/pdf-utils.ts`

**Purpose**: PDF processing utilities.

#### Functions

##### `processPDF(file: File)`
Processes PDF file for extraction.

**Parameters**:
- `file`: PDF file

**Returns**: `Promise<ProcessedPDF>`

##### `extractTextFromPDF(file: File)`
Extracts text content from PDF.

**Parameters**:
- `file`: PDF file

**Returns**: `Promise<string>`

---

### `utils/supabase-genres.ts`
**Location**: `src/utils/supabase-genres.ts`

**Purpose**: Genre/category management utilities.

#### Functions

##### `getGenres()`
Fetches available genres from API.

**Returns**: `Promise<string[]>`

**Usage**:
```typescript
import { getGenres } from '@/utils/supabase-genres';

const genres = await getGenres();
```

##### `setSelectedGenre(genre: string)`
Sets selected genre in Zustand store.

**Parameters**:
- `genre`: Genre name

---

### `utils/shadow.ts`
**Location**: `src/utils/shadow.ts`

**Purpose**: Shadow DOM utilities for style isolation.

#### Functions

##### `FormatOutput(content: string)`
Formats content in shadow DOM.

**Parameters**:
- `content`: Content to format

**Returns**: `ReactNode`

---

### `utils/theme-providers.tsx`
**Location**: `src/utils/theme-providers.tsx`

**Purpose**: Theme provider setup.

#### `ThemeProviders`
React component that provides theme context.

**Props**:
```typescript
{
  children: React.ReactNode;
}
```

**Usage**:
```tsx
import { ThemeProviders } from '@/utils/theme-providers';

<ThemeProviders>
  {children}
</ThemeProviders>
```

**Features**:
- Dark/light mode support
- Theme persistence
- System preference detection

---

### `utils/prev-chat-initializer.tsx`
**Location**: `src/utils/prev-chat-initializer.tsx`

**Purpose**: Initializes previous chat data.

#### `PrevChatInitializer`
Component that loads and initializes previous chat.

**Props**:
```typescript
{
  chatId: string;
  userId: string;
}
```

**Features**:
- Loads chat history
- Initializes Zustand state
- Handles loading states

---

### `utils/books-utils.ts`
**Location**: `src/utils/books-utils.ts`

**Purpose**: Book-related utilities (if applicable).

---

### `utils/prompts-array.json`
**Location**: `src/utils/prompts-array.json`

**Purpose**: Predefined prompt templates.

**Structure**:
```json
[
  {
    "title": "Prompt Title",
    "prompt": "Prompt text...",
    "category": "Category"
  }
]
```

---

### `utils/emoji.json`
**Location**: `src/utils/emoji.json`

**Purpose**: Emoji data for emoji picker.

---

## Custom Hooks

### `hooks/useProAccess.ts`
**Location**: `src/hooks/useProAccess.ts`

**Purpose**: Hook for managing Pro subscription access.

#### Usage
```typescript
import { useProAccess } from '@/hooks/useProAccess';

function Component() {
  const { isPro, isLoading, checkProStatus, daysLeft } = useProAccess();
  
  if (isLoading) return <Loading />;
  
  return (
    <div>
      {isPro ? (
        <div>Pro User - {daysLeft} days left</div>
      ) : (
        <div>Free User</div>
      )}
    </div>
  );
}
```

#### Return Value
```typescript
{
  isPro: boolean;              // Pro subscription status
  isLoading: boolean;          // Loading state
  daysLeft: number | null;     // Days until expiry
  expiryDate: string | null;    // Expiry date
  checkProStatus: () => Promise<void>;  // Refresh status
  error: string | null;        // Error message
}
```

#### Features
- Fetches Pro status from API
- Caches status in component state
- Provides refresh function
- Handles loading and error states

---

### `hooks/useSidebarData.ts`
**Location**: `src/hooks/useSidebarData.ts`

**Purpose**: Hook for fetching and managing sidebar data (chat list, etc.).

#### Usage
```typescript
import { useSidebarData } from '@/hooks/useSidebarData';

function Sidebar() {
  const { chats, isLoading, error, refresh } = useSidebarData();
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error} />;
  
  return (
    <div>
      {chats.map(chat => (
        <ChatItem key={chat.id} chat={chat} />
      ))}
    </div>
  );
}
```

#### Return Value
```typescript
{
  chats: ConversationProps[];  // Array of conversations
  isLoading: boolean;          // Loading state
  error: string | null;        // Error message
  refresh: () => Promise<void>;  // Refresh data
}
```

#### Features
- Fetches chat list from Supabase
- Handles loading states
- Provides refresh functionality
- Error handling

---

## State Management

### `utils/insight-zustand.ts`
**Location**: `src/utils/insight-zustand.ts`

**Purpose**: Main Zustand store for global application state.

#### State Properties

```typescript
interface GeminiState {
  // Loading states
  msgLoader: boolean;
  topLoader: boolean;
  
  // Chat data
  prevChat: Message;
  currChat: Message;
  
  // Optimistic UI
  optimisticResponse: string | null;
  optimisticPrompt: string | null;
  
  // UI state
  devToast: string | null;
  inputImgName: string | null;
  
  // Custom prompts
  customPrompt: {
    prompt: string | null;
    placeholder: string | null;
  };
  
  // API keys
  geminiApiKey: string | null;
  
  // Genre management
  selectedGenre: string;
  availableGenres: string[];
  
  // Auto-send
  autoSend: boolean;
  
  // Conversation
  conversationID: string | null;
}
```

#### Actions

```typescript
// Setters
setMsgLoader: (msgLoader: boolean) => void;
setTopLoader: (topLoader: boolean) => void;
setPrevChat: (newChat: Message) => void;
setCurrChat: (name: string | null, value: string | null) => void;
setOptimisticResponse: (response: string | null) => void;
setOptimisticPrompt: (prompt: string | null) => void;
setToast: (toast: string | null) => void;
setInputImgName: (name: string | null) => void;
setCustomPrompt: (value: {prompt: string | null, placeholder: string | null}) => void;
setGeminiApiKey: (key: string | null) => void;
setSelectedGenre: (genre: string) => void;
setAvailableGenres: (genres: string[]) => void;
setAutoSend: (autoSend: boolean) => void;
setConversationID: (id: string | null) => void;
```

#### Usage
```typescript
import insightZustand from '@/utils/insight-zustand';

function Component() {
  const { 
    msgLoader, 
    setMsgLoader, 
    currChat, 
    setCurrChat 
  } = insightZustand();
  
  // Use state and setters
}
```

---

### `context/SidebarContext.tsx`
**Location**: `src/context/SidebarContext.tsx`

**Purpose**: React Context for sidebar state management.

#### Provider
```tsx
<SidebarProvider>
  {children}
</SidebarProvider>
```

#### Hook
```typescript
import { useSidebar } from '@/context/SidebarContext';

function Component() {
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar();
  
  return (
    <button onClick={toggleSidebar}>
      {isOpen ? 'Close' : 'Open'} Sidebar
    </button>
  );
}
```

#### Context Value
```typescript
{
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  // ... other sidebar state
}
```

---

## Type Definitions

### `types/types.ts`
**Location**: `src/types/types.ts`

**Purpose**: TypeScript type definitions for the application.

#### Types

##### `Message`
Legacy message type for compatibility.

```typescript
type Message = {
  userPrompt: string;
  llmResponse: string;
  imgName?: string;
}
```

##### `MessageProps`
Updated message type for Supabase schema.

```typescript
type MessageProps = {
  id: string;
  user_prompt: string | null;
  llm_response: string | null;
  img_name: string | null;
  created_at: string;
  updated_at: string;
}
```

##### `ConversationProps`
Conversation/chat type.

```typescript
type ConversationProps = {
  id: string;
  user_id: string;
  chat_id: string;
  title: string | null;
  icon: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}
```

##### `SessionProps`
User session type.

```typescript
type SessionProps = {
  email: string;
  id: string;
  name: string;
  image: string;
}
```

##### `ApiResponse<T>`
Generic API response type.

```typescript
type ApiResponse<T = any> = {
  success: boolean;
  message?: T;
  error?: string;
  conversationID?: string;
}
```

##### `ProAccessState`
Pro subscription state type.

```typescript
type ProAccessState = {
  active: boolean;
  expiryDate?: string;
  durationDays?: number;
}
```

---

### `types/database.types.ts`
**Location**: `src/types/database.types.ts`

**Purpose**: Auto-generated Supabase database types.

**Note**: This file is typically auto-generated by Supabase CLI. Do not manually edit.

---

## Best Practices

### Utility Functions
1. **Pure functions**: Avoid side effects when possible
2. **Type safety**: Use TypeScript types
3. **Error handling**: Handle errors gracefully
4. **Documentation**: Document complex logic
5. **Testing**: Write tests for critical utilities

### Custom Hooks
1. **Single responsibility**: One hook, one purpose
2. **Reusability**: Make hooks reusable
3. **Error handling**: Return error states
4. **Loading states**: Provide loading indicators
5. **Cleanup**: Clean up effects properly

### State Management
1. **Minimal state**: Only store necessary state
2. **Derived state**: Compute from base state when possible
3. **Type safety**: Use TypeScript for state
4. **Performance**: Avoid unnecessary re-renders
5. **Persistence**: Persist important state when needed

---

**Last Updated**: 2024



---

## Source: D:\css_proj\insightLLM_frontend_2.0\Documents\WARP.md

# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project context
- Insight LLM is a Next.js 14 App Router project (TypeScript) that provides an AI chat experience. It uses Clerk for authentication, Supabase for persistence, Zustand for client state, TailwindCSS for styling, and Googleâ€™s Generative AI (Gemini) for LLM features.

Common commands
- Install dependencies (uses npm due to package-lock.json):
  - npm install
- Run the dev server (http://localhost:3000 by default):
  - npm run dev
- Build the app:
  - npm run build
- Start production server (after build):
  - npm run start
- Lint (Next.js ESLint):
  - npm run lint
- Tests: no test runner is configured in this repo (no test scripts or configs found).

Environment and runtime requirements
- Required environment variables (see .env.sample for structure; do not commit secrets):
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  - CLERK_SECRET_KEY
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - NEXT_PUBLIC_API_KEY (Gemini API key)
- Important: src/utils/db.ts throws if any Supabase env vars are missing. Ensure all are set before running dev/build.
- Authentication middleware is enabled via src/middleware.ts (clerkMiddleware). It applies broadly to app routes and API routes per its matcher.

High-level architecture
- Framework and routing
  - Next.js App Router lives under src/app.
  - Route groups organize pages: src/app/(routes)/(general)/app
    - /app (home for signed-in users), /app/[chat] (chat detail).
  - Global providers are composed in src/app/layout.tsx: ClerkProvider (auth) and ThemeProviders (Next Themes) wrap the app, with global styles at src/app/globals.css.
  - next.config.mjs configures remote image domains for Clerk assets.
- Data layer and server actions
  - Supabase is used for persistence. The admin client (bypasses RLS) is created in src/utils/db.ts using SUPABASE_SERVICE_ROLE_KEY; a standard anon client is also exported.
  - Server Actions in src/actions/actions.ts encapsulate all CRUD:
    - createChat: ensures a conversations row exists (by chat_id, user_id), then inserts a messages row.
    - getSidebarChat: lists conversations for a user, projecting to sidebar-friendly shape with pinning and timestamps.
    - getChatHistory: resolves conversation.id, then loads messages ordered by created_at.
    - deleteChat: deletes a conversation for the current user (cascades messages).
    - renameChat: updates title/icon on a conversation for the current user.
    - pinChat: toggles is_pinned on a conversation for the current user.
    - updateResponse: updates llm_response for a specific message id.
  - Implicit DB schema expectations (from code):
    - conversations: id, user_id, chat_id, title, icon, is_pinned, created_at, updated_at
    - messages: id, conversation_id, user_prompt, llm_response, img_name, created_at
- Client state and UI composition
  - State: src/utils/insight-zustand.ts manages UI and chat state (msg loader, optimistic prompt/response, top loader, dev toast, selected image name, custom prompt config, and geminiApiKey sourced from NEXT_PUBLIC_API_KEY).
  - Rich text rendering/editing: src/components/chat-provider-components/chat-provider.tsx uses TipTap with a markdown extension and a custom CodeBlock renderer. It can selectively modify parts of an LLM response by generating edits via Gemini and then persisting them through updateResponse (server action).
  - Auth awareness in routes: pages pull currentUser from @clerk/nextjs/server; unauthenticated users are redirected or shown sign-in prompts depending on route.
  - UI tech: TailwindCSS (tailwind.config.ts, postcss.config.mjs), Framer Motion (micro-animations), Next Themes (dark/light via ThemeProviders), various component groups under src/components (sidebar, header, input prompt, chat provider).
- Path aliases and TypeScript
  - tsconfig.json defines path alias @/* -> src/* for imports across the app.
  - Strict TS settings with noEmit; Next handles type-checking during build.

Notes for future agents
- This project does not currently include a test runner (Jest/Vitest/Cypress/Playwright). If you add one, include scripts in package.json so commands can be surfaced here.
- The presence of .env.sample includes older NextAuth-related variables, but the application code uses Clerk for authentication. Prefer Clerk env vars listed above.


---

## Source: insightLLM_frontend_2.0/src/db/migrations/016_add_subscription_renewal_support_TESTING_GUIDE.md

# Testing Guide: Migration 016 - Subscription Renewal Support

This guide explains how to safely test the subscription renewal migration before applying it to production.

---

## Prerequisites

1. **Access to Supabase Dashboard**
   - Development/staging Supabase project
   - SQL Editor access
   - Ability to create test data

2. **Test Data Setup**
   - Test users in the database
   - Test subscription keys (both unused and used)
   - Active subscriptions for testing renewals

---

## Step 1: Prepare Test Environment

### Option A: Use Supabase Local Development (Recommended)

If you have Supabase CLI set up locally:

```bash
# Start local Supabase
supabase start

# This gives you a local PostgreSQL instance
# Connect to it and test migrations there
```

### Option B: Use Staging/Development Supabase Project

1. Go to your Supabase Dashboard
2. Select your **development/staging project** (NOT production)
3. Navigate to **SQL Editor**

---

## Step 2: Create Test Data

Before testing, create test scenarios:

```sql
-- 1. Create a test user (or use existing)
-- Note: Replace with actual user UUID from your database
DO $$
DECLARE
    test_user_id uuid := 'YOUR_TEST_USER_UUID_HERE';
    active_key_id uuid;
    renewal_key_id uuid;
BEGIN
    -- 2. Create an active subscription key for the user
    INSERT INTO public.keys (
        id,
        key,
        is_used,
        used_by,
        expiry_date,
        duration_days,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'TEST-ACTIVE-KEY-001',
        true,
        test_user_id,
        CURRENT_TIMESTAMP + INTERVAL '10 days',  -- Expires in 10 days
        30,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO active_key_id;
    
    -- 3. Create a renewal key (unused)
    INSERT INTO public.keys (
        id,
        key,
        is_used,
        used_by,
        expiry_date,
        duration_days,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'TEST-RENEWAL-KEY-001',
        false,
        NULL,
        CURRENT_TIMESTAMP + INTERVAL '365 days',  -- Key valid for 1 year
        30,  -- Adds 30 days
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO renewal_key_id;
    
    RAISE NOTICE 'Test data created:';
    RAISE NOTICE '  Active key ID: %', active_key_id;
    RAISE NOTICE '  Renewal key ID: %', renewal_key_id;
    RAISE NOTICE '  Test user ID: %', test_user_id;
END $$;
```

**Save the key IDs** - you'll need them for testing.

---

## Step 3: Test the Migration

### Test 1: Verify Function Exists (Before Migration)

```sql
-- Check current function signature
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'activate_pro_key';
```

### Test 2: Apply Migration

1. Open **Supabase SQL Editor**
2. Copy the entire content of `016_add_subscription_renewal_support.sql`
3. Paste into SQL Editor
4. Click **Run** (or press F5)

**Expected Result:** 
- âœ… Function created successfully
- âœ… No errors

### Test 3: Verify Function Was Updated

```sql
-- Check function was updated
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'activate_pro_key';

-- Should return the function
```

---

## Step 4: Test Scenarios

### Scenario 1: New Activation (No Active Subscription)

**Setup:**
- User has NO active subscription
- User has an unused key

**Test:**
```sql
-- Replace with your test values
SELECT public.activate_pro_key(
    'RENEWAL-KEY-UUID-HERE'::uuid,  -- Unused key ID
    'TEST-USER-UUID-HERE'::uuid     -- User with no active subscription
);
```

**Expected Result:**
```json
{
    "success": true,
    "message": "Pro key activated successfully",
    "is_renewal": false,
    "expiry_date": "2025-01-25T...",
    "duration_days": 30
}
```

**Verify:**
```sql
-- Check key was activated
SELECT * FROM keys WHERE id = 'RENEWAL-KEY-UUID-HERE'::uuid;
-- Should show: is_used = true, used_by = test_user_id

-- Check usage_pro record was created
SELECT * FROM usage_pro WHERE user_id = 'TEST-USER-UUID-HERE'::uuid;
-- Should show: tokens_input_used = 0, tokens_output_used = 0, ocr_count = 0
```

---

### Scenario 2: Simple Renewal (Active Subscription)

**Setup:**
- User has active subscription (expires in 10 days)
- User has an unused renewal key (30 days)

**Test:**
```sql
-- Get the active key ID and renewal key ID from Step 2
-- Replace with your actual IDs
SELECT public.activate_pro_key(
    'RENEWAL-KEY-UUID-HERE'::uuid,  -- New unused key
    'TEST-USER-UUID-HERE'::uuid     -- User with active subscription
);
```

**Expected Result:**
```json
{
    "success": true,
    "message": "Subscription extended successfully",
    "is_renewal": true,
    "old_expiry_date": "2025-01-05T...",  -- Original expiry (10 days from now)
    "new_expiry_date": "2025-02-04T...",  -- Extended by 30 days
    "duration_added_days": 30,
    "was_capped": false
}
```

**Verify:**
```sql
-- Check active key was extended (not the renewal key)
SELECT 
    id,
    key,
    is_used,
    expiry_date,
    used_by
FROM keys 
WHERE used_by = 'TEST-USER-UUID-HERE'::uuid
AND is_used = true
AND expiry_date > CURRENT_TIMESTAMP
ORDER BY expiry_date DESC
LIMIT 1;
-- Should show: expiry_date extended by 30 days

-- Check renewal key was marked as used
SELECT * FROM keys WHERE id = 'RENEWAL-KEY-UUID-HERE'::uuid;
-- Should show: is_used = true, used_by = test_user_id

-- Check usage was NOT reset
SELECT * FROM usage_pro WHERE user_id = 'TEST-USER-UUID-HERE'::uuid;
-- Should show: usage counters remain unchanged (not reset to 0)
```

---

### Scenario 3: Renewal with Expiry Cap (Would Exceed 12 Months)

**Setup:**
- User has active subscription expiring in 11 months
- User tries to add 30 days (would exceed 12 months)

**Test:**
```sql
-- First, create a key with 11 months expiry
DO $$
DECLARE
    test_user_id uuid := 'TEST-USER-UUID-HERE'::uuid;
    active_key_id uuid;
    renewal_key_id uuid;
BEGIN
    -- Create active key expiring in 11 months
    INSERT INTO public.keys (
        id, key, is_used, used_by, expiry_date, duration_days
    )
    VALUES (
        gen_random_uuid(),
        'TEST-ACTIVE-11MONTHS',
        true,
        test_user_id,
        CURRENT_TIMESTAMP + INTERVAL '11 months',
        30
    )
    RETURNING id INTO active_key_id;
    
    -- Create renewal key
    INSERT INTO public.keys (
        id, key, is_used, used_by, expiry_date, duration_days
    )
    VALUES (
        gen_random_uuid(),
        'TEST-RENEWAL-CAP',
        false,
        NULL,
        CURRENT_TIMESTAMP + INTERVAL '365 days',
        30
    )
    RETURNING id INTO renewal_key_id;
    
    -- Test renewal
    PERFORM public.activate_pro_key(renewal_key_id, test_user_id);
    
    -- Check result
    SELECT expiry_date FROM keys WHERE id = active_key_id;
    -- Should be capped at 12 months from today, not 11 months + 30 days
END $$;
```

**Expected Result:**
- `new_expiry_date` should be exactly 12 months from today
- `was_capped: true` in response
- Warning logged (check Supabase logs)

---

### Scenario 4: Multiple Renewals

**Test:**
```sql
-- Renew multiple times
SELECT public.activate_pro_key('KEY-1-UUID'::uuid, 'TEST-USER-UUID'::uuid);
SELECT public.activate_pro_key('KEY-2-UUID'::uuid, 'TEST-USER-UUID'::uuid);
SELECT public.activate_pro_key('KEY-3-UUID'::uuid, 'TEST-USER-UUID'::uuid);

-- Check final expiry
SELECT expiry_date 
FROM keys 
WHERE used_by = 'TEST-USER-UUID'::uuid
AND is_used = true
ORDER BY expiry_date DESC
LIMIT 1;
-- Should be: original_expiry + 30 + 30 + 30 days (or capped at 12 months)
```

---

### Scenario 5: Error Cases

**Test Invalid Key:**
```sql
SELECT public.activate_pro_key(
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Non-existent key
    'TEST-USER-UUID'::uuid
);
-- Expected: success = false, message = "Key is invalid, already used, or expired"
```

**Test Already Used Key:**
```sql
-- Use a key that's already marked as used
SELECT public.activate_pro_key(
    'ALREADY-USED-KEY-UUID'::uuid,
    'TEST-USER-UUID'::uuid
);
-- Expected: success = false, message = "Key is invalid, already used, or expired"
```

**Test Expired Key:**
```sql
-- Use a key with expiry_date in the past
SELECT public.activate_pro_key(
    'EXPIRED-KEY-UUID'::uuid,
    'TEST-USER-UUID'::uuid
);
-- Expected: success = false, message = "Key is invalid, already used, or expired"
```

---

## Step 5: Clean Up Test Data

After testing, clean up:

```sql
-- Delete test keys
DELETE FROM keys WHERE key LIKE 'TEST-%';

-- Delete test usage records (if needed)
DELETE FROM usage_pro WHERE user_id = 'TEST-USER-UUID-HERE'::uuid;
DELETE FROM usage_free WHERE user_id = 'TEST-USER-UUID-HERE'::uuid;
```

---

## Step 6: Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```sql
-- Restore previous function from migration 015
-- Copy the function definition from 015_add_ocr_count_tracking.sql
-- And run CREATE OR REPLACE FUNCTION...
```

Or restore from backup if you have one.

---

## Verification Checklist

Before applying to production, verify:

- [ ] âœ… New activation works (creates usage_pro, resets counters)
- [ ] âœ… Simple renewal works (extends expiry, keeps usage)
- [ ] âœ… Expiry cap works (caps at 12 months)
- [ ] âœ… Multiple renewals work (each extends from latest)
- [ ] âœ… Error cases handled (invalid key, used key, expired key)
- [ ] âœ… Audit trail maintained (renewal keys marked as used)
- [ ] âœ… Usage not reset on renewal (preserves current usage)
- [ ] âœ… No errors in Supabase logs

---

## Production Deployment

Once all tests pass:

1. **Backup Production Database** (if possible)
2. Copy migration SQL to **Production Supabase SQL Editor**
3. Run the migration
4. Verify function was updated:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'activate_pro_key';
   ```
5. Test with a real user (optional, but recommended)

---

## Troubleshooting

### Error: "Function already exists"
- This is normal - `CREATE OR REPLACE` will update it
- Just run the migration

### Error: "Permission denied"
- Ensure you're using service role or have proper permissions
- Check function grants in migration

### Error: "Column does not exist"
- Verify you're running on the correct database
- Check that previous migrations (010-015) were applied

### Function works but returns wrong data
- Check that test data is set up correctly
- Verify user has active subscription (for renewal tests)
- Check Supabase logs for warnings

---

**End of Testing Guide**

