# Frontend Documentation Index

Welcome to the Rubrik AI Frontend documentation! This directory contains comprehensive documentation for the entire frontend codebase.

---

## 📚 Documentation Files

### Main Documentation

- **[FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md)** - Complete overview of the frontend architecture, structure, routing, authentication, and development guidelines.

### Component Documentation

- [COMPONENTS_DOCUMENTATION.md](./COMPONENTS_DOCUMENTATION.md)- Detailed documentation for all React components organized by category (chat, header, sidebar, UI, etc.).

### API Documentation

- **[API_ROUTES_DOCUMENTATION.md](./API_ROUTES_DOCUMENTATION.md)** - Complete documentation for all Next.js API routes, including request/response formats, authentication, and error handling.

### Utilities & Hooks

- **[UTILITIES_AND_HOOKS.md](./UTILITIES_AND_HOOKS.md)** - Documentation for utility functions, custom React hooks, and state management.

### Documentation Guide

- **[DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md)** - **⭐ START HERE** - Complete guide on how to document changes (mandatory process).
- **[QUICK_DOCUMENTATION_REFERENCE.md](./QUICK_DOCUMENTATION_REFERENCE.md)** - One-page quick reference for documenting changes.
- **[DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)** - Templates and guidelines for documenting future changes to the codebase.

### Implementation Documentation

#### Async Background Jobs & Progress Tracking

- **[ASYNC_JOBS_FRONTEND_IMPLEMENTATION.md](./ASYNC_JOBS_FRONTEND_IMPLEMENTATION.md)** - Complete frontend implementation of async background jobs and progress tracking - ✅ Completed

---

## 🚀 Quick Start

### For New Developers

1. Start with **[FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md)** to understand the overall architecture
2. Review **[COMPONENTS_DOCUMENTATION.md](./COMPONENTS_DOCUMENTATION.md)** to learn about available components
3. Check **[API_ROUTES_DOCUMENTATION.md](./API_ROUTES_DOCUMENTATION.md)** to understand API endpoints
4. Read **[UTILITIES_AND_HOOKS.md](./UTILITIES_AND_HOOKS.md)** for utility functions and hooks

### For Making Changes

1. **⭐ READ FIRST**: [DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md) - Complete documentation workflow
2. **Quick Reference**: [QUICK_DOCUMENTATION_REFERENCE.md](./QUICK_DOCUMENTATION_REFERENCE.md) - One-page guide
3. Use the appropriate template from [DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)
4. Update relevant documentation files
5. Commit documentation along with code changes

**⚠️ IMPORTANT**: Documentation is now mandatory for all code changes!

---

## 📖 Documentation Structure

```
Documents/
├── README.md                          # This file - documentation index
├── FRONTEND_DOCUMENTATION.md          # Main architecture and overview
├── COMPONENTS_DOCUMENTATION.md        # All components
├── API_ROUTES_DOCUMENTATION.md        # All API routes
├── UTILITIES_AND_HOOKS.md             # Utilities and hooks
├── DOCUMENTATION_TEMPLATE.md          # Templates for future changes
└── DOCUMENTATION_SUMMARY.md           # Documentation summary
```

---

## 🔍 Finding Information

### I want to know about...

- **Project structure** → [FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md#project-structure)
- **How routing works** → [FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md#routing)
- **A specific component** → [COMPONENTS_DOCUMENTATION.md](./COMPONENTS_DOCUMENTATION.md)
- **API endpoints** → [API_ROUTES_DOCUMENTATION.md](./API_ROUTES_DOCUMENTATION.md)
- **State management** → [UTILITIES_AND_HOOKS.md](./UTILITIES_AND_HOOKS.md#state-management)
- **How to document changes** → [DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)

---

## 📝 Documentation Standards

### When to Update Documentation

- ✅ Adding a new component
- ✅ Modifying an existing component
- ✅ Adding a new API route
- ✅ Changing API route behavior
- ✅ Adding new utilities or hooks
- ✅ Changing state management
- ✅ Fixing bugs (document the fix)
- ✅ Adding features (document the feature)

### Documentation Checklist

- [ ] Code follows project style
- [ ] TypeScript types are defined
- [ ] Error handling is documented
- [ ] Usage examples are provided
- [ ] Related files are cross-referenced
- [ ] "Last Updated" date is set

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Zustand, React Context
- **Authentication**: Clerk
- **Database**: Supabase
- **Animations**: Framer Motion

---

## 📞 Getting Help

### Common Issues

1. **Can't find a component?** → Check [COMPONENTS_DOCUMENTATION.md](./COMPONENTS_DOCUMENTATION.md)
2. **API route not working?** → Check [API_ROUTES_DOCUMENTATION.md](./API_ROUTES_DOCUMENTATION.md)
3. **State management question?** → Check [UTILITIES_AND_HOOKS.md](./UTILITIES_AND_HOOKS.md#state-management)
4. **How to document changes?** → Check [DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)

### Still Need Help?

- Review the main [README.md](../README.md) in the project root
- Check the code comments in the relevant files
- Review the component/API implementation

---

## 🔄 Keeping Documentation Updated

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

## 📅 Documentation History

- **2024**: Initial comprehensive documentation created
- All documentation files include "Last Updated" dates

---

## 🎯 Quick Reference

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

**Remember**: Good documentation is an investment in the future. Keep it updated! 📚✨
