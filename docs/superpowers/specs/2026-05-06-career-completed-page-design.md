# Career Completed Page — Design Spec
**Date:** 2026-05-06

## Overview
When a user finishes the last course in a career, add a "Complete Career" CTA at the bottom of that course's completed page. Clicking it validates all career courses are done, then navigates to a new `/career-board/:careerId/completed` page — a premium career-level celebration page mirroring the structure of `CareerCourseCompleted`.

## User Flow

1. User completes last course → lands on `CareerCourseCompleted` page
2. At the bottom (where "Next Course" would be), a **"Complete Career" CTA card** appears instead
3. User clicks "Complete Career":
   - **All courses done** → navigate to `/career-board/:careerId/completed`
   - **Some courses incomplete** → CTA card switches to an inline warning showing each course's status with "Go to [course]" buttons
4. Career Completed page shows: celebration header, premium certificate, aggregate stats, courses covered

## Files Changed

| File | Change |
|------|--------|
| `src/routes/careerBoard.routes.tsx` | Add `<Route path="completed" element={<CareerCompleted />} />` |
| `src/pages/CareerCourseCompleted.tsx` | Add "Complete Career" CTA section for last course |
| `src/pages/CareerCompleted.tsx` | **New** — career-level completion page |

## Data Model

`careerCourses` from `useCareerBoard()` is `CareerCourse[]` where each item has:
- `course_id`: `courses.id` — used for all DB queries
- `course?: { id, name, slug }` — course metadata

**Querying completion** (all in parallel, two queries total):
```
lesson_progress WHERE user_id=X AND course_id IN [...] AND completed=true
posts WHERE category_id IN [...] AND status='published'
```
A course is complete when `completedCount >= totalPostsCount` (and totalPostsCount > 0).

## CareerCourseCompleted.tsx — Changes

**Detect last course:**
```typescript
const isLastCourse = careerCourses.length > 0 &&
  careerCourses[careerCourses.length - 1].course?.slug === courseSlug;
```

**New state:**
- `careerCtaState: 'idle' | 'checking' | 'incomplete'`
- `courseStatuses: { courseId, name, slug, isComplete, progress }[]`

**CTA section replaces the `{nextCourse && (...)}` block when `isLastCourse`:**
- Idle: green card, course chips, "Complete Career" button
- Checking: same card, button shows spinner
- Incomplete: warning card, per-course status rows, "Go to [course]" button for each incomplete one, dismiss back to idle

**Navigation on success:**
```typescript
navigate(`/career-board/${careerSlugForPath}/completed`, {
  state: {
    completionDate: new Date().toISOString(),
    prefetchedStats: {
      totalLessons: /* sum of completedByCourse values */,
      totalHours: /* fetched separately from lesson_time_tracking */,
      courses: careerCourses.map(cc => cc.course),
    }
  }
});
```

## CareerCompleted.tsx — New Page

**Route:** `/career-board/:careerId/completed` (within CareerBoardLayout shell)

**Location state shape:**
```typescript
{
  completionDate?: string;
  prefetchedStats?: {
    totalLessons: number;
    totalHours: number;
    courses: { id, name, slug, learning_hours? }[];
  };
}
```

**Page sections (top to bottom):**
1. Back button → `/career-board/${careerId}` 
2. Celebration header: trophy icon, "Career Completed!", career name (green), "Completed on [date]" chip
3. **Premium certificate** (B design) — white background, deep green gradient bars, medal icon, "Career Certificate of Completion", "Full Career Path" green badge, learner name, career name in green
4. CTA row: Download (canvas PNG) | LinkedIn | Copy link
5. **Career Summary card**: 4-stat grid: Courses / Lessons / Time Invested / Skills
6. **Courses Covered card**: list of all career courses with green checkmarks
7. **Key Skills Learned**: skill chips from `career_skills` table

**Data fetching (when no location.state):**
- Career: from `CareerBoardContext` (`career` and `careerCourses`)
- Learner name: `profiles.full_name` WHERE id = user.id
- Total completed lessons: COUNT `lesson_progress` WHERE completed=true AND course_id IN career course_ids
- Total hours: SUM `lesson_time_tracking.duration_seconds` WHERE course_id IN career course_ids → divide by 3600
- Skills: `career_skills` WHERE career_id = career.id → skill_name array
- Completion date: MAX `lesson_progress.viewed_at` WHERE completed=true AND course_id IN career course_ids

**Certificate Canvas download:**
- 1400×990px, white background
- Deep green gradient bars top/bottom (#064e3b → #059669 → #064e3b)
- Corner squares in #064e3b
- "UNLOCKMEMORY" platform header
- "Career Certificate of Completion" serif title
- "Full Career Path" green badge text below title
- Gradient rule
- "This is to certify that" / Learner name / name underline
- "has successfully completed the" / Career name (large, #064e3b) / "Career Path"
- Completion date
- Footer: "Issued by UnlockMemory · Career Achievement"

## Certificate Visual Design (B — Elevated Green)
- White background (same as course cert but career-specific text)
- `#064e3b → #059669 → #064e3b` gradient bars (5px top+bottom)
- Corner squares in `#064e3b`
- Title: "Career Certificate of Completion"
- Sub-badge below title: "Full Career Path" (green pill: bg #ecfdf5, border #a7f3d0)
- Career name in `#064e3b` (not course name in green)
- Medal icon (🎖️) in preview

## Error / Edge Cases
- User navigates to `/career-board/:careerId/completed` directly without completing all courses → redirect to career board index
- `career` or `careerCourses` not loaded yet → show skeleton loader same as CareerCourseCompleted
- `lesson_time_tracking` returns 0 → fall back to sum of `courses.learning_hours` for career courses
