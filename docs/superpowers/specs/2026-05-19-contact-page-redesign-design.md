# Contact Page Redesign — Concept B "Split Screen"

**Date:** 2026-05-19
**Files changed:** `src/pages/Contact.tsx`, new migration `supabase/migrations/20260519000001_contact_submissions.sql`
**Status:** Approved for implementation

---

## Goal

Replace the non-functional 3-column card layout with a full-viewport split-screen design that:
- Is functional — submissions stored in Supabase `contact_submissions` table
- Removes fake phone/address data
- Uses the brand green left panel (matches About page hero aesthetic)
- Validates with react-hook-form + Zod
- Shows inline success/error states

---

## Page Layout

```
<Layout>
  <div class="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
    <LeftPanel />   ← bg-primary, sticky on lg
    <RightPanel />  ← bg-background, scrollable
  </div>
</Layout>
```

No outer container padding — panels go full-bleed.

---

## Left Panel

- **Width:** `w-full lg:w-1/2`
- **Background:** `bg-primary`
- **Sticky:** `lg:sticky lg:top-16 lg:h-[calc(100vh-64px)]` (top-16 accounts for fixed header)
- **Padding:** `px-10 py-16 lg:px-16`
- **Layout:** `flex flex-col justify-between`

**Top block:**
- Eyebrow: `CONTACT US` — `text-xs tracking-widest text-primary-foreground/60 uppercase mb-6`
- H1: `"Let's talk."` — `text-5xl font-bold text-primary-foreground leading-tight`
- Bullet list (3 items with `•` accent in `text-primary-foreground/40`), `text-primary-foreground/80 text-base mt-6 space-y-3`:
  - Course or curriculum questions
  - Technical issues & account help
  - Partnerships & collaborations

**Middle block (`mt-12`):**
- Label: `REACH US DIRECTLY` — `text-xs tracking-widest text-primary-foreground/50 uppercase mb-3`
- Email link `<a href="mailto:hello@unlockmemory.com">` — `text-primary-foreground text-lg font-medium hover:underline underline-offset-4`
- Response badge: `mt-4 inline-flex items-center gap-1.5 bg-primary-foreground/10 text-primary-foreground/80 text-xs px-3 py-1.5 rounded-full`
  - `⚡ We reply within 24 hours`

**Bottom block (`mt-auto pt-12`):**
- Social icon row — Twitter/X + LinkedIn as `<a>` tags with Lucide icons, `text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors`

---

## Right Panel

- **Width:** `w-full lg:w-1/2`
- **Background:** `bg-background`
- **Padding:** `px-8 py-16 lg:px-16 lg:py-24`
- **Inner container:** `max-w-lg mx-auto`

**Form heading:**
- `text-2xl font-bold text-foreground mb-1`: `"Send us a message"`
- `text-sm text-muted-foreground mb-8`: `"Fill in the form and we'll get back to you shortly."`

**Fields (react-hook-form + Zod):**

| Field | Component | Validation |
|---|---|---|
| Name | `<Input>` | required, min 2 chars |
| Email | `<Input type="email">` | required, valid email |
| Topic | shadcn `<Select>` | required |
| Message | `<Textarea rows={5}>` | required, min 10 chars |

Topic options: Course Question · Technical Issue · Billing · Partnership · Other

**Inline errors:** `<p className="text-destructive text-xs mt-1">` below each field on blur/submit

**Submit button:** `w-full`, size `lg`, disabled + spinner while submitting

**Success state (replaces form):**
- `<CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />`
- `"Message sent!"` — `text-xl font-semibold text-center`
- `"We'll get back to you within 24 hours."` — `text-muted-foreground text-center text-sm mt-2`
- `<Button variant="outline" onClick={reset}>Send another message</Button>`

**Error state:** `<Alert variant="destructive">` above form, form remains visible

---

## Database Migration

File: `supabase/migrations/20260519000001_contact_submissions.sql`

```sql
create table contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  topic       text not null,
  message     text not null,
  status      text not null default 'unread',
  created_at  timestamptz not null default now()
);

-- Anyone (even anon) can INSERT; only service_role can read
alter table contact_submissions enable row level security;

create policy "Anyone can submit contact form"
  on contact_submissions for insert
  to anon, authenticated
  with check (true);
```

---

## Form Submission Logic

```typescript
const onSubmit = async (data) => {
  setSubmitting(true);
  const { error } = await supabase
    .from('contact_submissions')
    .insert({ name, email, topic, message });
  if (error) setSubmitError(error.message);
  else setSubmitted(true);
  setSubmitting(false);
};
```

---

## Dependencies

- `react-hook-form` — already installed (used in other forms)
- `zod` + `@hookform/resolvers` — already installed
- All shadcn components used (`Input`, `Textarea`, `Select`, `Button`, `Alert`) — already available
- Lucide icons: `CheckCircle2`, `Loader2`, `Twitter`, `Linkedin` — already in lucide-react

---

## What is NOT changing

- Route `/contact` — unchanged
- `Layout` wrapper — unchanged
- `SEOHead` — unchanged
- No new npm dependencies
