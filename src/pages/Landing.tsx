import "../styles/landing.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="l-why-icon">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588 4 4 0 0 0 7.636 2.106 3.2 3.2 0 0 0 .164-.546A3 3 0 0 0 12 18V5z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588 4 4 0 0 1-7.636 2.106 3.2 3.2 0 0 1-.164-.546A3 3 0 0 1 12 18V5z" />
  </svg>
);

const CodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="l-why-icon">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const TrendingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="l-why-icon">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="l-why-icon">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const DataIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="l-career-icon">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const RouteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="l-career-icon">
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  </svg>
);

const BarChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="l-career-icon">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const MLIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="l-career-icon">
    <circle cx="12" cy="12" r="3" />
    <circle cx="4" cy="6" r="2" />
    <circle cx="20" cy="6" r="2" />
    <circle cx="4" cy="18" r="2" />
    <circle cx="20" cy="18" r="2" />
    <line x1="6" y1="6" x2="10" y2="10" />
    <line x1="18" y1="6" x2="14" y2="10" />
    <line x1="6" y1="18" x2="10" y2="14" />
    <line x1="18" y1="18" x2="14" y2="14" />
  </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────

const COURSES = [
  {
    tag: "Machine Learning",
    title: "Supervised Learning with scikit-learn",
    desc: "Master the core algorithms behind predictive models — regression, classification, and model evaluation.",
    progress: 68,
    time: "8h 20m",
  },
  {
    tag: "Deep Learning",
    title: "Neural Networks & PyTorch",
    desc: "Build and train neural networks from scratch with hands-on PyTorch projects.",
    progress: 34,
    time: "12h 45m",
  },
  {
    tag: "Python",
    title: "Python for Data Science",
    desc: "NumPy, pandas, and matplotlib workflows used by working data scientists every day.",
    progress: 91,
    time: "6h 10m",
  },
  {
    tag: "SQL",
    title: "Advanced SQL for Analytics",
    desc: "Window functions, CTEs, query optimization, and analytical patterns for real datasets.",
    progress: 0,
    time: "5h 30m",
  },
];

const CAREERS = [
  {
    icon: <DataIcon />,
    title: "Data Scientist",
    desc: "Build models, derive insights, and communicate findings with statistical rigour.",
    steps: [true, true, true, false, false, false],
  },
  {
    icon: <MLIcon />,
    title: "ML Engineer",
    desc: "Deploy and scale machine learning systems in production environments.",
    steps: [true, true, false, false, false, false],
  },
  {
    icon: <BarChartIcon />,
    title: "Data Analyst",
    desc: "Turn raw data into decisions using SQL, dashboards, and statistical analysis.",
    steps: [true, true, true, true, false, false],
  },
  {
    icon: <RouteIcon />,
    title: "AI Product Manager",
    desc: "Define strategy and roadmaps for AI-powered products with technical fluency.",
    steps: [true, false, false, false, false, false],
  },
];

const WHY_ITEMS = [
  {
    icon: <BrainIcon />,
    title: "Concepts, not just commands",
    body: "We explain the math and intuition behind every technique — so you understand why, not just how.",
  },
  {
    icon: <CodeIcon />,
    title: "Real code from day one",
    body: "Every lesson ships with runnable notebooks and production-grade examples you actually keep.",
  },
  {
    icon: <TrendingIcon />,
    title: "Built for career growth",
    body: "Curated paths map directly to job roles. Know exactly what to learn next and why it matters.",
  },
  {
    icon: <UsersIcon />,
    title: "A community of practitioners",
    body: "Ask questions, share projects, and get unstuck — alongside engineers already working in the field.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="l-root bg-background text-foreground">
      {/* Existing site header */}
      <Header />

      {/* Offset for fixed header (primary 64px + secondary nav 40px) */}
      <div style={{ paddingTop: 104 }}>

        {/* ── Hero — full-width muted bg matching Why section ────────────────── */}
        <section className="l-hero-section bg-muted/30 border-b border-border">
          <div className="l-container">
            <div className="l-hero">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }}>
                {/* Left: Hero content */}
                <div className="l-hero-inner">

                  <h1 className="l-h1 text-foreground">
                    Learn once. <em className="text-primary">Remember forever.</em>
                  </h1>

                  <p className="l-sub text-muted-foreground">
                    Master AI through structured thinking, real code, and deep understanding.
                  </p>

                  <div className="l-ctas">
                    <button className="l-btn-primary bg-primary text-primary-foreground hover:bg-primary/90">
                      Start learning free
                    </button>
                    <button className="l-btn-ghost text-foreground border-border hover:bg-muted">
                      Browse paths
                    </button>
                  </div>

                  <div className="l-stats border-t border-border">
                    <div>
                      <div className="l-stat-num text-foreground">42+</div>
                      <div className="l-stat-label text-muted-foreground">Structured paths</div>
                    </div>
                    <div>
                      <div className="l-stat-num text-foreground">18k</div>
                      <div className="l-stat-label text-muted-foreground">Active learners</div>
                    </div>
                    <div>
                      <div className="l-stat-num text-foreground">96%</div>
                      <div className="l-stat-label text-muted-foreground">Completion rate</div>
                    </div>
                  </div>
                </div>

                {/* Right: Mascot */}
                <div className="l-hero-mascot" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
                    <img
                      src="/final_ant.png"
                      alt="UnlockMemory mascot"
                      style={{ width: "100%", height: "auto", animation: "heroFloat 4s ease-in-out infinite", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.12))" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="l-container">
          {/* ── Courses ──────────────────────────────────────────────────────── */}
          <section className="l-section">
            <div className="l-section-hd">
              <p className="l-eyebrow text-muted-foreground">Courses</p>
              <h2 className="l-section-title text-foreground">Pick up where you left off</h2>
              <p className="l-section-sub text-muted-foreground">
                Bite-sized lessons with real projects — from fundamentals to advanced production techniques.
              </p>
            </div>
            <div className="l-card-grid">
              {COURSES.map((c) => (
                <div className="l-course-card bg-card border-border hover:border-border/80" key={c.title}>
                  <span className="l-course-tag bg-muted text-muted-foreground">{c.tag}</span>
                  <p className="l-course-title text-foreground">{c.title}</p>
                  <p className="l-course-desc text-muted-foreground">{c.desc}</p>
                  <div className="l-progress-wrap bg-muted">
                    <div className="l-progress-fill bg-primary" style={{ width: `${c.progress}%` }} />
                  </div>
                  <div className="l-course-meta text-muted-foreground">
                    <span>{c.time}</span>
                    <span>{c.progress}% complete</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Career Paths ─────────────────────────────────────────────────── */}
          <section className="l-section">
            <div className="l-section-hd">
              <p className="l-eyebrow text-muted-foreground">Career Paths</p>
              <h2 className="l-section-title text-foreground">Know exactly what to learn next</h2>
              <p className="l-section-sub text-muted-foreground">
                Role-based roadmaps built with hiring managers — every skill maps to real job requirements.
              </p>
            </div>
            <div className="l-card-grid">
              {CAREERS.map((c) => (
                <div className="l-career-card bg-card border-border hover:border-border/80" key={c.title}>
                  <div className="l-career-icon bg-primary/10 text-primary">{c.icon}</div>
                  <p className="l-career-title text-foreground">{c.title}</p>
                  <p className="l-career-desc text-muted-foreground">{c.desc}</p>
                  <div className="l-roadmap">
                    {c.steps.map((done, i) => (
                      <span key={i} className="l-roadmap-step">
                        <span className={`l-rdot bg-primary${done ? "" : " l-rdot-off"}`} />
                        {i < c.steps.length - 1 && <span className="l-rline bg-border" />}
                      </span>
                    ))}
                  </div>
                  <div className="l-career-cta text-primary">View path →</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Why Section ────────────────────────────────────────────────────── */}
        <section className="l-why bg-muted/30 border-y border-border">
          <div className="l-container">
            <div className="l-section-hd" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 40px" }}>
              <p className="l-eyebrow text-muted-foreground">Why UnlockMemory</p>
              <h2 className="l-section-title text-foreground">Designed for depth</h2>
            </div>
            <div className="l-why-grid">
              {WHY_ITEMS.map((item, i) => (
                <div className={`l-why-cell bg-background${i < WHY_ITEMS.length - 1 ? " l-why-cell-border border-border" : ""}`} key={item.title}>
                  <span className="text-primary">{item.icon}</span>
                  <p className="l-why-title text-foreground">{item.title}</p>
                  <p className="l-why-body text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Card ─────────────────────────────────────────────────────── */}
        <div className="l-container">
          <section className="l-cta-section">
            <div className="l-cta-card bg-card border-border">
              <p className="l-eyebrow text-muted-foreground">Get started</p>
              <h2 className="l-cta-title text-foreground">Your first lesson is free</h2>
              <p className="l-cta-sub text-muted-foreground">
                Enter your email and we'll send you a curated starter path based on your goals — no credit card, no commitment.
              </p>
              <input
                className="l-cta-input bg-muted border-border text-foreground"
                type="email"
                placeholder="you@example.com"
              />
              <button className="l-cta-btn bg-primary text-primary-foreground hover:bg-primary/90">
                Start learning free
              </button>
            </div>
          </section>
        </div>

        {/* Existing site footer */}
        <Footer />
      </div>
    </div>
  );
}
