# About Page Redesign — Concept A "The Manifesto"

**Date:** 2026-05-19  
**File to change:** `src/pages/About.tsx`  
**Status:** Approved for implementation

---

## Goal

Replace the current two-column image + text layout with a vertically stacked, editorial "manifesto" design that:
- Opens with a bold problem statement (the forgetting curve)
- Communicates what makes UnlockMemory different from generic course platforms
- Uses the existing brand tokens exactly — no new CSS variables or design tokens
- Contains zero external images or illustrations

---

## Section Breakdown

### 1. Hero — Dark green, full-width

- **Background:** `bg-gradient-primary` (custom utility in `tailwind.config.ts` → `var(--gradient-primary)`, the brand 135° forest-green gradient)
- **Height:** `min-h-[65vh]` with `flex items-center justify-center`
- **Content (centered, `max-w-2xl`):**
  - Small all-caps eyebrow: `ABOUT UNLOCKMEMORY` — `text-primary-foreground/60 text-xs tracking-widest`
  - H1 `text-5xl font-bold text-primary-foreground leading-tight`: *"Most learning is forgotten within a week."*
  - Subline `text-xl text-primary-foreground/80 mt-4 font-medium`: *"We built the system that changes that."*
- No CTA button — hero is purely declarative

---

### 2. The Problem / Our Answer — White background

- **Container:** `max-w-5xl mx-auto px-4 py-28`
- **Layout:** `grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-16 items-start`

**Left — Stat block:**
- Giant number `text-8xl font-bold text-primary leading-none`: **70%**
- Body below `text-lg text-foreground mt-3`: *"of information is forgotten within 24 hours"*
- Caption `text-sm text-muted-foreground mt-2 italic`: *"— Hermann Ebbinghaus, 1885"*

**Right — Narrative:**
- Green eyebrow label `text-xs font-semibold text-primary tracking-widest uppercase mb-4`: `OUR ANSWER`
- Three `<p>` blocks with `text-base text-muted-foreground leading-relaxed space-y-4`:
  1. *"Forgetting isn't a personal failure — it's how brains work by default. Without reinforcement, most of what you read today will be gone tomorrow."*
  2. *"UnlockMemory is built around the science of durable learning: structured knowledge paths, active practice with real feedback, and spaced repetition that surfaces the right content at the right time."*
  3. *"Whether you're a developer learning new skills, a student preparing for exams, or a professional staying sharp — this platform is designed to make your effort stick."*

---

### 3. How We're Different — Muted background

- **Background:** `bg-muted/40`
- **Container:** `max-w-5xl mx-auto px-4 py-24`
- **Heading** `text-3xl font-bold text-foreground text-center mb-12`: *"Not just a course platform."*
- **3-column card row** `grid grid-cols-1 md:grid-cols-3 gap-6`:

Each card: `bg-background rounded-2xl p-8 shadow-card border border-border/50`

| Icon (Lucide) | Title | Description |
|---|---|---|
| `Brain` | Learn Deeply | Structured lessons built around how memory actually works — not just what sounds good. |
| `Code2` | Practice Actively | Real problems with instant feedback. You only remember what you actually do. |
| `RefreshCw` | Remember Forever | Spaced repetition surfaces exactly what you're about to forget, right before you forget it. |

Card anatomy:
- Icon in `w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center` with `text-primary` icon (20px)
- Title `text-lg font-semibold text-foreground mt-5 mb-2`
- Description `text-sm text-muted-foreground leading-relaxed`

---

### 4. Values — White background

- **Container:** `max-w-5xl mx-auto px-4 py-24`
- **Heading** `text-3xl font-bold text-foreground mb-12`: *"What we stand for"*
- **2×2 grid** `grid grid-cols-1 sm:grid-cols-2 gap-5`:

Each card: `rounded-2xl p-7 border-l-4 border-primary bg-muted/30`

| Title | Description |
|---|---|
| Quality First | Every lesson is well-researched, reviewed, and built to last — we ship nothing we wouldn't learn from ourselves. |
| Community Driven | Learners and instructors shape what gets built next. The best ideas come from the people using the platform. |
| Continuous Learning | We believe growth never stops — for our users or our team. We practice what we teach. |
| Innovation | We apply the latest in learning science, not just technology. If the research says it works, we build it. |

Card anatomy:
- Title `text-base font-semibold text-foreground mb-2`
- Description `text-sm text-muted-foreground leading-relaxed`

---

### 5. CTA Strip — Subtle green tint

- **Background:** `bg-primary/5`
- **Container:** `max-w-lg mx-auto px-4 py-20 text-center`
- **Headline** `text-2xl font-bold text-foreground mb-3`: *"Ready to learn something that sticks?"*
- **Subtext** `text-base text-muted-foreground mb-8`: *"Join thousands of learners building lasting knowledge."*
- **Button:** shadcn `<Button>` default variant, size `lg`, links to `/courses`: `Start Learning →`

---

## Implementation Notes

- All tokens (`bg-primary`, `text-muted-foreground`, `shadow-card`, `border-border`) are existing CSS variables — no new ones needed.
- Lucide icons used: `Brain`, `Code2`, `RefreshCw` — all already a dependency.
- `SEOHead` and `Layout` wrappers stay exactly as-is.
- `document.title` useEffect stays as-is.
- The file is a single self-contained component — no new child components needed.
- Dark mode: all token usages automatically resolve to the dark palette already defined in `index.css`.

---

## What is NOT changing

- Route (`/about`) — unchanged
- Layout wrapper — unchanged
- SEOHead props — unchanged
- No new dependencies
