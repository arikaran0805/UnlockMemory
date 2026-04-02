# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run preview      # Preview production build
```

No test runner is configured in this project.

## Architecture Overview

This is a **role-based enterprise learning platform** built with React 18 + TypeScript + Vite, using Supabase as the backend (PostgreSQL + Auth + Realtime).

### Role System

Every role has its own isolated set of: **route file → sidebar config → layout component → guard**. The active role is resolved at login from the `user_roles` table and stored in `AuthContext`. It cannot change mid-session.

| Role | URL Prefix | Route File | Sidebar Color |
|------|-----------|-----------|---------------|
| Admin | `/admin/*` | `routes/admin.routes.tsx` | Violet/Purple |
| Super Moderator | `/super-moderator/*` | `routes/superModerator.routes.tsx` | Cyan/Blue |
| Senior Moderator | `/senior-moderator/*` | `routes/seniorModerator.routes.tsx` | Amber (#D97706) |
| Content Moderator | `/moderator/*` | `routes/moderator.routes.tsx` | Blue (#2563EB) |

When adding a new page for a role, you must update: the route file, the sidebar config (`src/sidebar/<role>.sidebar.ts`), and if it needs a badge counter, `AdminSidebarContext`.

### State Management

- **`src/contexts/`** — React Context for global/session state (`AuthContext`, `AdminSidebarContext`, `CareerBoardContext`, etc.)
- **TanStack React Query** — all server/Supabase data fetching; hooks live in `src/hooks/` (85+ hooks)
- **Local `useState`** — UI-only state (modals, dropdowns, form fields)

### Data Access

There is **no service layer**. Supabase is called directly from hooks and components. The client is at `src/integrations/supabase/client.ts`. TypeScript types are auto-generated in `src/integrations/supabase/types.ts` (do not edit manually).

Common pattern:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => supabase.from('table').select('*').eq('id', id)
});
```

Real-time subscriptions use `supabase.channel(...)` inside `useEffect`.

### UI Components

- All UI primitives come from **shadcn/ui** (Radix UI + Tailwind). Components are in `src/components/ui/`.
- Custom page-level components are in `src/components/`.
- TipTap is used for rich text editing; Monaco Editor for code editing; Fabric.js for canvas/drawing.
- Toast notifications use Sonner. Forms use react-hook-form + Zod.

### Sidebar Badge System

`AdminSidebarContext` tracks notification counts for sidebar items (approvals, posts, tags, etc.). Badges auto-clear when the user navigates to that page. When adding a new page that needs a badge, add the count to this context.

### Routing Guard Pattern

Role enforcement is done at the route level via guard components (`src/guards/`). Never rely solely on UI hiding for access control — always wrap protected routes in the appropriate guard.

### TypeScript

`noImplicitAny` is disabled. The project uses path alias `@/` mapping to `src/`.
