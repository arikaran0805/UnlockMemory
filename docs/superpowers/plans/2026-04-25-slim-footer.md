# Slim Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current multi-column `Footer` with a single-bar `SlimFooter` (brand · nav links · legal) rendered on every user-facing page, including Profile.

**Architecture:** Create a new `SlimFooter.tsx` component; update `Layout.tsx` to import and render it instead of `Footer`; remove the `showFooter={false}` override on the Profile page. No data-fetching — the component is fully static.

**Tech Stack:** React 18, TypeScript, React Router v6, Tailwind CSS, shadcn/ui tokens

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/SlimFooter.tsx` | Single-bar footer: brand · nav · legal |
| Modify | `src/components/Layout.tsx` | Swap `Footer` import/render → `SlimFooter` |
| Modify | `src/pages/Profile.tsx:2596` | Remove `showFooter={false}` |

---

## Task 1: Create SlimFooter component

**Files:**
- Create: `src/components/SlimFooter.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/SlimFooter.tsx
import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Courses",  to: "/courses" },
  { label: "Careers",  to: "/careers" },
  { label: "About",    to: "/about" },
  { label: "Contact",  to: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms",   to: "/terms" },
];

export default function SlimFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background shrink-0">
      <div className="container px-6 md:px-12 lg:px-16 xl:px-24 h-12 flex items-center justify-between gap-4">

        {/* Brand */}
        <Link
          to="/"
          className="text-[13px] font-semibold text-foreground hover:text-primary transition-colors duration-150 shrink-0"
        >
          UnlockMemory
        </Link>

        {/* Nav links — hidden on mobile to avoid overflow */}
        <nav className="hidden sm:flex items-center gap-5">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Legal + year */}
        <div className="flex items-center gap-4 shrink-0">
          {LEGAL_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
          <span className="text-[12px] text-muted-foreground/50 select-none">
            © {year}
          </span>
        </div>

      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SlimFooter.tsx
git commit -m "feat: add SlimFooter single-bar component"
```

---

## Task 2: Wire SlimFooter into Layout

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Swap the import and render**

In `src/components/Layout.tsx`, replace:
```tsx
import Footer from "./Footer";
```
with:
```tsx
import SlimFooter from "./SlimFooter";
```

And replace:
```tsx
{showFooter && <Footer />}
```
with:
```tsx
{showFooter && <SlimFooter />}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: use SlimFooter in Layout"
```

---

## Task 3: Enable footer on Profile page

**Files:**
- Modify: `src/pages/Profile.tsx:2596`

- [ ] **Step 1: Remove the showFooter override**

In `src/pages/Profile.tsx` line 2596, replace:
```tsx
<Layout showFooter={false}>
```
with:
```tsx
<Layout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "feat: show slim footer on Profile page"
```

---

## Task 4: Visual QA checklist

- [ ] Open `/courses` — slim bar visible at page bottom with brand · nav · legal
- [ ] Open `/profile` — slim bar visible (was previously hidden)
- [ ] Open `/about`, `/contact`, `/careers` — slim bar consistent across all
- [ ] Resize to mobile (< 640px) — nav links hidden, brand + legal remain
- [ ] Hover each link — `text-foreground` transition fires cleanly
- [ ] Check dark mode if applicable — `bg-background` and `border-border/40` resolve correctly
