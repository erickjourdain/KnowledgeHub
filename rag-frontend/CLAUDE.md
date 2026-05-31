# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite frontend application (RAG-AI) that provides a web interface for managing RAG (Retrieval-Augmented Generation) collections and documents. It communicates with a backend API and supports real-time updates via WebSockets.

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production (TypeScript check + Vite build)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

### Routing
- **TanStack Router** with file-based routing convention
- Routes defined in `src/routes/` directory
- Auto-generated route tree in `src/routeTree.gen.ts` (do not edit manually)
- Route hierarchy:
  - `/login` - Login page
  - `/_authenticated` - Protected routes wrapper
  - `/_authenticated/_authAdmin` - Admin routes (collection CRUD)
  - `/_authenticated/collection/$id` - Collection viewer

### State Management
- **Jotai** for atomic state management
- Auth token persisted in localStorage via `atomWithStorage`
- Job status tracked in `src/store/jobStore.ts`

### Data Fetching
- **TanStack Query** for server state
- **Axios** for HTTP requests with Bearer token auth
- API base URL: `VITE_API_URL` environment variable or `http://localhost:5000/api`

### UI Framework
- **MUI (Material UI)** v7 for components
- MUI Markdown for rendering markdown content
- Emotion for styled components

### Key Files

| Path | Purpose |
|------|---------|
| `src/router.tsx` | Router configuration with QueryClient |
| `src/providers/authProvider.tsx` | Authentication context and login/logout |
| `src/providers/websocketProvider.tsx` | WebSocket connection for real-time updates |
| `src/api/instance.ts` | Axios instance with auth interceptor |
| `src/api/collections.ts` | Collection CRUD operations |
| `src/store/authStore.ts` | Jotai atom for auth token |
| `src/routes/__root.tsx` | Root layout with AppBar |

## Environment Variables

- `VITE_API_URL` - Backend API URL (e.g., `//localhost:5000/api`)

## Route Development

When adding new routes:
1. Create route file in `src/routes/` following TanStack Router conventions
2. Run `npm run dev` - route tree auto-generates
3. Use `$id` pattern for dynamic route parameters (e.g., `collection/$id.tsx`)

## Type Definitions

Types are defined in `src/types/`:
- `Collection.ts` - Collection interfaces
- `Document.ts` - Document interfaces
- `User.ts` - User and auth types
- `Job.ts` - Background job types