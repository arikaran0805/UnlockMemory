import { useState } from "react";
import { ArrowLeft, MessageCircle, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionEmptyState } from "./ConnectionEmptyState";
import { ConnectionList } from "./ConnectionList";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatComposer } from "./ChatComposer";
import { MessagingCollapsedBar } from "./MessagingCollapsedBar";
import { NewConnectionContent } from "./NewConnectionModal";
import type { MessagingView, ConnectionWithConversation, ChatMessage } from "@/hooks/useMessaging";

interface MessagingPopupProps {
  view: MessagingView;
  connections: ConnectionWithConversation[];
  activeConnection: ConnectionWithConversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  totalUnread: number;
  userId: string;
  lessonId?: string;
  onOpenChat: (connectionId: string, lessonId?: string) => void;
  onSendMessage: (text: string) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onClose: () => void;
  onBackToList: () => void;
  onSetView: (view: MessagingView) => void;
  onFetchConnections: () => void;
  onDeleteConnection?: (connectionId: string) => void;
}

export function MessagingPopup({
  view,
  connections,
  activeConnection,
  messages,
  isLoading,
  isSending,
  totalUnread,
  userId,
  lessonId,
  onOpenChat,
  onSendMessage,
  onCollapse,
  onExpand,
  onClose,
  onBackToList,
  onSetView,
  onFetchConnections,
  onDeleteConnection,
}: MessagingPopupProps) {
  const [showNewConnection, setShowNewConnection] = useState(false);

  if (view === "closed") return null;

  if (view === "collapsed") {
    return <MessagingCollapsedBar unreadCount={totalUnread} onExpand={onExpand} />;
  }

  const handleNewConnection = async (type: string, name: string) => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("team_connections").insert({
      learner_id: userId,
      connection_type: type,
      display_name: name,
      role_label:
        type === "support"
          ? "Support"
          : type === "mentor"
            ? "Mentor"
            : type === "instructor"
              ? "Instructor"
              : "Team",
      status: "active",
    });
    setShowNewConnection(false);
    onFetchConnections();
    onSetView("list");
  };

  const showStandardHeader = view === "empty" || view === "list" || showNewConnection;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[60]",
        "w-[360px] bg-card",
        "border border-border rounded-[22px]",
        "shadow-[0_4px_24px_hsl(var(--foreground)/0.06),0_1px_8px_hsl(var(--foreground)/0.03)]",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        view === "chat" ? "h-[520px]" : "h-[440px]"
      )}
    >
      {showStandardHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div className="flex items-center gap-2.5 min-w-0">
            {showNewConnection ? (
              <button
                onClick={() => setShowNewConnection(false)}
                className="p-1.5 -ml-1 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Back to messaging"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {showNewConnection ? "New Connection" : "Messaging"}
              </h3>
              {showNewConnection && (
                <p className="text-xs text-muted-foreground truncate">Choose how you'd like to connect</p>
              )}
            </div>
            {!showNewConnection && totalUnread > 0 && (
              <div className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {totalUnread}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onCollapse}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {view === "chat" && activeConnection && !showNewConnection && (
        <ChatHeader
          connection={activeConnection}
          onBack={onBackToList}
          onCollapse={onCollapse}
          onClose={onClose}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {showNewConnection ? (
          <div className="flex-1 overflow-y-auto">
            <NewConnectionContent onConnect={handleNewConnection} />
          </div>
        ) : (
          <>
            {view === "empty" && (
              <ConnectionEmptyState
                onConnectTeam={() => setShowNewConnection(true)}
              />
            )}

            {view === "list" && (
              <ConnectionList
                connections={connections}
                isLoading={isLoading}
                onSelectConnection={(id) => onOpenChat(id, lessonId)}
                onNewConnection={() => setShowNewConnection(true)}
                onDeleteConnection={onDeleteConnection}
              />
            )}

            {view === "chat" && (
              <>
                <ChatMessageList
                  messages={messages}
                  currentUserId={userId}
                  isLoading={isLoading}
                />
                <ChatComposer
                  onSend={onSendMessage}
                  isSending={isSending}
                  placeholder="Ask about this lesson..."
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
