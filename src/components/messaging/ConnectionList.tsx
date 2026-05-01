import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConnectionListItem } from "./ConnectionListItem";
import { SuggestedMentorBanner } from "./SuggestedMentorBanner";
import UMLoader from "@/components/UMLoader";
import type { ConnectionWithConversation } from "@/hooks/useMessaging";
import type { ResolvedOwner } from "@/hooks/useDoubtSystem";

interface ConnectionListProps {
  connections: ConnectionWithConversation[];
  isLoading: boolean;
  currentUserId: string;
  onSelectConnection: (connectionId: string) => void;
  onNewConnection: () => void;
  onDeleteConnection?: (connectionId: string) => void;
  suggestedMentor?: { mentor: ResolvedOwner; context: { source_type: string; source_title: string } } | null;
  onAskSuggestedMentor?: () => void;
}

export function ConnectionList({ connections, isLoading, currentUserId, onSelectConnection, onNewConnection, onDeleteConnection, suggestedMentor, onAskSuggestedMentor }: ConnectionListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    // Exclude the suggested mentor — they're already shown in the banner above
    const suggestedUserId = suggestedMentor?.mentor?.user_id;
    const base = suggestedUserId
      ? connections.filter((c) => (c as any).connected_user_id !== suggestedUserId)
      : connections;

    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.role_label.toLowerCase().includes(q)
    );
  }, [connections, search, suggestedMentor]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search connections"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl border-border/40 bg-muted/30 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>
      </div>

      {/* Suggested mentor for current lesson */}
      {suggestedMentor && onAskSuggestedMentor && (
        <SuggestedMentorBanner
          mentor={suggestedMentor.mentor}
          context={suggestedMentor.context}
          variant="list"
          onAsk={onAskSuggestedMentor}
        />
      )}

      {/* List */}
      <ScrollArea className="flex-1 px-1">
        <div className="space-y-0.5 px-1 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <UMLoader size={44} dark label="Unlocking chats…" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {search ? "No connections found" : "No connections yet"}
            </p>
          ) : (
            filtered.map((conn) => (
              <ConnectionListItem
                key={conn.id}
                connection={conn}
                currentUserId={currentUserId}
                onClick={() => onSelectConnection(conn.id)}
                onDelete={onDeleteConnection}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
