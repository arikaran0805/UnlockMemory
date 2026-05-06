# Career Readiness Card — Pro Lock Design

**Date:** 2026-05-06  
**Status:** Approved

## Problem

The Career Readiness card on the user dashboard is currently visible to all authenticated users regardless of subscription tier. It should be locked for free (non-pro) learners to signal the feature's value and drive upgrades.

## Approved Design

**Lock style:** Greyed card with inline CTA (Option B from visual exploration)

### Locked state behaviour

- The card renders in a visually degraded state when `isPro === false`
- Left panel (career list): career rows shown with greyed icons, muted text, empty progress bars, and `— %` in place of real percentages
- Right panel (radial gauge + Career Board button): blurred (`filter: blur(3px)`) and non-interactive (`pointer-events: none`, `user-select: none`, reduced opacity)
- Top-right: "Pro Only" badge (lock icon + label, grey border)
- Bottom: CTA strip with label "Unlock career readiness tracking / Available on Pro plan" and an "Upgrade to Pro →" button linking to `/choose-plan`
- No real user data is rendered in the locked state — existing hooks still run (React rules of hooks), but their values are not displayed; placeholder UI is shown instead

### Unlocked state behaviour

- Identical to the current card — no changes to the existing rendering logic

## Implementation Approach

**Add a `locked` prop to `CareerReadinessCard`** — consistent with how `SkillCard` handles locking in this codebase.

- `locked?: boolean` prop added to `CareerReadinessCard`
- When `locked === true`, the component renders the locked UI instead of the live data UI
- Pro check (`isPro` from `useUserState()`) is done at the call site in `Profile.tsx`, not inside the component, keeping the component pure

## Files to Change

| File | Change |
|------|--------|
| `src/components/CareerReadinessCard.tsx` | Add `locked` prop + locked state rendering |
| `src/pages/Profile.tsx` | Import `useUserState`, pass `locked={!isPro}` to the card |

## CTA Destination

`/choose-plan` — the existing upgrade page used by all other paywalls in the app (ProTeaser, LockedFeatureCard, CertificateTeaser).

## Non-goals

- No changes to actual data fetching — the card's existing hooks/queries are simply not rendered when locked
- No new components — locked state is handled inside `CareerReadinessCard` via the `locked` prop
- No changes to the Career Board page itself — only the dashboard card entry point is locked
