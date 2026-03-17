import { useState } from "react";
import { MessageCircle, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionEmptyState } from "./ConnectionEmptyState";
import { ConnectionList } from "./ConnectionList";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatComposer } from "./ChatComposer";
import { MessagingCollapsedBar } from "./MessagingCollapsedBar";
import { NewConnectionModal } from "./NewConnectionModal";
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
}: MessagingPopupProps) {
  const [showNewConnection, setShowNewConnection] = useState(false);

  if (view === "closed") return null;

  if (view === "collapsed") {
    return <MessagingCollapsedBar unreadCount={totalUnread} onExpand={onExpand} />;
  }

  const handleNewConnection = async (type: string, name: string) => {
    // For now, create a demo connection
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("team_connections").insert({
      learner_id: userId,
      connection_type: type,
      display_name: name,
      role_label: type === "support" ? "Support" : type === "mentor" ? "Mentor" : type === "instructor" ? "Instructor" : "Team",
      status: "active",
    });
    setShowNewConnection(false);
    onFetchConnections();
    onSetView("list");
  };

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 right-4 z-[60]",
          "w-[360px] bg-card/97 backdrop-blur-2xl",
          "border border-border/25 rounded-[22px]",
          "shadow-[0_8px_40px_rgba(0,0,0,0.08),0_2px_12px_rgba(0,0,0,0.04)]",
          "flex flex-col overflow-hidden",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
          view === "chat" ? "h-[520px]" : "h-[440px]"
        )}
      >
        {/* Header - show for empty & list views */}
        {(view === "empty" || view === "list") && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Messaging</h3>
              {totalUnread > 0 && (
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

        {/* Chat header */}
        {view === "chat" && activeConnection && (
          <ChatHeader
            connection={activeConnection}
            onBack={onBackToList}
            onCollapse={onCollapse}
            onClose={onClose}
          />
        )}

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0">
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
        </div>
      </div>

      <NewConnectionModal
        open={showNewConnection}
        onClose={() => setShowNewConnection(false)}
        onConnect={handleNewConnection}
      />
    </>
  );
}
