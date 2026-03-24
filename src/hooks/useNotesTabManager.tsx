/**
 * useNotesTabManager - Manages single Notes tab per course
 * 
 * Prevents multiple Notes tabs from opening for the same course.
 * Uses BroadcastChannel for cross-tab communication and context switching.
 * 
 * CRITICAL: When Deep Notes is already open and user opens from a different
 * context (lesson, post, etc), the existing tab MUST switch to show that note.
 */

import { useCallback, useEffect, useRef } from 'react';

// Prefix for notes tab window names
const NOTES_TAB_PREFIX = 'lovable-notes-';

// Storage key for tracking open notes tabs
const NOTES_TAB_REGISTRY_KEY = 'lovable-notes-tabs';

// Broadcast channel for context switching
const NOTES_CONTEXT_CHANNEL = 'lovable-notes-context';

export interface NotesContextMessage {
  type: 'SWITCH_NOTE' | 'FOCUS_NOTE' | 'PING' | 'PONG';
  courseId: string;
  noteId?: string;
  lessonId?: string;
  entityType?: 'lesson' | 'user' | 'post' | 'comment';
  timestamp: number;
}

interface NotesTabInfo {
  courseId: string;
  openedAt: number;
}

/**
 * Get the registry of open notes tabs from sessionStorage
 */
function getTabRegistry(): Record<string, NotesTabInfo> {
  try {
    const data = sessionStorage.getItem(NOTES_TAB_REGISTRY_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Update the registry of open notes tabs
 */
function updateTabRegistry(registry: Record<string, NotesTabInfo>) {
  try {
    sessionStorage.setItem(NOTES_TAB_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a Deep Notes tab already exists for this course via BroadcastChannel ping
 * Returns a promise that resolves to true if tab exists and responded
 */
function pingExistingTab(channel: BroadcastChannel, courseId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 200); // 200ms timeout
    
    const handlePong = (event: MessageEvent<NotesContextMessage>) => {
      if (event.data.type === 'PONG' && event.data.courseId === courseId) {
        clearTimeout(timeout);
        channel.removeEventListener('message', handlePong);
        resolve(true);
      }
    };
    
    channel.addEventListener('message', handlePong);
    channel.postMessage({
      type: 'PING',
      courseId,
      timestamp: Date.now(),
    });
  });
}

/**
 * Hook for opening Notes in a managed tab (used by CourseDetail)
 * 
 * CRITICAL: Ensures exactly ONE Deep Notes tab per course.
 * - First open: creates new tab
 * - Subsequent opens: reuses existing tab, switches content via BroadcastChannel
 */
export function useNotesTabOpener(courseId: string | undefined, careerId?: string) {
  const notesWindowRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isOpeningRef = useRef(false); // Prevent race conditions

  // Initialize broadcast channel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    
    channelRef.current = new BroadcastChannel(NOTES_CONTEXT_CHANNEL);
    
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  // Clean up stale registry entries on mount
  useEffect(() => {
    const registry = getTabRegistry();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let hasChanges = false;
    
    Object.entries(registry).forEach(([tabId, info]) => {
      if (info.openedAt < oneHourAgo) {
        delete registry[tabId];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      updateTabRegistry(registry);
    }
  }, []);

  /**
   * Send context switch message to existing Deep Notes tab
   */
  const sendContextSwitch = useCallback((options?: {
    noteId?: string;
    lessonId?: string;
    entityType?: 'lesson' | 'user' | 'post' | 'comment';
  }) => {
    if (!courseId || !channelRef.current) return;
    
    channelRef.current.postMessage({
      type: 'SWITCH_NOTE',
      courseId,
      noteId: options?.noteId,
      lessonId: options?.lessonId,
      entityType: options?.entityType,
      timestamp: Date.now(),
    } as NotesContextMessage);
  }, [courseId]);

  /**
   * Open or focus the Notes tab for this course.
   * 
   * BEHAVIOR:
   * 1. If we have a valid window reference → focus it + send context switch
   * 2. If not, ping via BroadcastChannel to check if tab exists elsewhere
   * 3. If tab responds → it will focus itself, we send context switch
   * 4. If no response → create new tab
   */
  const openNotesTab = useCallback(async (options?: {
    noteId?: string;
    lessonId?: string;
    entityType?: 'lesson' | 'user' | 'post' | 'comment';
  }) => {
    if (!courseId) return false;
    if (isOpeningRef.current) return false; // Prevent double-clicks
    
    isOpeningRef.current = true;
    
    try {
      const tabId = `${NOTES_TAB_PREFIX}${courseId}`;
      const notesUrl = careerId
        ? `/courses/${courseId}/notes?careerId=${encodeURIComponent(careerId)}`
        : `/courses/${courseId}/notes`;

      // Strategy 1: Try existing window reference (skip if careerId changed — URL may differ)
      if (notesWindowRef.current && !notesWindowRef.current.closed) {
        try {
          const currentUrl = notesWindowRef.current.location?.search ?? "";
          const urlHasCorrectCareer = careerId
            ? currentUrl.includes(`careerId=${encodeURIComponent(careerId)}`)
            : !currentUrl.includes("careerId=");
          if (urlHasCorrectCareer) {
            notesWindowRef.current.focus();
            sendContextSwitch(options);
            return true;
          }
          // Wrong URL — close and reopen below
          notesWindowRef.current = null;
        } catch {
          notesWindowRef.current = null;
        }
      }

      // Strategy 2: Ping existing tab via BroadcastChannel
      // Skip when careerId is set — we need a fresh tab with the correct URL
      if (!careerId && channelRef.current) {
        const tabExists = await pingExistingTab(channelRef.current, courseId);

        if (tabExists) {
          // Tab exists and will focus itself (via PING handler)
          // Send context switch message
          sendContextSwitch(options);
          return true;
        }
      }

      // Strategy 3: No existing tab found - create new one
      // Use named window to prevent duplicates at browser level
      // IMPORTANT: Don't use 'noopener' so we can keep the reference
      const newWindow = window.open(notesUrl, tabId);
      
      if (newWindow) {
        notesWindowRef.current = newWindow;
        
        // Register this tab
        const registry = getTabRegistry();
        registry[tabId] = {
          courseId,
          openedAt: Date.now(),
        };
        updateTabRegistry(registry);
        
        // If opening with specific context, send message after delay
        // to give the new tab time to set up its listener
        if (options?.noteId || options?.lessonId) {
          setTimeout(() => {
            sendContextSwitch(options);
          }, 600);
        }
      }

      return true;
    } finally {
      // Reset opening flag after a short delay
      setTimeout(() => {
        isOpeningRef.current = false;
      }, 300);
    }
  }, [courseId, careerId, sendContextSwitch]);

  return { openNotesTab, notesWindowRef };
}

/**
 * Hook for registering a Notes tab (used by CourseNotes page)
 * Listens for context switch messages to change active note
 */
export function useNotesTabRegistration(
  courseId: string | undefined,
  onSwitchNote?: (options: { noteId?: string; lessonId?: string; entityType?: string }) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!courseId) return;

    // Set window name for tab identification
    const tabId = `${NOTES_TAB_PREFIX}${courseId}`;
    window.name = tabId;

    // Register in storage
    const registry = getTabRegistry();
    registry[tabId] = {
      courseId,
      openedAt: Date.now(),
    };
    updateTabRegistry(registry);

    // Set up broadcast channel listener for context switching
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(NOTES_CONTEXT_CHANNEL);
      
      const handleMessage = (event: MessageEvent<NotesContextMessage>) => {
        const message = event.data;
        
        // Only handle messages for this course
        if (message.courseId !== courseId) return;
        
        // Handle PING - respond with PONG and focus self
        if (message.type === 'PING') {
          channelRef.current?.postMessage({
            type: 'PONG',
            courseId,
            timestamp: Date.now(),
          } as NotesContextMessage);
          // Focus this window when pinged
          window.focus();
          return;
        }
        
        if (message.type === 'SWITCH_NOTE' && onSwitchNote) {
          // Focus window on context switch
          window.focus();
          onSwitchNote({
            noteId: message.noteId,
            lessonId: message.lessonId,
            entityType: message.entityType,
          });
        }
      };
      
      channelRef.current.addEventListener('message', handleMessage);
    }

    // Cleanup on unmount
    return () => {
      const registry = getTabRegistry();
      delete registry[tabId];
      updateTabRegistry(registry);
      
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [courseId, onSwitchNote]);

  /**
   * Focus the opener (course) tab if available
   */
  const focusOpenerTab = useCallback(() => {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  /**
   * Close this tab and focus opener
   */
  const closeAndFocusOpener = useCallback(() => {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        window.close();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  return { focusOpenerTab, closeAndFocusOpener };
}
