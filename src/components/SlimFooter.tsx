import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Courses", to: "/courses" },
  { label: "Careers", to: "/careers" },
  { label: "About",   to: "/about" },
  { label: "Contact", to: "/contact" },
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
