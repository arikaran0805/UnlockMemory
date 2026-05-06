# Career Readiness Card — Pro Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the Career Readiness card on the user dashboard for free (non-pro) users, showing a greyed placeholder UI with a "Upgrade to Pro" CTA that links to `/choose-plan`.

**Architecture:** The Career Readiness card is inline JSX in `Profile.tsx` (lines ~1383–1631). We wrap it with an `isPro` conditional — free users see a locked placeholder card; pro users see the existing card unchanged. `isPro` comes from `useUserState()`, which is not yet imported in `Profile.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui (`Card`, `Button`, `Progress`), lucide-react (`Lock` — already imported), `useUserState` hook at `@/hooks/useUserState`.

---

### Task 1: Import `useUserState` and expose `isPro` in Profile.tsx

**Files:**
- Modify: `src/pages/Profile.tsx` (imports block ~line 35, hook call site ~line 634)

No test runner is configured — skip TDD. Verify manually after Task 2.

- [ ] **Step 1: Add `useUserState` import**

In `src/pages/Profile.tsx`, find the existing import block (around line 35) and add:

```typescript
import { useUserState } from "@/hooks/useUserState";
```

Place it after the existing `import { useUserRole } from "@/hooks/useUserRole";` line (currently line 35).

- [ ] **Step 2: Call the hook inside the Profile component**

In `src/pages/Profile.tsx`, find the line (currently ~634):
```typescript
const { isAdmin, isModerator } = useUserRole();
```

Add the following line immediately after it:
```typescript
const { isPro } = useUserState();
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "feat: import useUserState in Profile and expose isPro"
```

---

### Task 2: Add locked card conditional around the Career Readiness card

**Files:**
- Modify: `src/pages/Profile.tsx` (lines ~1383–1631 — the inline Career Readiness card)

The card currently starts at:
```tsx
{/* Career Readiness - Primary tier */}
<Card className="card-premium card-primary card-no-lift animate-stagger-2">
```
and ends at:
```tsx
          </Card>

          {/* Recommended Labs Section */}
```

- [ ] **Step 1: Locate the card boundaries**

Open `src/pages/Profile.tsx` and search for:
```
{/* Career Readiness - Primary tier */}
```
Note the line number — it is the start of the block to wrap. The block ends just before `{/* Recommended Labs Section */}`.

- [ ] **Step 2: Replace the Career Readiness card block**

Replace everything from `{/* Career Readiness - Primary tier */}` through the closing `</Card>` (just before `{/* Recommended Labs Section */}`) with the following:

```tsx
          {/* Career Readiness */}
          {!isPro ? (
            /* Locked state — shown to free learners */
            <Card className="card-premium card-primary card-no-lift animate-stagger-2">
              <CardContent className="p-7">
                {/* Header */}
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <h3 className="text-xl font-bold tracking-[-0.02em] text-foreground">Career Readiness</h3>
                    <p className="text-sm mt-1 font-normal text-muted-foreground">Your progress toward becoming job-ready</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">Pro Only</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left: greyed course rows */}
                  <div className="space-y-1.5 h-[264px] overflow-y-hidden pr-1">
                    {displayCourses.length > 0 ? displayCourses.map((course) => {
                      const IconComp = getIcon(course.icon, Code2);
                      return (
                        <div key={course.id} className="rounded-xl p-3 border border-transparent opacity-40 select-none cursor-default">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-muted-foreground shrink-0">
                                <IconComp className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium truncate block text-muted-foreground">{course.name}</span>
                                {course.isCareer && !course.isEnrolled && (
                                  <span className="text-[10px] text-muted-foreground/50 font-normal">Not enrolled</span>
                                )}
                              </div>
                            </div>
                            <span className="font-semibold tabular-nums text-muted-foreground">— %</span>
                          </div>
                          <Progress value={0} className="h-[6px] rounded-full [&]:bg-muted/60 [&>div]:bg-muted" />
                        </div>
                      );
                    }) : (
                      <div className="space-y-3 opacity-40 select-none">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="rounded-xl p-3 border border-transparent">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="h-5 w-5 rounded bg-muted/60" />
                                <div className="h-4 w-24 rounded bg-muted/60" />
                              </div>
                              <span className="font-semibold text-muted-foreground">— %</span>
                            </div>
                            <Progress value={0} className="h-[6px] rounded-full [&]:bg-muted/60" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: blurred gauge + Career Board button */}
                  <div className="flex flex-col items-center -mt-6 blur-sm opacity-40 pointer-events-none select-none">
                    <div className="relative w-44 h-44">
                      <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 208 208">
                        <circle cx="104" cy="104" r="88" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" opacity="0.3" />
                        <circle cx="104" cy="104" r="76" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" opacity="0.2" />
                        <defs>
                          <linearGradient id="lockedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6CBFA0" />
                            <stop offset="100%" stopColor="#2A5E42" />
                          </linearGradient>
                        </defs>
                        <circle cx="104" cy="104" r="88" stroke="url(#lockedGradient)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray="40 553.07" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-bold">—</span>
                        <span className="text-sm mt-1 text-muted-foreground">Getting Started</span>
                      </div>
                    </div>
                    <Button
                      className="gap-2 rounded-full px-6 font-semibold text-white mt-6"
                      style={{ background: 'linear-gradient(135deg, #4CAF82, #2A5E42)', boxShadow: '0 6px 20px hsl(var(--primary) / 0.28)' }}
                      disabled
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Career Board
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* CTA strip */}
                <div className="flex items-center justify-between border-t border-border pt-5 mt-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Unlock career readiness tracking</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Available on Pro plan</p>
                  </div>
                  <Button
                    className="gap-2 rounded-full px-5 font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #4CAF82, #2A5E42)', boxShadow: '0 6px 20px hsl(var(--primary) / 0.28)' }}
                    onClick={() => navigate('/choose-plan')}
                  >
                    Upgrade to Pro
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Unlocked state — existing card, unchanged */
            <Card className="card-premium card-primary card-no-lift animate-stagger-2">
              <CardContent className="p-7">
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <h3 className="text-xl font-bold tracking-[-0.02em] text-foreground">Career Readiness</h3>
                    <p className="text-sm mt-1 font-normal text-muted-foreground">Your progress toward becoming job-ready</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Course Progress Bars */}
                  <div className="space-y-1.5 h-[264px] overflow-y-auto pr-1 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {displayCourses.map((course) => {
                      const pct = getCourseCompletionPct(course.slug);
                      const IconComp = getIcon(course.icon, Code2);

                      return (
                        <div
                          key={course.id}
                          className="group cursor-pointer hover:bg-primary/[0.04] rounded-xl p-3 transition-all duration-200 border border-transparent hover:border-primary/15"
                          onClick={() => {
                            if (course.isCareer && career) {
                              navigateToCourseInCareerBoard(career.slug, course.slug);
                            } else {
                              navigate(`/courses/${course.slug}`);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-primary/70 shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <IconComp className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium truncate block">{course.name}</span>
                                {!course.isCareer && (
                                  <span className="text-[10px] text-muted-foreground/60 font-normal">Additional</span>
                                )}
                                {course.isCareer && !course.isEnrolled && (
                                  <span className="text-[10px] text-muted-foreground/50 font-normal">Not enrolled</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-semibold tabular-nums">{pct}%</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                            </div>
                          </div>
                          <Progress
                            value={pct}
                            className="h-[6px] rounded-full progress-animate [&]:bg-muted/60 [&>div]:rounded-full [&>div]:bg-primary"
                          />
                        </div>
                      );
                    })}

                    {displayCourses.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                        <BookOpen className="h-8 w-8 opacity-25" />
                        <p className="text-sm font-medium">No courses in your plan yet</p>
                        <p className="text-xs opacity-70">Add courses to your career plan to track progress here.</p>
                      </div>
                    )}
                  </div>

                  {/* Circular Progress Gauge */}
                  {(() => {
                    const isCloseToNextLevel =
                      (readinessPercentage >= 15 && readinessPercentage < 20) ||
                      (readinessPercentage >= 45 && readinessPercentage < 50) ||
                      (readinessPercentage >= 75 && readinessPercentage < 80);

                    return (
                      <div className="flex flex-col items-center -mt-6">
                        <div className={`relative w-44 h-44 ${isCloseToNextLevel ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}>
                          <div
                            className={`absolute inset-0 rounded-full opacity-20 blur-xl transition-opacity duration-500 ${isCloseToNextLevel ? 'opacity-40' : ''}`}
                            style={{
                              background: `conic-gradient(from 0deg, hsl(var(--primary)) ${readinessPercentage}%, transparent ${readinessPercentage}%)`
                            }}
                          />

                          <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 208 208">
                            <circle cx="104" cy="104" r="88" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" opacity="0.3" />
                            <circle cx="104" cy="104" r="76" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" opacity="0.2" />
                            <defs>
                              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6CBFA0" />
                                <stop offset="100%" stopColor="#2A5E42" />
                              </linearGradient>
                              <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="2.5" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>
                            <circle
                              cx="104" cy="104" r="88"
                              stroke="url(#progressGradient)" strokeWidth="12" fill="none"
                              strokeLinecap="round"
                              strokeDasharray={`${(readinessPercentage / 100) * 553.07} 553.07`}
                              className="transition-all duration-1000 ease-out"
                              filter="url(#arcGlow)"
                            />
                            {[0, 25, 50, 75, 100].map((percent, i) => {
                              const angle = (percent / 100) * 360 - 90;
                              const rad = (angle * Math.PI) / 180;
                              const x = 104 + 88 * Math.cos(rad);
                              const y = 104 + 88 * Math.sin(rad);
                              const isAchieved = readinessPercentage >= percent;
                              return (
                                <circle key={i} cx={x} cy={y} r="4"
                                  fill={isAchieved ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                                  className="transition-all duration-500"
                                />
                              );
                            })}
                            {readinessPercentage > 0 && (() => {
                              const progressAngle = (readinessPercentage / 100) * 360 - 90;
                              const progressRad = (progressAngle * Math.PI) / 180;
                              const dotX = 104 + 88 * Math.cos(progressRad);
                              const dotY = 104 + 88 * Math.sin(progressRad);
                              return (
                                <circle cx={dotX} cy={dotY} r="8"
                                  fill="hsl(var(--background))"
                                  stroke="url(#progressGradient)" strokeWidth="3"
                                  className="transition-all duration-1000 ease-out"
                                  style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.7))' }}
                                />
                              );
                            })()}
                          </svg>

                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="relative">
                              <span className="text-5xl font-bold">{readinessPercentage}</span>
                              <span className="text-2xl font-bold">%</span>
                            </div>
                            <span className="text-sm mt-1 text-muted-foreground">
                              {readinessPercentage >= 100 ? 'Career Ready' : readinessPercentage > 75 ? 'Interview Ready' : readinessPercentage > 50 ? 'Skill Builder' : readinessPercentage > 20 ? 'Progressing' : 'Getting Started'}
                            </span>
                          </div>
                        </div>

                        {readinessPercentage < 100 && plannedCareerCourses.length > 0 && (() => {
                          const lowestCourse = plannedCareerCourses.reduce((min, c) => {
                            return getCourseCompletionPct(c.slug) < getCourseCompletionPct(min.slug) ? c : min;
                          }, plannedCareerCourses[0]);
                          const nextThreshold = readinessPercentage < 20 ? 20 :
                            readinessPercentage < 50 ? 50 :
                              readinessPercentage < 80 ? 80 : 100;
                          return (
                            <div className="mt-3 px-3 py-1.5 rounded-full bg-primary/[0.07] border border-primary/15">
                              <p className="text-[11px] text-primary/80 text-center leading-relaxed">
                                Next: <span className="font-semibold">{lowestCourse.name}</span> → {nextThreshold}%
                              </p>
                            </div>
                          );
                        })()}

                        <div className="flex flex-col items-center mt-3">
                          <Button
                            disabled={careersLoading}
                            className="gap-2 rounded-full px-6 font-semibold text-white hover:-translate-y-[1px] active:translate-y-0 transition-all duration-[220ms] disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                              background: 'linear-gradient(135deg, #4CAF82, #2A5E42)',
                              boxShadow: '0 6px 20px hsl(var(--primary) / 0.28)',
                            }}
                            onClick={() => {
                              const slug = career?.slug || selectedCareer;
                              if (!slug) { navigate('/careers'); return; }
                              const firstSlug = Array.isArray(careerRelatedSlugs) && careerRelatedSlugs.length > 0
                                ? careerRelatedSlugs[0]
                                : null;
                              navigate(firstSlug
                                ? `/career-board/${slug}/course/${firstSlug}`
                                : `/career-board/${slug}`
                              );
                            }}
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            Career Board
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: build succeeds with no TypeScript errors. If errors appear, fix them before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "feat: lock Career Readiness card for free users with upgrade CTA"
```

---

### Task 3: Manual verification

**Files:** No code changes — browser check only.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Navigate to `http://localhost:5173` (or whichever port Vite starts on).

- [ ] **Step 2: Verify locked state (free user)**

Sign in as a user without an active Pro subscription. Go to the Profile/Dashboard page.

Check:
- Career Readiness card shows "Pro Only" badge (lock icon, top-right)
- Course rows are greyed out with `— %` and empty progress bars; rows are not clickable
- Right panel (gauge + Career Board button) is blurred and non-interactive
- Bottom CTA strip shows "Unlock career readiness tracking / Available on Pro plan"
- "Upgrade to Pro →" button is visible and navigates to `/choose-plan` when clicked

- [ ] **Step 3: Verify unlocked state (pro user)**

Sign in as a user with an active Pro subscription (or temporarily change `isPro` to `true` in the hook call for testing). Go to the Profile/Dashboard page.

Check:
- Career Readiness card shows normally — no "Pro Only" badge, no lock
- Course rows are interactive with real percentages and progress bars
- Right panel (gauge + Career Board button) is fully visible and interactive
- No CTA strip at the bottom
