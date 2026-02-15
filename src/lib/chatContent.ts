// Shared helpers for chat-style content stored as either plain text or rich-editor HTML.

const RICH_HTML_TAG_RE = /<\/?(p|div|br|span|strong|em|ul|ol|li|h[1-6]|blockquote|pre|code)\b/i;

export const looksLikeRichHtml = (input: string): boolean => {
  if (!input) return false;
  // If author uses fenced code blocks, treat as plain text (avoid stripping <p> inside code).
  if (input.includes("```")) return false;
  return RICH_HTML_TAG_RE.test(input);
};

// Convert rich-editor HTML into plain text while preserving conversational line breaks.
export const htmlToPlainTextPreserveNewlines = (html: string): string => {
  if (!html) return "";

  // Fallback for non-browser contexts
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const processed = html
    // Block closings -> newline
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Table-ish -> sensible spacing
    .replace(/<\/(tr)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\t")
    // Strip opening tags that often appear inline
    .replace(/<p\b[^>]*>/gi, "")
    .replace(/<div\b[^>]*>/gi, "")
    .replace(/<li\b[^>]*>/gi, "")
    .replace(/<h[1-6]\b[^>]*>/gi, "")
    .replace(/<blockquote\b[^>]*>/gi, "")
    .replace(/<pre\b[^>]*>/gi, "")
    .replace(/<code\b[^>]*>/gi, "");

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = processed;
  const text = tempDiv.textContent || tempDiv.innerText || "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const normalizeChatInput = (value: string): string => {
  if (!value) return "";
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!looksLikeRichHtml(normalized)) return normalized;
  return htmlToPlainTextPreserveNewlines(normalized);
};

type ChatSegment = { speaker: string; content: string };

type Marker = { speaker: string; start: number; end: number };

// Separator for mixed content (chat + explanation)
const MIXED_CONTENT_SEPARATOR = /\n---\n/;

const SPEAKER_TOKEN_RE = /([^:\r\n]{1,60}):[ \t]*(?=[^\s\r\n])/g;

const findChatMarkers = (text: string): Marker[] => {
  const markers: Marker[] = [];
  for (const m of text.matchAll(SPEAKER_TOKEN_RE)) {
    const idx = m.index ?? 0;

    // Only treat as a marker at the start of a line (or start of text).
    // This avoids matching speaker-like tokens mid-sentence.
    const prev = idx > 0 ? text[idx - 1] : "";
    if (idx !== 0 && prev !== "\n") continue;

    const speaker = (m[1] || "").trim();
    if (!speaker || !/[A-Za-z]/.test(speaker)) continue;

    markers.push({ speaker, start: idx, end: idx + m[0].length });
  }
  return markers;
};

export const extractChatSegments = (
  input: string,
  options?: { allowSingle?: boolean }
): ChatSegment[] => {
  const text = normalizeChatInput(input);
  if (!text.trim()) return [];

  // If mixed content, only parse the chat portion (before ---)
  const chatPortion = text.split(MIXED_CONTENT_SEPARATOR)[0];

  const rawMarkers = findChatMarkers(chatPortion);
  if (rawMarkers.length === 0) return [];

  // Heuristic to prevent false splits when message content contains lines like:
  // "Note: ..." / "Takeaway: ..." / "What went wrong: ...".
  // We keep repeating speakers (count >= 2) and ensure at least 2 speakers overall.
  const speakerKey = (s: string) => s.trim().toLowerCase();
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();

  rawMarkers.forEach((m, idx) => {
    const key = speakerKey(m.speaker);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!firstSeen.has(key)) firstSeen.set(key, idx);
  });

  const requiredSpeakers = options?.allowSingle ? 1 : 2;
  const allowed = new Set<string>();

  // Keep speakers that repeat.
  for (const [key, count] of counts.entries()) {
    if (count >= 2) allowed.add(key);
  }

  // When allowSingle is true, allow ALL speakers that appear (for chat editor use case)
  // This ensures each speaker gets their own bubble even if they only appear once
  if (options?.allowSingle) {
    for (const key of counts.keys()) {
      allowed.add(key);
    }
  } else {
    // Ensure at least N speakers based on first appearance (handles short conversations).
    const speakersByAppearance = [...counts.keys()].sort(
      (a, b) => (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0)
    );
    for (const key of speakersByAppearance) {
      if (allowed.size >= requiredSpeakers) break;
      allowed.add(key);
    }
  }

  let markers = rawMarkers.filter((m) => allowed.has(speakerKey(m.speaker)));

  // Always include explicit TAKEAWAY blocks.
  // To avoid false splits (e.g., a user typing "Takeaway:"), we only keep it when
  // the content after the marker starts with our serialized "[TAKEAWAY..." format.
  rawMarkers.forEach((m, idx) => {
    if (speakerKey(m.speaker) !== "takeaway") return;
    const nextStart = idx + 1 < rawMarkers.length ? rawMarkers[idx + 1].start : chatPortion.length;
    const afterMarker = chatPortion.slice(m.end, nextStart).trimStart();
    if (!afterMarker.startsWith("[TAKEAWAY")) return;

    if (!markers.some((x) => x.start === m.start)) markers.push(m);
  });

  // Always include explicit FREEFORM blocks.
  // Same rationale as TAKEAWAY: keep only when it matches our serialized "[FREEFORM_CANVAS]" format.
  rawMarkers.forEach((m, idx) => {
    if (speakerKey(m.speaker) !== "freeform") return;
    const nextStart = idx + 1 < rawMarkers.length ? rawMarkers[idx + 1].start : chatPortion.length;
    const afterMarker = chatPortion.slice(m.end, nextStart).trimStart();
    if (!afterMarker.startsWith("[FREEFORM_CANVAS]")) return;

    if (!markers.some((x) => x.start === m.start)) markers.push(m);
  });

  markers = markers.sort((a, b) => a.start - b.start);

  if (markers.length === 0) return [];

  // If there's only a single marker, only accept it when it’s an explicit structured block.
  const hasExplicitBlocks = markers.some((m) => {
    const key = speakerKey(m.speaker);
    return key === "takeaway" || key === "freeform";
  });

  if (!options?.allowSingle && markers.length < 2 && !hasExplicitBlocks) return [];

  const segments: ChatSegment[] = [];
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const nextStart = i + 1 < markers.length ? markers[i + 1].start : chatPortion.length;
    // Get raw content between markers
    let content = chatPortion.slice(cur.end, nextStart);

    // If there's a next marker, we need to be careful not to include the preceding newlines
    // that belong to message separation (double newlines before next speaker)
    if (i + 1 < markers.length) {
      // Trim trailing whitespace but preserve internal newlines
      content = content.replace(/\n{2,}$/, "");
    }

    content = content.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
    if (content) segments.push({ speaker: cur.speaker, content });
  }

  return segments;
};

export const isChatTranscript = (input: string): boolean => {
  const text = normalizeChatInput(input);
  if (!text.trim()) return false;
  const chatPortion = text.split(MIXED_CONTENT_SEPARATOR)[0];

  // Treat explicit structured blocks as chat even if there aren't 2+ speakers.
  if (chatPortion.includes("[FREEFORM_CANVAS]") || chatPortion.includes("[TAKEAWAY")) return true;

  return findChatMarkers(chatPortion).length >= 2;
};

// Extract the explanation portion after the --- separator
export const extractExplanation = (input: string): string | null => {
  const text = normalizeChatInput(input);
  const parts = text.split(MIXED_CONTENT_SEPARATOR);
  if (parts.length < 2) return null;
  const explanation = parts.slice(1).join("\n---\n").trim();
  return explanation || null;
};
