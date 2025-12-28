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
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (routes)/           # Route groups
│   │   │   └── (general)/
│   │   │       └── app/        # Main app routes
│   │   │           ├── [chat]/ # Dynamic chat route
│   │   │           ├── ocr/    # OCR evaluation page
│   │   │           ├── quiz/   # MCQ quiz page
│   │   │           └── ...
│   │   ├── api/                # API routes
│   │   │   ├── chat/          # Chat API endpoints
│   │   │   ├── ocr/           # OCR API endpoints
│   │   │   ├── pro/           # Pro subscription API
│   │   │   └── ...
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Global styles
│   │
│   ├── components/             # React components
│   │   ├── chat-provider-components/  # Chat-related components
│   │   ├── header-components/         # Header/navbar components
│   │   ├── sidebar-components/       # Sidebar components
│   │   ├── input-prompt-components/  # Input/prompt components
│   │   ├── landing-components/       # Landing page components
│   │   ├── prompt-gallery-components/ # Prompt gallery components
│   │   ├── dev-components/            # Custom UI components
│   │   ├── ui/                        # Base UI components
│   │   └── temp-components/           # Temporary/experimental components
│   │
│   ├── context/                # React Context providers
│   │   └── SidebarContext.tsx
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useProAccess.ts
│   │   └── useSidebarData.ts
│   │
│   ├── lib/                    # Library utilities
│   │   └── utils.ts           # Utility functions (cn, etc.)
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── types.ts           # Application types
│   │   └── database.types.ts  # Supabase database types
│   │
│   ├── utils/                  # Utility functions
│   │   ├── insight-zustand.ts # Zustand store
│   │   ├── db.ts              # Database utilities
│   │   ├── usage-tracking.ts  # Usage tracking utilities
│   │   ├── ocr-api.ts         # OCR API utilities
│   │   └── ...
│   │
│   ├── actions/                # Server actions
│   │   └── actions.ts          # Server-side functions
│   │
│   ├── db/                     # Database migrations
│   │   └── migrations/        # SQL migration files
│   │
│   └── middleware.ts           # Next.js middleware
│
├── public/                     # Static assets
│   └── assets/                # Images, icons, etc.
│
├── docs/                       # Documentation
│   └── FRONTEND_DOCUMENTATION.md
│
└── package.json               # Dependencies and scripts
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
- `EnsureSupabaseUser.tsx`: Syncs Clerk → Supabase user
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

