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
- ✅ Added async job functions for non-blocking processing
- ✅ Added progress tracking support
- ✅ Added job cancellation support
- ✅ Maintained backward compatibility

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

