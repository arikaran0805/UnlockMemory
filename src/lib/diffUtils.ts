/**
 * Simple diff utility to compare two strings and highlight differences
 */

import { isCanvasContent, parseCanvasContent, sortBlocksForReading } from "@/components/canvas-editor/types";
import {
  extractExplanation,
  htmlToPlainTextPreserveNewlines,
  isChatTranscript,
  normalizeChatInput,
} from "@/lib/chatContent";
import { extractPlainText, isTipTapJSON, parseContent } from "@/lib/tiptapMigration";

export interface DiffSegment {
  type: "unchanged" | "added" | "removed";
  text: string;
}

export function normalizeDiffContent(content: string): string {
  if (!content?.trim()) return "";

  if (isCanvasContent(content)) {
    const canvas = parseCanvasContent(content);
    return sortBlocksForReading(canvas.blocks)
      .map((block) => {
        if (block.kind === "text") {
          return normalizeDiffContent(block.content);
        }
        return normalizeChatInput(block.content);
      })
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  if (isChatTranscript(content)) {
    const transcript = normalizeChatInput(content);
    const explanation = extractExplanation(content);

    return [transcript, explanation ? normalizeDiffContent(explanation) : ""]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  if (isTipTapJSON(content)) {
    try {
      return extractPlainText(parseContent(content));
    } catch {
      return "";
    }
  }

  const trimmed = content.trim();
  if (trimmed.startsWith("<")) {
    return htmlToPlainTextPreserveNewlines(content);
  }

  return content;
}

/**
 * Compute a simple word-level diff between two strings
 */
export function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);
  
  const result: DiffSegment[] = [];
  const lcs = longestCommonSubsequence(oldWords, newWords);
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;
  
  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    if (lcsIndex < lcs.length) {
      // Add removed words from old
      while (oldIndex < oldWords.length && oldWords[oldIndex] !== lcs[lcsIndex]) {
        result.push({ type: "removed", text: oldWords[oldIndex] });
        oldIndex++;
      }
      
      // Add added words from new
      while (newIndex < newWords.length && newWords[newIndex] !== lcs[lcsIndex]) {
        result.push({ type: "added", text: newWords[newIndex] });
        newIndex++;
      }
      
      // Add unchanged word
      if (oldIndex < oldWords.length && newIndex < newWords.length) {
        result.push({ type: "unchanged", text: lcs[lcsIndex] });
        oldIndex++;
        newIndex++;
        lcsIndex++;
      }
    } else {
      // Add remaining removed words
      while (oldIndex < oldWords.length) {
        result.push({ type: "removed", text: oldWords[oldIndex] });
        oldIndex++;
      }
      
      // Add remaining added words
      while (newIndex < newWords.length) {
        result.push({ type: "added", text: newWords[newIndex] });
        newIndex++;
      }
    }
  }
  
  return mergeAdjacentSegments(result);
}

/**
 * Tokenize text into words while preserving HTML tags and whitespace
 */
function tokenize(text: string): string[] {
  // Split by HTML tags and words, preserving tags
  const tokens: string[] = [];
  const regex = /(<[^>]+>)|(\s+)|([^\s<]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  
  return tokens;
}

/**
 * Compute longest common subsequence of two arrays
 */
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  
  // Create DP table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m, j = n;
  
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

/**
 * Merge adjacent segments of the same type
 */
function mergeAdjacentSegments(segments: DiffSegment[]): DiffSegment[] {
  if (segments.length === 0) return [];
  
  const merged: DiffSegment[] = [segments[0]];
  
  for (let i = 1; i < segments.length; i++) {
    const last = merged[merged.length - 1];
    const current = segments[i];
    
    if (last.type === current.type) {
      last.text += current.text;
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Convert diff segments to HTML with highlighting
 */
export function diffToHtml(diff: DiffSegment[]): string {
  return diff.map(segment => {
    switch (segment.type) {
      case "added":
        return `<span class="diff-added" style="background-color: rgba(34, 197, 94, 0.3); text-decoration: none;">${escapeHtml(segment.text)}</span>`;
      case "removed":
        return `<span class="diff-removed" style="background-color: rgba(239, 68, 68, 0.3); text-decoration: line-through;">${escapeHtml(segment.text)}</span>`;
      default:
        return segment.text;
    }
  }).join("");
}

/**
 * Compare two HTML strings and return highlighted diff HTML
 */
export function compareVersions(oldContent: string, newContent: string): string {
  // Strip HTML for text comparison but preserve structure
  const diff = computeWordDiff(oldContent, newContent);
  return diffToHtml(diff);
}

/**
 * Compare chat bubbles and highlight differences
 */
export function compareChatVersions(oldContent: string, newContent: string): {
  oldHighlighted: string;
  newHighlighted: string;
  changes: { bubbleIndex: number; type: "modified" | "added" | "removed" }[];
} {
  try {
    const oldBubbles = JSON.parse(oldContent);
    const newBubbles = JSON.parse(newContent);
    
    const changes: { bubbleIndex: number; type: "modified" | "added" | "removed" }[] = [];
    
    const maxLen = Math.max(oldBubbles.length, newBubbles.length);
    
    for (let i = 0; i < maxLen; i++) {
      if (i >= oldBubbles.length) {
        changes.push({ bubbleIndex: i, type: "added" });
      } else if (i >= newBubbles.length) {
        changes.push({ bubbleIndex: i, type: "removed" });
      } else if (JSON.stringify(oldBubbles[i]) !== JSON.stringify(newBubbles[i])) {
        changes.push({ bubbleIndex: i, type: "modified" });
      }
    }
    
    return {
      oldHighlighted: oldContent,
      newHighlighted: newContent,
      changes,
    };
  } catch {
    // If not valid JSON, fall back to text diff
    return {
      oldHighlighted: oldContent,
      newHighlighted: newContent,
      changes: [],
    };
  }
}

function escapeHtml(text: string): string {
  // Don't escape if it looks like HTML tags
  if (text.startsWith("<") && text.endsWith(">")) {
    return text;
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
