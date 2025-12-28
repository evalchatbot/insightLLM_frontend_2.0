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
2. `submitOCRJob()` called → Returns `jobId` and `requestId` immediately
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
- ✅ Replaced synchronous `annotateDocument()` with async `submitOCRJob()`
- ✅ Added real-time progress polling (replaces fake timer-based progress)
- ✅ Added job status tracking
- ✅ Added job cancellation support
- ✅ Enhanced progress display with page-level details
- ✅ Added cleanup on unmount and cancellation

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

