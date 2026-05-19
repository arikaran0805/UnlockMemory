import "../styles/landing.css";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLandingCourses } from "@/hooks/useLandingCourses";
import { useLandingCareers } from "@/hooks/useLandingCareers";
import PublicCourseCard from "@/components/PublicCourseCard";
import PublicCareerCard from "@/components/PublicCareerCard";
import { AdPlacement } from "@/components/AdPlacement";



// ─── Dashboard Illustration ───────────────────────────────────────────────────
// ─── Logged-out illustration — "Skill Constellation" ─────────────────────────
// Five skill nodes in a pentagon orbit around a compass center.
// Clean constellation aesthetic — fresh, no dashboard elements.
const LoggedOutIllustration = () => (
  <svg
    viewBox="0 0 340 290"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="l-cta-illustration"
    aria-hidden="true"
  >
    <defs>
      <pattern id="lo-dot" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.9" fill="#b0c4b8" fillOpacity="0.5" />
      </pattern>
      <linearGradient id="lo-gr-green" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#16A34A" /><stop offset="100%" stopColor="#22C55E" />
      </linearGradient>
      <linearGradient id="lo-gr-purple" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#A78BFA" />
      </linearGradient>
      <linearGradient id="lo-gr-amber" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B45309" /><stop offset="100%" stopColor="#FBBF24" />
      </linearGradient>
      <linearGradient id="lo-gr-sky" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0369A1" /><stop offset="100%" stopColor="#38BDF8" />
      </linearGradient>
      <linearGradient id="lo-gr-rose" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#BE123C" /><stop offset="100%" stopColor="#FB7185" />
      </linearGradient>
      <radialGradient id="lo-center-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="hsl(152, 36%, 33%)" stopOpacity="0.12" />
        <stop offset="100%" stopColor="hsl(152, 36%, 33%)" stopOpacity="0" />
      </radialGradient>
      <filter id="lo-shadow">
        <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.13" />
      </filter>
    </defs>

    {/* Dot-grid background */}
    <rect width="340" height="290" fill="url(#lo-dot)" />

    {/* Radial glow at constellation center */}
    <ellipse cx="170" cy="120" rx="100" ry="92" fill="url(#lo-center-glow)" />

    {/* Concentric orbit rings */}
    <circle cx="170" cy="120" r="40" stroke="hsl(152, 36%, 33%)" strokeWidth="0.7" fill="none" strokeOpacity="0.20" strokeDasharray="3 4" />
    <circle cx="170" cy="120" r="70" stroke="hsl(152, 36%, 33%)" strokeWidth="0.7" fill="none" strokeOpacity="0.13" strokeDasharray="3 6" />
    <circle cx="170" cy="120" r="96" stroke="hsl(152, 36%, 33%)" strokeWidth="0.7" fill="none" strokeOpacity="0.07" />

    {/* Connector lines — center → each node */}
    <line x1="170" y1="120" x2="170" y2="38" stroke="hsl(152, 36%, 33%)" strokeWidth="0.9" strokeDasharray="4 5" strokeOpacity="0.22" />
    <line x1="170" y1="120" x2="248" y2="95" stroke="#8B5CF6" strokeWidth="0.9" strokeDasharray="4 5" strokeOpacity="0.20" />
    <line x1="170" y1="120" x2="218" y2="188" stroke="#F59E0B" strokeWidth="0.9" strokeDasharray="4 5" strokeOpacity="0.18" />
    <line x1="170" y1="120" x2="122" y2="188" stroke="#0EA5E9" strokeWidth="0.9" strokeDasharray="4 5" strokeOpacity="0.18" />
    <line x1="170" y1="120" x2="92" y2="95" stroke="#F43F5E" strokeWidth="0.9" strokeDasharray="4 5" strokeOpacity="0.20" />

    {/* ── CENTER NODE — compass ── */}
    <circle cx="170" cy="120" r="30" fill="white" stroke="#dceee4" strokeWidth="0.8" />
    <circle cx="170" cy="120" r="23" fill="url(#lo-gr-green)" />
    <line x1="170" y1="105" x2="170" y2="135" stroke="white" strokeWidth="1.6" strokeOpacity="0.9" />
    <line x1="155" y1="120" x2="185" y2="120" stroke="white" strokeWidth="1.6" strokeOpacity="0.9" />
    <polygon points="170,106 167,113 173,113" fill="white" />
    <polygon points="185,120 178,117 178,123" fill="white" fillOpacity="0.5" />
    <circle cx="170" cy="120" r="2.5" fill="white" fillOpacity="0.85" />

    {/* ── SKILL NODES (pentagon — computed from center 170,120 r=90) ── */}

    {/* Node 1 — Python (top, 170, 30) */}
    <g filter="url(#lo-shadow)">
      <circle cx="170" cy="30" r="25" fill="url(#lo-gr-green)" />
    </g>
    <text x="170" y="36" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="DM Sans, sans-serif">PY</text>

    {/* Node 2 — Data Science (top-right, 255, 91) */}
    <g filter="url(#lo-shadow)">
      <circle cx="255" cy="91" r="22" fill="url(#lo-gr-purple)" />
    </g>
    <text x="255" y="96" textAnchor="middle" fill="white" fontSize="11.5" fontWeight="700" fontFamily="DM Sans, sans-serif">DS</text>

    {/* Node 3 — Machine Learning (bottom-right, 221, 196) */}
    <g filter="url(#lo-shadow)">
      <circle cx="221" cy="196" r="22" fill="url(#lo-gr-amber)" />
    </g>
    <text x="221" y="201" textAnchor="middle" fill="white" fontSize="11.5" fontWeight="700" fontFamily="DM Sans, sans-serif">ML</text>

    {/* Node 4 — SQL (bottom-left, 119, 196) */}
    <g filter="url(#lo-shadow)">
      <circle cx="119" cy="196" r="22" fill="url(#lo-gr-sky)" />
    </g>
    <text x="119" y="201" textAnchor="middle" fill="white" fontSize="11.5" fontWeight="700" fontFamily="DM Sans, sans-serif">SQL</text>

    {/* Node 5 — Statistics (top-left, 85, 91) */}
    <g filter="url(#lo-shadow)">
      <circle cx="85" cy="91" r="22" fill="url(#lo-gr-rose)" />
    </g>
    <text x="85" y="96" textAnchor="middle" fill="white" fontSize="11.5" fontWeight="700" fontFamily="DM Sans, sans-serif">ST</text>

    {/* Ambient sparkle dots */}
    <circle cx="153" cy="36" r="2.5" fill="hsl(152, 36%, 33%)" fillOpacity="0.3" />
    <circle cx="187" cy="36" r="2" fill="hsl(152, 36%, 33%)" fillOpacity="0.25" />
    <circle cx="267" cy="80" r="2" fill="#8B5CF6" fillOpacity="0.3" />
    <circle cx="73" cy="80" r="2" fill="#F43F5E" fillOpacity="0.3" />
    <circle cx="109" cy="188" r="1.5" fill="#0EA5E9" fillOpacity="0.3" />
    <circle cx="233" cy="186" r="1.5" fill="#F59E0B" fillOpacity="0.3" />

    {/* ── BOTTOM — 3 benefit chips ── */}

    {/* Chip 1 — Streaks */}
    <rect x="12" y="244" width="96" height="36" rx="11" fill="white" stroke="#e0ede8" strokeWidth="0.5" />
    <circle cx="31" cy="262" r="10" fill="#FDBA74" fillOpacity="0.22" />
    <path d="M31 253C28.5 256.5 27 260 28 263C28.5 265.5 29.5 267 31 267C32.5 267 33.5 265.5 34 263C35 260 33.5 256.5 31 253Z" fill="#FB923C" />
    <path d="M31 262C30 260.5 30.5 258.5 31 258.5C31.5 258.5 32 260.5 31 262Z" fill="#FCD34D" />
    <text x="46" y="258" fill="#1D1D1F" fontSize="10" fontWeight="700" fontFamily="DM Sans, sans-serif">Streaks</text>
    <text x="46" y="271" fill="#6E6E73" fontSize="8.5" fontFamily="DM Sans, sans-serif">Daily practice</text>

    {/* Chip 2 — XP */}
    <rect x="120" y="244" width="100" height="36" rx="11" fill="white" stroke="#e0ede8" strokeWidth="0.5" />
    <circle cx="139" cy="262" r="10" fill="#DDD6FE" fillOpacity="0.4" />
    <path d="M142 253L136 263H140L138 271L144 261H140Z" fill="#8B5CF6" />
    <text x="154" y="258" fill="#1D1D1F" fontSize="10" fontWeight="700" fontFamily="DM Sans, sans-serif">Earn XP</text>
    <text x="154" y="271" fill="#6E6E73" fontSize="8.5" fontFamily="DM Sans, sans-serif">Every lesson</text>

    {/* Chip 3 — Badges */}
    <rect x="232" y="244" width="96" height="36" rx="11" fill="white" stroke="#e0ede8" strokeWidth="0.5" />
    <circle cx="251" cy="262" r="10" fill="#FDE68A" fillOpacity="0.4" />
    <path d="M248 255L248 264Q248 267.5 251 267.5Q254 267.5 254 264L254 255Z" fill="#F59E0B" />
    <path d="M248 258Q245 258 245 261.5Q245 265 248 265" stroke="#D97706" strokeWidth="1.2" fill="none" />
    <path d="M254 258Q257 258 257 261.5Q257 265 254 265" stroke="#D97706" strokeWidth="1.2" fill="none" />
    <rect x="249.5" y="267.5" width="3" height="3" fill="#F59E0B" />
    <rect x="247.5" y="270" width="7" height="2" rx="1" fill="#F59E0B" />
    <text x="265" y="258" fill="#1D1D1F" fontSize="10" fontWeight="700" fontFamily="DM Sans, sans-serif">Badges</text>
    <text x="265" y="271" fill="#6E6E73" fontSize="8.5" fontFamily="DM Sans, sans-serif">Unlock them</text>
  </svg>
);

// ─── Logged-in illustration — "Achievement Arc" ────────────────────────────────
// Completely original design: large central arc gauge as the hero,
// profile header strip, bottom 3-column stats. No dashboard copy.
const LoggedInIllustration = () => (
  <svg
    viewBox="0 0 340 290"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="l-cta-illustration"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="li-arc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#22C55E" />
      </linearGradient>
      <linearGradient id="li-flame" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#FCD34D" />
      </linearGradient>
      <linearGradient id="li-hdr" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f0fdf6" />
        <stop offset="100%" stopColor="#f8faf8" />
      </linearGradient>
      <radialGradient id="li-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.06" />
        <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
      </radialGradient>
      <filter id="li-shadow">
        <feDropShadow dx="0" dy="5" stdDeviation="10" floodColor="#000000" floodOpacity="0.08" />
      </filter>
    </defs>

    {/* ── Card ── */}
    <g filter="url(#li-shadow)">
      <rect x="4" y="4" width="332" height="282" rx="16" fill="white" stroke="#e4ede8" strokeWidth="0.5" />
    </g>

    {/* ── Header strip ── */}
    <rect x="4" y="4" width="332" height="54" rx="16" fill="url(#li-hdr)" />
    <rect x="4" y="42" width="332" height="16" fill="url(#li-hdr)" />
    {/* Avatar */}
    <circle cx="30" cy="31" r="16" fill="hsl(152, 36%, 33%)" />
    <text x="30" y="36" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="DM Sans, sans-serif">AK</text>
    {/* Name */}
    <text x="52" y="24" fill="#1D1D1F" fontSize="12.5" fontWeight="700" letterSpacing="-0.02em" fontFamily="DM Sans, sans-serif">Alex Kim</text>
    {/* Career — two tspans in one text element */}
    <text x="52" y="40" fontSize="10" fontFamily="DM Sans, sans-serif">
      <tspan fill="#6E6E73">Aspiring </tspan><tspan fill="hsl(152, 36%, 33%)" fontWeight="600">Data Analyst</tspan>
    </text>
    {/* Streak pill — right side */}
    <rect x="256" y="18" width="72" height="26" rx="13" fill="url(#li-flame)" />
    <text x="292" y="35" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="700" fontFamily="DM Sans, sans-serif">🔥 14 days</text>
    {/* Header divider */}
    <line x1="12" y1="58" x2="328" y2="58" stroke="#efefef" strokeWidth="0.8" />

    {/* ── Hero gauge — large arc, center of card ── */}
    {/* Subtle radial glow behind gauge */}
    <ellipse cx="170" cy="148" rx="80" ry="75" fill="url(#li-glow)" />
    {/* Outer decorative ring */}
    <circle cx="170" cy="148" r="72" stroke="#f5f5f5" strokeWidth="1" fill="none" />
    {/* Track */}
    <circle cx="170" cy="148" r="64" stroke="#f0f0f0" strokeWidth="13" fill="none" />
    {/* Inner ring */}
    <circle cx="170" cy="148" r="49" stroke="#f7f7f7" strokeWidth="2" fill="none" />
    {/* Progress arc: 68% — 2π×64 = 402.1 → 273.5 filled */}
    <circle
      cx="170" cy="148" r="64"
      stroke="url(#li-arc)" strokeWidth="13" fill="none"
      strokeLinecap="round"
      strokeDasharray="273.5 402.1"
      transform="rotate(-90 170 148)"
    />
    {/* Arc start dot — top */}
    <circle cx="170" cy="84" r="5" fill="white" stroke="#8B5CF6" strokeWidth="2.5" />
    {/* Arc tip dot: 68%×360°=244.8°, start -90°, end 154.8°
        x=170+64×cos(154.8°)≈170-57.9=112, y=148+64×sin(154.8°)≈148+27.1=175 */}
    <circle cx="112" cy="175" r="5.5" fill="url(#li-arc)" stroke="white" strokeWidth="2" />
    {/* Center percentage */}
    <text x="170" y="141" textAnchor="middle" fill="#1D1D1F" fontSize="28" fontWeight="800" fontFamily="DM Sans, sans-serif" letterSpacing="-0.03em">68%</text>
    <text x="170" y="159" textAnchor="middle" fill="#6E6E73" fontSize="9.5" fontFamily="DM Sans, sans-serif">Career Ready</text>
    {/* Badge under percentage */}
    <rect x="143" y="165" width="54" height="15" rx="7.5" fill="hsl(152, 36%, 33%)" fillOpacity="0.10" />
    <text x="170" y="176" textAnchor="middle" fill="hsl(152, 36%, 33%)" fontSize="8" fontWeight="600" fontFamily="DM Sans, sans-serif">⚡ Skill Builder</text>

    {/* ── Bottom stats — 3 columns ── */}
    <line x1="12" y1="222" x2="328" y2="222" stroke="#f0f0f0" strokeWidth="0.8" />

    {/* Col 1 — Activity bars (x=16–118) */}
    <text x="16" y="237" fill="#3d3d3d" fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">ACTIVITY</text>
    {/* 7 bars anchored at y=272, max height 24px */}
    <rect x="16" y="270" width="9" height="4" rx="1.5" fill="#e5e7eb" />
    <rect x="29" y="258" width="9" height="16" rx="1.5" fill="hsl(152, 36%, 33%)" fillOpacity="0.38" />
    <rect x="42" y="249" width="9" height="25" rx="1.5" fill="hsl(152, 36%, 33%)" />
    <text x="46" y="247" textAnchor="middle" fill="#F59E0B" fontSize="6.5">★</text>
    <rect x="55" y="255" width="9" height="19" rx="1.5" fill="hsl(152, 36%, 33%)" fillOpacity="0.55" />
    <rect x="68" y="265" width="9" height="9" rx="1.5" fill="hsl(152, 36%, 33%)" fillOpacity="0.28" />
    <rect x="81" y="252" width="9" height="22" rx="1.5" fill="hsl(152, 36%, 33%)" fillOpacity="0.48" />
    <rect x="94" y="258" width="9" height="16" rx="1.5" fill="hsl(152, 36%, 33%)" fillOpacity="0.72" />
    <text x="20" y="282" textAnchor="middle" fill="#9ca3af" fontSize="6.5">S</text>
    <text x="33" y="282" textAnchor="middle" fill="#9ca3af" fontSize="6.5">M</text>
    <text x="46" y="282" textAnchor="middle" fill="hsl(152, 36%, 33%)" fontSize="6.5" fontWeight="700">T</text>
    <text x="59" y="282" textAnchor="middle" fill="#9ca3af" fontSize="6.5">W</text>
    <text x="72" y="282" textAnchor="middle" fill="#9ca3af" fontSize="6.5">T</text>
    <text x="85" y="282" textAnchor="middle" fill="#9ca3af" fontSize="6.5">F</text>
    <text x="98" y="282" textAnchor="middle" fill="hsl(152, 36%, 33%)" fontSize="6.5" fontWeight="600">S</text>

    {/* Divider */}
    <line x1="118" y1="228" x2="118" y2="282" stroke="#f0f0f0" strokeWidth="0.8" />

    {/* Col 2 — XP (x=126–224) */}
    <text x="126" y="237" fill="#3d3d3d" fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">TOTAL XP</text>
    <text x="126" y="264" fill="#8B5CF6" fontSize="24" fontWeight="800" fontFamily="DM Sans, sans-serif" letterSpacing="-0.03em">1,240</text>
    <text x="126" y="277" fill="#9ca3af" fontSize="8" fontFamily="DM Sans, sans-serif">XP earned · 30 days</text>

    {/* Divider */}
    <line x1="224" y1="228" x2="224" y2="282" stroke="#f0f0f0" strokeWidth="0.8" />

    {/* Col 3 — Active days (x=232–324) */}
    <text x="232" y="237" fill="#3d3d3d" fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">ACTIVE DAYS</text>
    <text x="232" y="264" fill="#1D1D1F" fontSize="24" fontWeight="800" fontFamily="DM Sans, sans-serif" letterSpacing="-0.03em">5 / 7</text>
    <text x="232" y="277" fill="#FB923C" fontSize="8.5" fontWeight="600" fontFamily="DM Sans, sans-serif">🔥 This week</text>
  </svg>
);

// ─── Search index item ────────────────────────────────────────────────────────

interface SearchItem {
  title: string;
  category: string;
  href: string;
}



// Highlight matching substring in result titles
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="l-hs-mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate();
  useAuth();
  const { data: courses = [] } = useLandingCourses();
  const { data: careers = [] } = useLandingCareers();

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Animated placeholder typewriter
  const PLACEHOLDERS = [
    "What do you want to become or build?",
    "Become a data scientist",
    "Learn machine learning from scratch",
    "Build AI-powered apps",
    "Prepare for coding interviews",
    "Master SQL for analytics",
    "Switch to a tech career",
    "Practice real-world projects",
  ];
  const [placeholderText, setPlaceholderText] = useState(PLACEHOLDERS[0]);
  const placeholderRef = useRef({ phraseIdx: 0, charIdx: PLACEHOLDERS[0].length, erasing: false });
  const focusedRef = useRef(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (focusedRef.current) { timeout = setTimeout(tick, 200); return; }
      const state = placeholderRef.current;
      const phrase = PLACEHOLDERS[state.phraseIdx];
      if (!state.erasing) {
        if (state.charIdx < phrase.length) {
          state.charIdx++;
          setPlaceholderText(phrase.slice(0, state.charIdx));
          timeout = setTimeout(tick, 48);
        } else {
          timeout = setTimeout(() => { state.erasing = true; tick(); }, 1800);
        }
      } else {
        if (state.charIdx > 0) {
          state.charIdx--;
          setPlaceholderText(phrase.slice(0, state.charIdx));
          timeout = setTimeout(tick, 28);
        } else {
          state.phraseIdx = (state.phraseIdx + 1) % PLACEHOLDERS.length;
          state.erasing = false;
          timeout = setTimeout(tick, 300);
        }
      }
    };
    timeout = setTimeout(tick, 2000);
    return () => clearTimeout(timeout);
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);

  // Build unified search index from live courses + live careers
  const searchIndex = useMemo<SearchItem[]>(() => [
    ...courses.map(c => ({ title: c.name, category: "Course", href: `/course/${c.slug}` })),
    ...careers.map(c => ({ title: c.name, category: "Career Path", href: "/careers" })),
  ], [courses, careers]);

  // Filter to matching results
  const results = useMemo<SearchItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter(item => item.title.toLowerCase().includes(q)).slice(0, 7);
  }, [query, searchIndex]);

  const isEmptyQuery = query.trim() === "";
  const showDropdown = focused && !isEmptyQuery && results.length > 0;

  const selectItem = useCallback((item: SearchItem) => {
    navigate(item.href);
  }, [navigate]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && results[activeIdx]) selectItem(results[activeIdx]);
    } else if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  // Global `/` shortcut focuses input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <section className="l-hs-section">
        <div className="l-hs-inner">

          {/* Headline */}
          <h1 className="l-hs-headline text-foreground">
            <span className="l-hs-headline-line">Learn deeply.</span>
            <span className="l-hs-headline-accent l-hs-headline-line">Remember forever.</span>
          </h1>


          {/* Search + dropdown wrapper */}
          <div className="l-hs-search-wrap">
            {/* Input box */}
            <div className={`l-hs-input-box${isEmptyQuery || showDropdown ? " l-hs-input-box--open" : ""}${focused ? " l-hs-input-box--focused" : ""}`}>
              <input
                ref={inputRef}
                className="l-hs-input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={focused ? "" : placeholderText}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
                onFocus={() => { setFocused(true); focusedRef.current = true; }}
                onBlur={() => setTimeout(() => { setFocused(false); focusedRef.current = false; }, 160)}
                onKeyDown={handleKeyDown}
                aria-label="Search courses and career paths"
                aria-autocomplete="list"
                aria-expanded={showDropdown}
              />

              {/* Arrow submit button */}
              <button
                className="l-hs-arrow-btn"
                aria-label="Search"
                onMouseDown={e => {
                  e.preventDefault();
                  if (activeIdx >= 0) selectItem(results[activeIdx]);
                  else if (results.length > 0) selectItem(results[0]);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

            {/* Results dropdown — only when typing */}
            {focused && !isEmptyQuery && results.length > 0 && (
              <div className="l-hs-dropdown" role="listbox">
                {results.map((item, i) => (
                  <div
                    key={`${item.category}-${item.title}`}
                    className={`l-hs-dropdown-item${i === activeIdx ? " l-hs-dropdown-item--active" : ""}`}
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseDown={() => selectItem(item)}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <span className="l-hs-item-title">
                      <Highlight text={item.title} query={query} />
                    </span>
                    <span className="l-hs-item-tag">{item.category}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Explore row — visible only when no query */}
            {isEmptyQuery && <div
              className="l-hs-explore-row"
              onClick={() => navigate("/careers")}
              role="button"
              tabIndex={-1}
            >
              <span className="l-hs-explore-row-text">Find your path. Start with a career.</span>
            </div>}
          </div>

          {/* Quick-access course pills */}
          {courses.length > 0 && (
            <div className="l-hs-chips">
              {courses.slice(0, 3).map((course) => (
                <button
                  key={course.id}
                  className="l-hs-chip"
                  onClick={() => {
                    setQuery(course.name);
                    setActiveIdx(-1);
                    inputRef.current?.focus();
                  }}
                >
                  {course.name}
                </button>
              ))}
            </div>
          )}

        </div>



      </section>

      {/* Flow illustration — full page width */}
      <div className="l-hs-flow-outer">
        <div className="l-hs-illustration">
          <svg
            viewBox="0 120 1000 235"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="l-hs-illustration-svg"
            aria-hidden="true"
          >
            <defs>
              <marker id="fl-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0.5 L9,3.5 L0,6.5 Z" fill="#94A3A0" opacity="0.7" />
              </marker>
            </defs>

            {/* ── Connecting lines — neutral ── */}
            <line x1="257" y1="220" x2="418" y2="220"
              stroke="#6B7B74" strokeWidth="1.6" strokeDasharray="5 7" strokeLinecap="round"
              opacity="0.75" markerEnd="url(#fl-arrow)" />
            <line x1="582" y1="220" x2="743" y2="220"
              stroke="#6B7B74" strokeWidth="1.6" strokeDasharray="5 7" strokeLinecap="round"
              opacity="0.75" markerEnd="url(#fl-arrow)" />

            {/* ══ NODE 1 — LEARN ══ */}
            <text x="175" y="178" textAnchor="middle" fill="#6B7B74" fontSize="10" fontWeight="600" letterSpacing="2.5" opacity="0.7">01</text>
            {/* Signal arcs — neutral, fading outward */}
            <path d="M 163,206 Q 175,194 187,206" stroke="#3D4F4A" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M 156,215 Q 175,196 194,215" stroke="#6B7B74" strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.5" />
            <path d="M 149,224 Q 175,198 201,224" stroke="#94A3A0" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.25" />
            <line x1="175" y1="206" x2="175" y2="228" stroke="#3D4F4A" strokeWidth="1.8" strokeLinecap="round" />
            {/* Green accent — base dot only */}
            <circle cx="175" cy="233" r="5" fill="hsl(152, 36%, 33%)" />
            {/* Labels */}
            <text x="175" y="294" textAnchor="middle" fontSize="15" fontWeight="700" className="l-hs-node-label">Learn deeply</text>
            <text x="175" y="313" textAnchor="middle" fontSize="13" fontWeight="500" className="l-hs-node-sub">Structured knowledge paths</text>

            {/* ══ NODE 2 — PRACTICE (featured) ══ */}
            <text x="500" y="178" textAnchor="middle" fill="#3D4F4A" fontSize="10" fontWeight="700" letterSpacing="2.5" opacity="0.85">02</text>
            {/* Subtle halo — marks this as the focal step */}
            <circle cx="500" cy="221" r="46" fill="hsl(152, 36%, 33%)" fillOpacity="0.025" stroke="hsl(152, 36%, 33%)" strokeWidth="0.8" strokeOpacity="0.07" />
            {/* Terminal frame — slightly larger, more contrast */}
            <rect x="462" y="195" width="76" height="52" rx="7" stroke="#3D4F4A" strokeWidth="1.6" fill="#3D4F4A" fillOpacity="0.05" />
            {/* Traffic dots */}
            <circle cx="473" cy="205" r="2.5" fill="#94A3A0" opacity="0.75" />
            <circle cx="481" cy="205" r="2.5" fill="#94A3A0" opacity="0.48" />
            <circle cx="489" cy="205" r="2.5" fill="#94A3A0" opacity="0.28" />
            <line x1="462" y1="211" x2="538" y2="211" stroke="#94A3A0" strokeWidth="0.8" opacity="0.35" />
            {/* Prompt + code */}
            <path d="M 471,221 l 5,4 -5,4" stroke="#3D4F4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="482" y1="225" x2="521" y2="225" stroke="#6B7B74" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="482" y1="235" x2="506" y2="235" stroke="#94A3A0" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
            {/* Green accent — cursor only */}
            <rect x="522.5" y="219.5" width="3.5" height="12" rx="0.5" fill="hsl(152, 36%, 33%)" />
            {/* Labels */}
            <text x="500" y="294" textAnchor="middle" fontSize="15" fontWeight="700" className="l-hs-node-label">Practice with code</text>
            <text x="500" y="313" textAnchor="middle" fontSize="13" fontWeight="500" className="l-hs-node-sub">Real-world problems</text>

            {/* ══ NODE 3 — RETAIN ══ */}
            <text x="825" y="178" textAnchor="middle" fill="#6B7B74" fontSize="10" fontWeight="600" letterSpacing="2.5" opacity="0.7">03</text>
            {/* Network — neutral satellites, green core */}
            <circle cx="807" cy="206" r="4" fill="#6B7B74" opacity="0.65" />
            <circle cx="843" cy="206" r="4" fill="#6B7B74" opacity="0.65" />
            <circle cx="807" cy="230" r="4" fill="#6B7B74" opacity="0.65" />
            <circle cx="843" cy="230" r="4" fill="#6B7B74" opacity="0.65" />
            <circle cx="825" cy="198" r="3" fill="#94A3A0" opacity="0.45" />
            <circle cx="825" cy="238" r="3" fill="#94A3A0" opacity="0.45" />
            {/* Spokes */}
            <line x1="820" y1="213" x2="810" y2="208" stroke="#6B7B74" strokeWidth="1.4" opacity="0.55" />
            <line x1="830" y1="213" x2="840" y2="208" stroke="#6B7B74" strokeWidth="1.4" opacity="0.55" />
            <line x1="820" y1="224" x2="810" y2="228" stroke="#6B7B74" strokeWidth="1.4" opacity="0.55" />
            <line x1="830" y1="224" x2="840" y2="228" stroke="#6B7B74" strokeWidth="1.4" opacity="0.55" />
            <line x1="825" y1="212" x2="825" y2="201" stroke="#94A3A0" strokeWidth="1.4" opacity="0.38" />
            <line x1="825" y1="225" x2="825" y2="235" stroke="#94A3A0" strokeWidth="1.4" opacity="0.38" />
            <line x1="810" y1="204" x2="823" y2="200" stroke="#94A3A0" strokeWidth="1" opacity="0.28" />
            <line x1="840" y1="204" x2="827" y2="200" stroke="#94A3A0" strokeWidth="1" opacity="0.28" />
            <line x1="810" y1="232" x2="823" y2="236" stroke="#94A3A0" strokeWidth="1" opacity="0.28" />
            <line x1="840" y1="232" x2="827" y2="236" stroke="#94A3A0" strokeWidth="1" opacity="0.28" />
            {/* Green accent — core node only */}
            <circle cx="825" cy="218" r="7" fill="hsl(152, 36%, 33%)" />
            {/* Labels */}
            <text x="825" y="294" textAnchor="middle" fontSize="15" fontWeight="700" className="l-hs-node-label">Retain long-term</text>
            <text x="825" y="313" textAnchor="middle" fontSize="13" fontWeight="500" className="l-hs-node-sub">Spaced repetition system</text>
          </svg>
        </div>
      </div>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CourseCardsSection() {
  const { data: courses = [], isLoading } = useLandingCourses();

  return (
    <section className="l-section">
      <div className="l-section-hd-row">
        <div className="l-section-hd">
          <span className="l-eyebrow-badge">Courses</span>
          <h2 className="l-section-title text-foreground">Pick up where you left off</h2>
          <p className="l-section-sub text-muted-foreground">
            Bite-sized lessons with real projects — from fundamentals to advanced production techniques.
          </p>
        </div>
        <Link to="/courses" className="l-view-all-link">
          View all courses
          <svg className="l-view-all-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      <div className="l-card-grid">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="l-course-card l-course-skeleton" />
          ))
          : courses.map((course, i) => (
            <PublicCourseCard key={course.id} course={course} index={i} />
          ))}
      </div>
    </section>
  );
}

// ─── CTA Section ─────────────────────────────────────────────────────────────

const CTA_AVATARS = [
  { bg: "linear-gradient(135deg,#7c3aed,#a78bfa)", letter: "A" },
  { bg: "linear-gradient(135deg,#0891b2,#38bdf8)", letter: "M" },
  { bg: "linear-gradient(135deg,#d97706,#fbbf24)", letter: "S" },
  { bg: "linear-gradient(135deg,#dc2626,#fb7185)", letter: "R" },
  { bg: "linear-gradient(135deg,#059669,#34d399)", letter: "J" },
  { bg: "linear-gradient(135deg,#9333ea,#c084fc)", letter: "L" },
];

function CTASection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="l-cta-section l-why bg-background">
      <div className="l-container">
        <div className="l-cta-banner">

          {/* ── LEFT: avatar stack + bold headline ── */}
          <div className="l-cta-banner-left">
            <div className="l-cta-avatars">
              {CTA_AVATARS.map(({ bg, letter }, i) => (
                <div key={i} className="l-cta-avatar" style={{ background: bg }}>
                  {letter}
                </div>
              ))}
            </div>
            <h2 className="l-cta-banner-headline">
              {user ? (
                <>Welcome back.<br />Keep building.</>
              ) : (
                <>Join 50,000+ learners<br />mastering data & AI.</>
              )}
            </h2>
          </div>

          {/* ── RIGHT: description + CTA button + link ── */}
          <div className="l-cta-banner-right">
            <p className="l-cta-banner-desc">
              {user
                ? "Your streaks, XP, and course progress are waiting — pick up exactly where you left off."
                : "Build real skills, get certified, and grow fast in the AI-powered world. Ready to stand out?"
              }
            </p>
            {user ? (
              <>
                <button className="l-cta-banner-btn" onClick={() => navigate("/profile")}>
                  Continue learning
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <button className="l-cta-banner-link" onClick={() => navigate("/courses")}>
                  Browse all courses
                </button>
              </>
            ) : (
              <>
                <button className="l-cta-banner-btn" onClick={() => navigate("/signup")}>
                  Get started free
                </button>
                <button className="l-cta-banner-link" onClick={() => navigate("/login")}>
                  Already have an account? Sign in
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Career Cards Section ─────────────────────────────────────────────────────

function CareerCardsSection() {
  const { data: careers = [], isLoading } = useLandingCareers();

  return (
    <section className="l-section">
      <div className="l-section-hd-row">
        <div className="l-section-hd">
          <span className="l-eyebrow-badge">Career Paths</span>
          <h2 className="l-section-title text-foreground">Know exactly what to learn next</h2>
          <p className="l-section-sub text-muted-foreground">
            Role-based roadmaps built with hiring managers — every skill maps to real job requirements.
          </p>
        </div>
        <Link to="/careers" className="l-view-all-link">
          View all careers
          <svg className="l-view-all-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
      <div className="l-card-grid--3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="l-course-card l-course-skeleton" />
          ))
          : careers.map((career, i) => (
            <PublicCareerCard key={career.id} career={career} index={i} />
          ))}
      </div>
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="l-root bg-background text-foreground">
      {/* Existing site header */}
      <Header />

      {/* Offset for fixed header (primary 64px + secondary nav 40px) */}
      <div style={{ paddingTop: 104 }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <HeroSection />

        <div className="l-container">
          {/* ── Courses ──────────────────────────────────────────────────────── */}
          <CourseCardsSection />

          {/* ── Ad: after courses section ────────────────────────────────────── */}
          <div className="w-full h-[400px] mb-8 rounded-xl overflow-hidden">
            <AdPlacement placement="landing-after-courses" className="w-full h-full" />
          </div>

          {/* ── Career Paths ─────────────────────────────────────────────────── */}
          <CareerCardsSection />

          {/* ── Ad: after careers section ────────────────────────────────────── */}
          <div className="w-full h-[400px] mb-8 rounded-xl overflow-hidden">
            <AdPlacement placement="landing-after-careers" className="w-full h-full" />
          </div>
        </div>

        {/* ── CTA Card ─────────────────────────────────────────────────────── */}
        <CTASection />

        <Footer />
      </div>
    </div>
  );
}
