# Feedback Feature - Implementation Plan

## 📋 Table of Contents

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
  └── FeedbackButton (global component)
       └── FeedbackModal (popup)
            └── API Call (feedback-api.ts)
```

### Backend Architecture

```
FastAPI Router
  └── /feedback/submit
       ├── Validation
       ├── Rate Limiting
       ├── Database Storage
       └── Google Forms/Sheets Integration (optional)
```

### Data Flow

```
User clicks button
  → Modal opens
  → User types feedback
  → User clicks "Send"
  → Frontend validates
  → API call to backend
  → Backend validates & rate limits
  → Backend stores in database
  → Backend sends to Google Forms (optional)
  → Success response
  → Frontend shows success toast
  → Modal closes
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
   - ✅ User ID (if authenticated)
   - ✅ User email (if authenticated)
   - ✅ Page URL where feedback was submitted
   - ✅ Timestamp
   - ✅ User agent / browser info
   - ✅ Feedback category selector (Bug, Feature, Question, General)

2. **Rate Limiting & Spam Prevention**
   - ✅ Backend rate limiting (3 per hour per user/IP)
   - ✅ Frontend: disable button after submission
   - ⚠️ Optional: CAPTCHA for unauthenticated users (if spam becomes an issue)

3. **Better UX**
   - ✅ Character counter (500-1000 chars recommended)
   - ✅ Loading state during submission
   - ✅ Success/error toast notifications (using existing DevToast)
   - ⚠️ Optional: Auto-save draft to localStorage
   - ✅ Feedback type/category selector

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

2. **Browser Alert** → **Toast Notification**
   - ❌ Remove: `window.alert("Feedback sent!")`
   - ✅ Use: Existing `DevToast` component
   - **Why**: Better UX, non-blocking, matches app design

3. **Cancel Button** (Keep)
   - ✅ Keep: Standard UX pattern
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
├── src/
│   ├── app/
│   │   └── layout.tsx                    # Add FeedbackButton here
│   ├── components/
│   │   └── feedback/                    # New directory
│   │       ├── FeedbackButton.tsx       # Floating button component
│   │       └── FeedbackModal.tsx        # Modal component
│   └── utils/
│       └── feedback-api.ts              # API utility function
└── public/
    └── assets/
        └── edit-list-icon.svg           # Already exists
```

### Backend Files

```
insightLLM_backend/
└── backend/
    ├── api/
    │   └── routes/
    │       └── feedback.py              # New feedback route
    ├── utils/
    │   └── google_forms.py              # Optional: Google Forms integration
    └── main.py                           # Register feedback router
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

- Full flow: Button click → Modal open → Submit → API call → Success
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

