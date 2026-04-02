/**
 * AdminBreadcrumbHeader
 * 52px sticky header above main content — breadcrumb nav + optional role-preview badge.
 * Does NOT sit above the sidebar; it lives inside <main>.
 */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useViewAsRole } from "@/contexts/ViewAsRoleContext";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BreadcrumbItem {
  label: string;
  path?: string;   // undefined → current (non-clickable)
}

// ─── Role display names ───────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  super_moderator:  "Career Manager",
  senior_moderator: "Course Manager",
  moderator:        "Content Moderator",
  user:             "Learner",
};

// ─── Breadcrumb builder ───────────────────────────────────────────────────────
const buildBreadcrumbs = (
  pathname: string,
  search: string,
): BreadcrumbItem[] => {
  const searchParams = new URLSearchParams(search);

  // ── Detect role prefix ────────────────────────────────────────────────────
  const prefixMap: Record<string, { label: string; root: string }> = {
    "/super-moderator":  { label: "Career Manager",   root: "/super-moderator/dashboard" },
    "/senior-moderator": { label: "Course Manager",   root: "/senior-moderator/dashboard" },
    "/moderator":        { label: "Content Moderator", root: "/moderator/dashboard" },
    "/admin":            { label: "Platform Manager",  root: "/admin" },
  };
  const matchedPrefix = Object.keys(prefixMap).find((p) => pathname.startsWith(p)) ?? "/admin";
  const { label: rootLabel, root: rootPath } = prefixMap[matchedPrefix];
  const root: BreadcrumbItem = { label: rootLabel, path: rootPath };
  const p = matchedPrefix; // short alias

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (pathname === p || pathname === `${p}/dashboard`)
    return [root, { label: "Dashboard" }];

  // ── Common leaf pages (all roles share these segment names) ───────────────
  const leafMap: Record<string, string> = {
    approvals:        "Approval Queue",
    "delete-requests":"Delete Requests",
    reports:          "Reports",
    comments:         "Comments",
    annotations:      "Annotations",
    activity:         "Activity Log",
    "activity-log":   "Activity Log",
    assignments:      "Assignment Logs",
    "team-ownership": "Team Ownership",
    users:            "Users",
    tags:             "Tags",
    authors:          "Roles & Permissions",
    media:            "Media Library",
    monetization:     "Monetization",
    "difficulty-levels": "Difficulty Levels",
    redirects:        "Redirects",
    analytics:        "Analytics",
    "social-analytics":"Social Analytics",
    settings:         "Settings",
    "promo-codes":    "Promo Codes",
    pages:            "Pages",
    content:          "My Content",
    review:           "Review Queue",
    certificates:     "Certificates",
    "message-requests":"Message Requests",
    careers:          "Careers",
  };
  for (const [seg, label] of Object.entries(leafMap)) {
    if (pathname === `${p}/${seg}`) {
      // Team Ownership: ?edit=<id> means we're inside the canvas editor
      if (seg === "team-ownership" && searchParams.has("edit")) {
        const isNew = searchParams.get("new") === "true";
        return [root, { label, path: `${p}/team-ownership` }, { label: isNew ? "New Team" : "Edit Team" }];
      }
      return [root, { label }];
    }
  }

  // ── Posts ─────────────────────────────────────────────────────────────────
  if (pathname === `${p}/posts`) return [root, { label: "Posts" }];
  if (pathname === `${p}/posts/new`)
    return [root, { label: "Posts", path: `${p}/posts` }, { label: "New Post" }];
  if (new RegExp(`^${p}/posts/edit/`).test(pathname))
    return [root, { label: "Posts", path: `${p}/posts` }, { label: "Edit Post" }];
  if (new RegExp(`^${p}/posts/[^/]+/versions`).test(pathname))
    return [root, { label: "Posts", path: `${p}/posts` }, { label: "Version History" }];
  if (new RegExp(`^${p}/posts/`).test(pathname))
    return [root, { label: "Posts", path: `${p}/posts` }, { label: "Edit Post" }];

  // ── Courses ───────────────────────────────────────────────────────────────
  if (pathname === `${p}/courses`) return [root, { label: "Courses" }];
  if (pathname === `${p}/courses/new`)
    return [root, { label: "Courses", path: `${p}/courses` }, { label: "New Course" }];
  if (new RegExp(`^${p}/courses/`).test(pathname))
    return [root, { label: "Courses", path: `${p}/courses` }, { label: "Edit Course" }];

  // ── Admin-only: Monetization ──────────────────────────────────────────────
  if (pathname === `${p}/monetization/new`)
    return [root, { label: "Monetization", path: `${p}/monetization` }, { label: "New Advertisement" }];
  if (new RegExp(`^${p}/monetization/[^/]+$`).test(pathname))
    return [root, { label: "Monetization", path: `${p}/monetization` }, { label: "Edit Advertisement" }];

  // ── Admin-only: Promo Code editor ─────────────────────────────────────────
  if (pathname === `${p}/promo-codes/new`)
    return [root, { label: "Promo Codes", path: `${p}/promo-codes` }, { label: "New Promo Code" }];
  if (new RegExp(`^${p}/promo-codes/[^/]+$`).test(pathname))
    return [root, { label: "Promo Codes", path: `${p}/promo-codes` }, { label: "Edit Promo Code" }];

  // ── Admin-only: Announcement Bar editor ───────────────────────────────────
  if (pathname === `${p}/announcement-bars/new`)
    return [root, { label: "Announcement Bars", path: `${p}/announcement-bars` }, { label: "New Announcement Bar" }];
  if (new RegExp(`^${p}/announcement-bars/[^/]+$`).test(pathname))
    return [root, { label: "Announcement Bars", path: `${p}/announcement-bars` }, { label: "Edit Announcement Bar" }];

  // ── Admin-only: Careers ────────────────────────────────────────────────────
  if (pathname === `${p}/careers/new`)
    return [root, { label: "Careers", path: `${p}/careers` }, { label: "New Career" }];
  if (new RegExp(`^${p}/careers/`).test(pathname))
    return [root, { label: "Careers", path: `${p}/careers` }, { label: "Edit Career" }];

  // ── Admin-only: Practice ───────────────────────────────────────────────────
  const practiceRoot: BreadcrumbItem = { label: "Practice Lab", path: `${p}/practice/skills` };
  if (pathname === `${p}/practice/skills`)
    return [root, { label: "Practice Lab" }];
  if (pathname === `${p}/practice/skills/new`)
    return [root, practiceRoot, { label: "New Skill" }];
  if (/\/practice\/skills\/[^/]+$/.test(pathname) && !pathname.includes("/problems") && !pathname.includes("/predict") && !pathname.includes("/fix-error") && !pathname.includes("/eliminate-wrong"))
    return [root, practiceRoot, { label: "Edit Skill" }];

  // Extract skillId directly from pathname (useParams is unreliable here since
  // this component renders outside the nested <Routes> that define :skillId)
  const skillIdFromPath = pathname.match(/\/practice\/skills\/([^/]+)\//)?.[1];
  const skillBase = skillIdFromPath
    ? `${p}/practice/skills/${skillIdFromPath}`
    : `${p}/practice/skills`;

  if (/\/problems$/.test(pathname))
    return [root, practiceRoot, { label: "Problems" }];
  if (/\/problems\/new$/.test(pathname))
    return [root, practiceRoot, { label: "Problems", path: `${skillBase}/problems` }, { label: "New Problem" }];
  if (/\/problems\/[^/]+$/.test(pathname))
    return [root, practiceRoot, { label: "Problems", path: `${skillBase}/problems` }, { label: "Edit Problem" }];
  if (/\/predict-output$/.test(pathname))
    return [root, practiceRoot, { label: "Predict Output" }];
  if (/\/predict-output\/new$/.test(pathname))
    return [root, practiceRoot, { label: "Predict Output", path: `${skillBase}/predict-output` }, { label: "New" }];
  if (/\/predict-output\/[^/]+$/.test(pathname))
    return [root, practiceRoot, { label: "Predict Output", path: `${skillBase}/predict-output` }, { label: "Edit" }];
  if (/\/fix-error\/new$/.test(pathname))
    return [root, practiceRoot, { label: "Fix Error" }, { label: "New" }];
  if (/\/fix-error\/[^/]+$/.test(pathname))
    return [root, practiceRoot, { label: "Fix Error" }, { label: "Edit" }];
  if (/\/eliminate-wrong\/new$/.test(pathname))
    return [root, practiceRoot, { label: "Eliminate Wrong" }, { label: "New" }];
  if (/\/eliminate-wrong\/[^/]+$/.test(pathname))
    return [root, practiceRoot, { label: "Eliminate Wrong" }, { label: "Edit" }];

  // ── Fallback ───────────────────────────────────────────────────────────────
  return [root];
};

// ─── Component ────────────────────────────────────────────────────────────────
const AdminBreadcrumbHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isViewingAs, viewAsRole, stopViewingAs } = useViewAsRole();

  const handleExitViewAs = () => {
    stopViewingAs();
    navigate("/admin/dashboard");
  };

  const items = buildBreadcrumbs(location.pathname, location.search);

  return (
    <header
      className="sticky top-0 z-40 flex items-center h-[52px] px-8 border-b"
      style={{
        background:   "#ffffff",
        borderColor:  "#E2EAE1",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* ── Left: breadcrumbs ── */}
      <nav className="flex items-center gap-0 min-w-0 flex-1 overflow-hidden">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex items-center min-w-0 shrink-0">
              {/* Separator */}
              {i > 0 && (
                <span
                  className="mx-1.5 text-[11px] select-none"
                  style={{ color: "#B8C9B8" }}
                >
                  ›
                </span>
              )}

              {/* Item */}
              {!isLast && item.path ? (
                <Link
                  to={item.path}
                  className={cn(
                    "text-[13px] transition-colors duration-150 truncate max-w-[140px]",
                    "hover:text-[#1A3A2A] cursor-pointer",
                  )}
                  style={{ color: "#6B8F71" }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "text-[13px] truncate max-w-[180px]",
                    isLast ? "font-medium" : "",
                  )}
                  style={{ color: isLast ? "#1A3A2A" : "#6B8F71" }}
                >
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {/* ── Right: role-preview badge + exit ── */}
      {isViewingAs && viewAsRole && (
        <div className="ml-4 shrink-0 flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border select-none"
            style={{ color: "#92400e", backgroundColor: "#fef3c7", borderColor: "#fde68a" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
            Viewing as {ROLE_LABELS[viewAsRole] ?? viewAsRole}
          </span>
          <button
            onClick={handleExitViewAs}
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors hover:bg-[#E2EAE1]"
            style={{ color: "#1A3A2A", borderColor: "#D4DDD3", backgroundColor: "#EFF3EE" }}
          >
            Exit
          </button>
        </div>
      )}
    </header>
  );
};

export default AdminBreadcrumbHeader;
