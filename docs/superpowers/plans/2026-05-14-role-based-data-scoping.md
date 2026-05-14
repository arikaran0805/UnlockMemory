# Role-Based Data Scoping — Senior Moderator & Content Moderator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope all data pages for the Senior Moderator (Course Manager) role to their own content, and add 5 new pages to the Content Moderator (Moderator) role with equivalent scoping.

**Architecture:** Each page gains an owner-scoped filter inline — non-admin users see only data tied to their authored posts, their uploaded media, or their assigned courses. Each page fetches `posts where author_id = userId` directly inside its own fetch function when needed. AdminApprovals gains a two-step fetch (get team moderator IDs from `course_assignments` → filter pending posts by those authors). Five new routes and sidebar entries are added to the Moderator role.

**Tech Stack:** React 18, TypeScript, Supabase (direct client calls), shadcn/ui, lucide-react, React Router v6

---

## File Map

| File | Change |
|------|--------|
| `src/pages/AdminPosts.tsx` | **Modify** — senior_mod + moderator see own posts + posts in assigned courses |
| `src/pages/AdminMedia.tsx` | **Modify** — senior_moderator filtered to own uploads (like moderator already is) |
| `src/pages/AdminComments.tsx` | **Modify** — non-admins see comments on own posts only |
| `src/pages/AdminAnnotations.tsx` | **Modify** — add role filtering: non-admins see annotations on own posts only |
| `src/pages/AdminTags.tsx` | **Modify** — non-admins see tags they created + tags used on posts in their courses |
| `src/pages/AdminApprovals.tsx` | **Modify** — senior_mod sees pending posts from team moderators; moderator sees own |
| `src/pages/AdminReports.tsx` | **Modify** — non-admins see reports on own posts only |
| `src/sidebar/moderator.sidebar.ts` | **Modify** — add Courses, Tags, Media Library, Annotations, Reports entries |
| `src/routes/moderator.routes.tsx` | **Modify** — add routes for Courses, Media, Annotations, Tags, Reports pages |

---

## Task 1: Update `AdminPosts.tsx` — senior_mod + moderator post scoping

**Files:**
- Modify: `src/pages/AdminPosts.tsx` (lines ~193–350)

The current `fetchPosts` has 3 modes: admin (no filter), senior_mod (`category_id IN courseIds`), moderator (`author_id = userId OR assigned_to = userId`).

New behaviour for both senior_mod and moderator:
- Has assigned courses: `category_id IN courseIds OR author_id = userId`
- No assigned courses: `author_id = userId` only

- [ ] **Step 1: Add `scopedCourseIds` and `isAdminUser` state**

Find the existing state block (~line 193) and add two new state variables after `moderatorOnly` and `currentUserId`:

```typescript
const [scopedCourseIds, setScopedCourseIds] = useState<string[]>([]);
const [isAdminUser, setIsAdminUser] = useState(false);
```

- [ ] **Step 2: Refactor `checkAdminAccess` to fetch courses for both senior_mod and moderator**

Find the block at ~line 247 (`const roles = ...`). Replace from `const roles =` through the end of the `if/else` that calls `fetchPosts`:

```typescript
const roles = (rolesData || []).map((r) => r.role);
const isModeratorRole = roles.includes("moderator") && !roles.includes("admin");
const isSeniorModRole = roles.includes("senior_moderator") && !roles.includes("admin");
const adminUser = roles.includes("admin");

setModeratorOnly(isModeratorRole);
setIsAdminUser(adminUser);
setCurrentUserId(session.user.id);

if (isSeniorModRole || isModeratorRole) {
  const assignedRole = isSeniorModRole ? "senior_moderator" : "moderator";
  const { data: assignmentData } = await supabase
    .from("course_assignments")
    .select("course_id")
    .eq("user_id", session.user.id)
    .eq("role", assignedRole);
  const courseIds = (assignmentData || []).map((r: any) => r.course_id);
  setScopedCourseIds(courseIds);
  await fetchPosts(session.user.id, adminUser, courseIds);
} else {
  await fetchPosts(session.user.id, adminUser, []);
}
```

- [ ] **Step 3: Replace `fetchPosts` signature and filter logic**

Replace the function signature and the filter block (~lines 303–322):

```typescript
const fetchPosts = async (viewerUserId: string, adminUser: boolean, courseIds: string[]) => {
  try {
    let query = supabase
      .from("posts")
      .select(
        "id, title, slug, status, published_at, created_at, updated_at, category_id, author_id, assigned_to, courses:category_id(slug)"
      );

    if (!adminUser) {
      if (courseIds.length > 0) {
        query = query.or(
          `category_id.in.(${courseIds.join(",")}),author_id.eq.${viewerUserId}`
        );
      } else {
        query = query.eq("author_id", viewerUserId);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    // rest of the function body is unchanged from here
```

- [ ] **Step 4: Update all other `fetchPosts` call sites to use stored state**

Run `grep -n "fetchPosts(" src/pages/AdminPosts.tsx` — there are 4 call sites after `checkAdminAccess` (around lines 459, 652, 895, 1320). Each currently reads `fetchPosts(currentUserId, moderatorOnly)`. Replace each with:

```typescript
fetchPosts(currentUserId!, isAdminUser, scopedCourseIds);
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPosts.tsx
git commit -m "feat: scope posts to own + assigned courses for senior_mod and moderator"
```

---

## Task 2: Update `AdminMedia.tsx` — senior_moderator sees own uploads only

**Files:**
- Modify: `src/pages/AdminMedia.tsx` (~lines 79–94)

- [ ] **Step 1: Extend the own-uploads filter to include senior_moderator**

Find in `checkAdminAccess` (~line 79):

```typescript
// Before:
const roles = roleData.map(r => r.role);
const moderatorOnly = roles.includes("moderator") && !roles.includes("admin");
setIsModerator(moderatorOnly);
fetchMedia(session.user.id, moderatorOnly);

// After:
const roles = roleData.map(r => r.role);
const ownUploadsOnly =
  (roles.includes("moderator") || roles.includes("senior_moderator")) &&
  !roles.includes("admin");
setIsModerator(ownUploadsOnly);
fetchMedia(session.user.id, ownUploadsOnly);
```

The `isModerator` state name is kept — it drives the UI (upload button visibility etc.), and the existing `if (moderatorOnly)` filter inside `fetchMedia` (~line 93) is already correct. No other changes needed.

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminMedia.tsx
git commit -m "feat: restrict senior_moderator media to own uploads"
```

---

## Task 3: Update `AdminComments.tsx` — filter comments by own posts

**Files:**
- Modify: `src/pages/AdminComments.tsx` (~lines 131–151)

Currently non-admins see comments on posts in their `courseIds`. Change: non-admins see comments only on posts they authored.

- [ ] **Step 1: Replace the courseIds-based filter inside `fetchComments`**

Find the `if (!userIsAdmin)` block (~line 131) and replace entirely:

```typescript
if (!userIsAdmin) {
  const { data: ownPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", userId);
  const ownPostIds = (ownPosts || []).map((p) => p.id);
  if (ownPostIds.length > 0) {
    query = query.in("post_id", ownPostIds);
  } else {
    setComments([]);
    setLoading(false);
    return;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminComments.tsx
git commit -m "feat: scope comments to own posts for senior_mod and moderator"
```

---

## Task 4: Update `AdminAnnotations.tsx` — add role-based filtering

**Files:**
- Modify: `src/pages/AdminAnnotations.tsx` (~lines 62–134)

Currently no role filtering. Non-admins will see annotations only on posts they authored.

- [ ] **Step 1: Add `currentUserId` and `isAdminUser` state**

After the existing `useState` declarations (~line 64):

```typescript
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [isAdminUser, setIsAdminUser] = useState(false);
```

- [ ] **Step 2: Update `checkAccess` to capture userId and admin flag, remove its `fetchAnnotations()` call**

In `checkAccess` (~line 80), after the role check passes, replace `setLoading(false); fetchAnnotations();` with:

```typescript
const roles = rolesData.map((r: any) => r.role);
const adminUser = roles.includes("admin");
setIsAdminUser(adminUser);
setCurrentUserId(session.user.id);
setLoading(false);
// fetchAnnotations() removed — the useEffect below handles it
```

- [ ] **Step 3: Replace the statusFilter `useEffect` with one that also depends on `currentUserId`**

Replace the existing:
```typescript
useEffect(() => {
  if (!loading) {
    fetchAnnotations();
  }
}, [statusFilter]);
```

With:
```typescript
useEffect(() => {
  if (currentUserId !== null) {
    fetchAnnotations();
  }
}, [currentUserId, statusFilter]);
```

- [ ] **Step 4: Add the role filter inside `fetchAnnotations`**

In `fetchAnnotations` (~line 103), after building the base `query` and before the status filter line (`if (statusFilter !== "all")`), insert:

```typescript
if (!isAdminUser && currentUserId) {
  const { data: ownPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", currentUserId);
  const ownPostIds = (ownPosts || []).map((p: any) => p.id);
  if (ownPostIds.length > 0) {
    query = query.in("post_id", ownPostIds);
  } else {
    setAnnotations([]);
    return;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminAnnotations.tsx
git commit -m "feat: scope annotations to own posts for senior_mod and moderator"
```

---

## Task 5: Update `AdminTags.tsx` — filter by own tags + course-scoped tags

**Files:**
- Modify: `src/pages/AdminTags.tsx` (~lines 36–134)

Non-admins see: tags they created (`author_id = userId`) plus tags used on posts in their assigned courses.

- [ ] **Step 1: Add `currentUserId`, `isAdminUser`, `scopedCourseIds`, and `accessChecked` state**

After existing state declarations (~line 39):

```typescript
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [isAdminUser, setIsAdminUser] = useState(false);
const [scopedCourseIds, setScopedCourseIds] = useState<string[]>([]);
const [accessChecked, setAccessChecked] = useState(false);
```

- [ ] **Step 2: Replace `checkAdminAccess` body**

```typescript
const checkAdminAccess = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { navigate("/auth"); return; }

    const { data: rolesData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "moderator", "senior_moderator"]);

    if (roleError) throw roleError;
    if (!rolesData || rolesData.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have admin or moderator privileges",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    const roles = rolesData.map((r) => r.role);
    const adminUser = roles.includes("admin");
    const assignedRole = roles.includes("senior_moderator")
      ? "senior_moderator"
      : roles.includes("moderator")
      ? "moderator"
      : null;

    setIsAdminUser(adminUser);
    setCurrentUserId(session.user.id);

    if (!adminUser && assignedRole) {
      const { data: assignmentData } = await supabase
        .from("course_assignments")
        .select("course_id")
        .eq("user_id", session.user.id)
        .eq("role", assignedRole);
      setScopedCourseIds((assignmentData || []).map((r: any) => r.course_id));
    }

    setAccessChecked(true);
  } catch (error: any) {
    console.error("Error checking access:", error);
    navigate("/");
  }
};
```

- [ ] **Step 3: Replace the initial `useEffect` so `fetchTags` runs only after access is checked**

Replace:
```typescript
useEffect(() => {
  checkAdminAccess();
  fetchTags();
}, []);
```

With:
```typescript
useEffect(() => {
  checkAdminAccess();
}, []);

useEffect(() => {
  if (accessChecked) {
    fetchTags();
  }
}, [accessChecked]);
```

- [ ] **Step 4: Replace `fetchTags` with a scoped version**

```typescript
const fetchTags = async () => {
  try {
    setLoading(true);

    // Build the set of tag IDs used on posts in assigned courses (for non-admins)
    let scopedTagIds: string[] = [];
    if (!isAdminUser && scopedCourseIds.length > 0) {
      const { data: coursePosts } = await supabase
        .from("posts")
        .select("id")
        .in("category_id", scopedCourseIds);
      const coursePostIds = (coursePosts || []).map((p: any) => p.id);
      if (coursePostIds.length > 0) {
        const { data: postTagData } = await supabase
          .from("post_tags")
          .select("tag_id")
          .in("post_id", coursePostIds);
        scopedTagIds = [...new Set((postTagData || []).map((r: any) => r.tag_id))];
      }
    }

    let query = supabase.from("tags").select("*").order("name");

    if (!isAdminUser) {
      if (!currentUserId) { setTags([]); setLoading(false); return; }
      if (scopedTagIds.length > 0) {
        query = query.or(
          `author_id.eq.${currentUserId},id.in.(${scopedTagIds.join(",")})`
        );
      } else {
        query = query.eq("author_id", currentUserId);
      }
    }

    const { data: tagsData, error: tagsError } = await query;
    if (tagsError) throw tagsError;

    const tagsWithCounts = await Promise.all(
      (tagsData || []).map(async (tag) => {
        const { count } = await supabase
          .from("post_tags")
          .select("*", { count: "exact", head: true })
          .eq("tag_id", tag.id);
        return { ...tag, post_count: count || 0 };
      })
    );

    setTags(tagsWithCounts);
  } catch (error: any) {
    console.error("Error fetching tags:", error);
    toast({ title: "Error", description: "Failed to load tags", variant: "destructive" });
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminTags.tsx
git commit -m "feat: scope tags to own + course-linked tags for senior_mod and moderator"
```

---

## Task 6: Update `AdminApprovals.tsx` — team-scoped approvals

**Files:**
- Modify: `src/pages/AdminApprovals.tsx` (~lines 76–180)

New behaviour:
- Admin: all pending posts/courses
- Senior mod: pending posts where `author_id IN (moderators assigned to same courses)` AND `category_id IN courseIds`
- Moderator: pending posts/courses where `author_id = userId`

- [ ] **Step 1: Add `useAuth` import and get `userId`**

Add to the import block at the top:
```typescript
import { useAuth } from "@/hooks/useAuth";
```

Inside the component (~line 72), add next to the existing hooks:
```typescript
const { userId } = useAuth();
```

- [ ] **Step 2: Replace `fetchPendingPosts` filter logic**

Find `fetchPendingPosts` (~line 121). Replace the `if (!isAdmin && ...)` block with:

```typescript
if (!isAdmin) {
  if (isSeniorMod) {
    // Show pending posts submitted by moderators assigned to the same courses
    if (courseIds.length === 0) { setPendingPosts([]); return; }
    const { data: modData } = await supabase
      .from("course_assignments")
      .select("user_id")
      .in("course_id", courseIds)
      .eq("role", "moderator");
    const moderatorIds = [...new Set((modData || []).map((r: any) => r.user_id))];
    if (moderatorIds.length === 0) { setPendingPosts([]); return; }
    query = query.in("author_id", moderatorIds).in("category_id", courseIds);
  } else {
    // Moderator: only own submitted posts
    if (!userId) { setPendingPosts([]); return; }
    query = query.eq("author_id", userId);
  }
}
```

- [ ] **Step 3: Update `fetchPendingCourses` for moderator**

Find `fetchPendingCourses` (~line 154). Replace the `if (!isAdmin && ...)` block with:

```typescript
if (!isAdmin) {
  if (isSeniorMod) {
    if (courseIds.length > 0) {
      query = query.in("id", courseIds);
    } else {
      setPendingCourses([]);
      return;
    }
  } else {
    // Moderator: only own submitted courses
    if (!userId) { setPendingCourses([]); return; }
    query = query.eq("author_id", userId);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminApprovals.tsx
git commit -m "feat: scope approvals — senior_mod sees team submissions, moderator sees own"
```

---

## Task 7: Update `AdminReports.tsx` — filter reports to own posts

**Files:**
- Modify: `src/pages/AdminReports.tsx` (~lines 68–110)

Currently non-admins filter by `content_id IN courseIds`. Change: non-admins see reports only where `content_id` is one of their authored post IDs.

- [ ] **Step 1: Add `useAuth` import and get `userId`**

Add to the import block:
```typescript
import { useAuth } from "@/hooks/useAuth";
```

Inside the component (~line 76), add:
```typescript
const { userId } = useAuth();
```

- [ ] **Step 2: Replace the filter in `fetchReports`**

Find (~line 107):
```typescript
// Before:
if (!isAdmin && courseIds.length > 0) {
  query = query.in("content_id", courseIds);
}
```

Replace with:
```typescript
if (!isAdmin) {
  if (!userId) { setReports([]); setLoading(false); return; }
  const { data: ownPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", userId);
  const ownPostIds = (ownPosts || []).map((p) => p.id);
  if (ownPostIds.length > 0) {
    query = query.in("content_id", ownPostIds);
  } else {
    setReports([]);
    setLoading(false);
    return;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminReports.tsx
git commit -m "feat: scope reports to own posts for senior_mod and moderator"
```

---

## Task 8: Add new pages to Moderator sidebar

**Files:**
- Modify: `src/sidebar/moderator.sidebar.ts`

Add: Courses + Tags (Content section), Media Library + Annotations (new Moderation section), Reports (Review section).

- [ ] **Step 1: Update lucide-react import to include new icons**

```typescript
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  ClipboardList,
  Activity,
  Award,
  MessageCircle,
  GraduationCap,
  Tags,
  Image,
  MessageSquarePlus,
  Gavel,
} from "lucide-react";
```

- [ ] **Step 2: Update Content section to include Courses and Tags**

```typescript
const contentSection: SidebarSection = {
  title: "Content",
  items: [
    { icon: BookOpen, label: "My Content", path: "/moderator/content" },
    { icon: GraduationCap, label: "Courses", path: "/moderator/courses" },
    { icon: Tags, label: "Tags", path: "/moderator/tags" },
  ],
};
```

- [ ] **Step 3: Update Review section to include Reports**

```typescript
const reviewSection: SidebarSection = {
  title: "Review",
  items: [
    { icon: ClipboardList, label: "Review Queue", path: "/moderator/review" },
    { icon: Gavel, label: "Reports", path: "/moderator/reports" },
    { icon: Award, label: "Certificates", path: "/moderator/certificates" },
    { icon: MessageSquare, label: "Comments", path: "/moderator/comments" },
  ],
};
```

- [ ] **Step 4: Add a new Moderation section**

Add after `reviewSection`:
```typescript
const moderationSection: SidebarSection = {
  title: "Moderation",
  items: [
    { icon: Image, label: "Media Library", path: "/moderator/media" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/moderator/annotations" },
  ],
};
```

- [ ] **Step 5: Update the exported sections array**

```typescript
export const moderatorSidebarConfig: SidebarConfig = {
  sections: [
    overviewSection,
    contentSection,
    reviewSection,
    moderationSection,
    messagingSection,
    activitySection,
  ],
  roleLabel: "Content Moderator",
  roleColor: {
    // unchanged
```

- [ ] **Step 6: Commit**

```bash
git add src/sidebar/moderator.sidebar.ts
git commit -m "feat: add Courses, Tags, Media, Annotations, Reports to moderator sidebar"
```

---

## Task 9: Add new routes to Moderator routes

**Files:**
- Modify: `src/routes/moderator.routes.tsx`

- [ ] **Step 1: Add new page imports after existing imports**

```typescript
import AdminCoursesPanel from "@/pages/AdminCoursesPanel";
import AdminCourseEditor from "@/pages/AdminCourseEditor";
import AdminMedia from "@/pages/AdminMedia";
import AdminAnnotations from "@/pages/AdminAnnotations";
import AdminTags from "@/pages/AdminTags";
import AdminReports from "@/pages/AdminReports";
```

- [ ] **Step 2: Add routes inside the `<Routes>` block, after the `comments` route**

```tsx
<Route path="courses" element={<AdminCoursesPanel />} />
<Route path="courses/new" element={<AdminCourseEditor />} />
<Route path="courses/:id" element={<AdminCourseEditor />} />
<Route path="media" element={<AdminMedia />} />
<Route path="annotations" element={<AdminAnnotations />} />
<Route path="tags" element={<AdminTags />} />
<Route path="reports" element={<AdminReports />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/moderator.routes.tsx
git commit -m "feat: add Courses, Media, Annotations, Tags, Reports routes to moderator"
```

---

## Verification Checklist

After all tasks complete, manually verify these scenarios in the browser:

**Senior Moderator (log in as a senior_mod user):**
- [ ] `/senior-moderator/courses` — only shows courses they are assigned to
- [ ] `/senior-moderator/posts` — shows own posts + posts in assigned courses only
- [ ] `/senior-moderator/media` — shows only their own uploaded files
- [ ] `/senior-moderator/comments` — shows only comments on their own posts
- [ ] `/senior-moderator/annotations` — shows only annotations on their own posts
- [ ] `/senior-moderator/tags` — shows tags they created + tags used on posts in their courses
- [ ] `/senior-moderator/approvals` — shows pending posts submitted by moderators in their courses only
- [ ] `/senior-moderator/reports` — shows reports only for their own posts

**Content Moderator (log in as a moderator user):**
- [ ] `/moderator/content` — shows own posts + posts in assigned courses
- [ ] `/moderator/courses` — new page renders; shows only assigned courses
- [ ] `/moderator/tags` — new page renders; shows own tags + tags from assigned courses
- [ ] `/moderator/media` — new page renders; shows only own uploaded files
- [ ] `/moderator/annotations` — new page renders; shows only annotations on own posts
- [ ] `/moderator/review` — shows only own pending submissions
- [ ] `/moderator/reports` — new page renders; shows reports on own posts only
- [ ] `/moderator/comments` — shows only comments on own posts
- [ ] Sidebar shows all 5 new items: Courses, Tags, Media Library, Annotations, Reports
