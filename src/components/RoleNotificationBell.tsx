/**
 * RoleNotificationBell - Role-Scoped Notification Bell Component
 * 
 * Shows notifications ONLY for the user's activeRole context.
 * Navigates to role-appropriate pages when clicking notifications.
 * 
 * SECURITY: Uses activeRole from AuthContext as single source of truth
 */
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import UMLoader from "@/components/UMLoader";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRoleNotifications, RoleNotification } from "@/hooks/useRoleNotifications";
import { useAuth, getRoleDashboardPath } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface RoleNotificationBellProps {
  /** Optional custom class for the button */
  className?: string;
}

/**
 * Get the base path for the current role
 */
const getRoleBasePath = (role: string | null): string => {
  switch (role) {
    case "admin":
      return "/admin";
    case "super_moderator":
      return "/super-moderator";
    case "senior_moderator":
      return "/senior-moderator";
    case "moderator":
      return "/moderator";
    default:
      return "/";
  }
};

const RoleNotificationBell = ({ className }: RoleNotificationBellProps) => {
  const navigate = useNavigate();
  const { activeRole } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useRoleNotifications();

  const basePath = getRoleBasePath(activeRole);

  const handleNotificationClick = (notification: RoleNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to specific content editor based on content type
    if (notification.content_id && notification.content_type) {
      switch (notification.content_type) {
        case "post":
          navigate(`${basePath}/posts/edit/${notification.content_id}`);
          return;
        case "course":
          navigate(`${basePath}/courses/${notification.content_id}`);
          return;
        case "career":
          navigate(`${basePath}/careers/${notification.content_id}`);
          return;
        case "tag":
          navigate(`${basePath}/tags`);
          return;
      }
    }

    // Fallback to activity page or approvals
    if (activeRole === "moderator") {
      navigate(`${basePath}/activity`);
    } else {
      navigate(`${basePath}/approvals`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "content_submitted":
        return "📝";
      case "changes_requested":
        return "🔄";
      case "approved":
        return "✅";
      case "rejected":
        return "❌";
      case "annotation_added":
        return "💬";
      default:
        return "📣";
    }
  };

  const getTitle = () => {
    switch (activeRole) {
      case "admin":
        return "Admin Notifications";
      case "super_moderator":
        return "Career Notifications";
      case "senior_moderator":
        return "Course Notifications";
      case "moderator":
        return "My Notifications";
      default:
        return "Notifications";
    }
  };

  const getViewAllLabel = () => {
    if (activeRole === "moderator") {
      return "View my activity";
    }
    return "View approval queue";
  };

  const handleViewAll = () => {
    if (activeRole === "moderator") {
      navigate(`${basePath}/activity`);
    } else {
      navigate(`${basePath}/approvals`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("relative h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent", className)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">{getTitle()}</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <UMLoader size={44} label="Unlocking memory…" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer relative group",
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <span className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm line-clamp-1",
                            !notification.is_read && "font-medium"
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons on hover */}
                  <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleViewAll}
            >
              {getViewAllLabel()}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default RoleNotificationBell;
