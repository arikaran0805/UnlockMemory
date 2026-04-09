import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { usePostVersions, PostVersion } from "@/hooks/usePostVersions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  History,
  RotateCcw, 
  Upload, 
  Eye, 
  CheckCircle, 
  GitCompare, 
  Shield, 
  User, 
  ArrowLeftRight,
  FileText,
  AlertTriangle,
  Maximize2,
  Minimize2
} from "lucide-react";
import VersionDiffViewer from "@/components/VersionDiffViewer";
import SideBySideComparison from "@/components/SideBySideComparison";
import ContentRenderer from "@/components/ContentRenderer";
import { ChatConversationView } from "@/components/chat-editor";
import { isChatTranscript } from "@/lib/chatContent";

const AdminPostVersions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const [post, setPost] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<PostVersion | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "compare" | "preview">("list");
  const [diffViewMode, setDiffViewMode] = useState<"inline" | "side-by-side">("side-by-side");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { versions, loading: versionsLoading, publishVersion, restoreVersion } = usePostVersions(id);

  // Handle URL parameters for tab and version selection
  useEffect(() => {
    const tab = searchParams.get("tab");
    const versionId = searchParams.get("version");
    
    if (tab === "compare") {
      setViewMode("compare");
    } else if (tab === "preview") {
      setViewMode("preview");
    }
    
    if (versionId && versions.length > 0) {
      const targetVersion = versions.find(v => v.id === versionId);
      if (targetVersion) {
        setSelectedVersion(targetVersion);
        // For compare mode, auto-select previous version
        const currentIndex = versions.findIndex(v => v.id === versionId);
        const prevVersion = currentIndex < versions.length - 1 ? versions[currentIndex + 1] : null;
        setCompareVersion(prevVersion);
      }
    }
  }, [searchParams, versions]);

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (!roleLoading && !isAdmin && !isModerator) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [roleLoading, isAdmin, isModerator]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("title, content")
          .eq("id", id)
          .single();

        if (error) throw error;
        setPost(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load post",
          variant: "destructive",
        });
        navigate("/admin/posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handlePublish = async () => {
    if (!selectedVersion || !id) return;
    
    const success = await publishVersion(selectedVersion.id, selectedVersion.content);
    if (success) {
      setPublishDialogOpen(false);
      toast({
        title: "Published",
        description: `Version ${selectedVersion.version_number} is now live`,
      });
    }
  };

  const handleRestore = async (version: PostVersion) => {
    const content = await restoreVersion(version);
    if (content) {
      navigate(`/admin/posts/edit/${id}`);
      toast({
        title: "Restored",
        description: `Navigating to editor with v${version.version_number} content`,
      });
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <User className="h-3 w-3" />
        Moderator
      </Badge>
    );
  };

  if (roleLoading || loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-0">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Version History</h1>
            <p className="text-sm text-muted-foreground/60 mt-1">Track and compare changes across versions</p>
          </div>
          <Badge variant="secondary" className="text-sm w-fit">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <FileText className="h-4 w-4" />
              All Versions
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <GitCompare className="h-4 w-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2" disabled={!selectedVersion}>
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Version List View */}
          <TabsContent value="list" className="mt-6">
            {versionsLoading ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border/50 rounded-xl">
                <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No versions saved yet</p>
                <p className="text-sm mt-1 opacity-70">Versions are created when you save or publish</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {versions.map((version) => {
                  const isSelected = selectedVersion?.id === version.id;
                  const isLive = version.status === "published";
                  const isArchived = version.status === "archived";
                  const authorName =
                    version.editor_profile?.full_name ||
                    version.editor_profile?.email?.split("@")[0] ||
                    "Unknown";
                  const initials = authorName.slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      className={[
                        "group relative rounded-xl border bg-card p-4 cursor-pointer transition-all duration-150",
                        "hover:shadow-md hover:border-border",
                        isSelected ? "ring-2 ring-primary border-primary/30 shadow-sm" : "border-border/60",
                        isLive ? "bg-green-50/40 dark:bg-green-900/10" : "",
                      ].join(" ")}
                    >
                      {/* Top row: version number + status badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold tracking-tight text-foreground">
                            v{version.version_number}
                          </span>
                          {getRoleBadge(version.editor_role)}
                        </div>
                        {isLive && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5">
                            <CheckCircle className="h-3 w-3" />
                            Live
                          </span>
                        )}
                        {isArchived && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 border border-border/40 rounded-full px-2 py-0.5">
                            Archived
                          </span>
                        )}
                      </div>

                      {/* Author + date */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{authorName}</p>
                          <p className="text-[11px] text-muted-foreground/70">
                            {format(new Date(version.created_at), "MMM d, yyyy · h:mm a")}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs gap-1 flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVersion(version);
                            setViewMode("preview");
                          }}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        {!isLive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(version);
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                        )}
                        {isAdmin && !isLive && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersion(version);
                              setPublishDialogOpen(true);
                            }}
                          >
                            <Upload className="h-3 w-3" />
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Compare View */}
          <TabsContent value="compare" className="mt-6">
            <div className={`transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 bg-background overflow-auto p-6" : ""}`}>
              {/* Unified Control Bar */}
              <div className="flex items-center gap-2 mb-6 p-2.5 bg-muted/20 border border-border/50 rounded-xl">
                {/* From dropdown */}
                <div className="flex-1 min-w-0">
                  <Select
                    value={compareVersion?.id || "none"}
                    onValueChange={(value) => {
                      setCompareVersion(value === "none" ? null : versions.find(v => v.id === value) || null);
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="From version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">From version</SelectItem>
                      {versions.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <span className="flex items-center gap-2">
                            <span>v{v.version_number}</span>
                            {v.editor_role === "admin" && <Shield className="h-3 w-3 text-primary" />}
                            {v.status === "published" && <CheckCircle className="h-3 w-3 text-green-500" />}
                            {v.status === "archived" && <span className="text-xs text-muted-foreground">(archived)</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Swap button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full hover:bg-primary/10"
                  onClick={() => {
                    const tmp = compareVersion;
                    setCompareVersion(selectedVersion);
                    setSelectedVersion(tmp);
                  }}
                  title="Swap versions"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>

                {/* To dropdown */}
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedVersion?.id || "none"}
                    onValueChange={(value) => {
                      setSelectedVersion(value === "none" ? null : versions.find(v => v.id === value) || null);
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="To version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">To version</SelectItem>
                      {versions.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <span className="flex items-center gap-2">
                            <span>v{v.version_number}</span>
                            {v.editor_role === "admin" && <Shield className="h-3 w-3 text-primary" />}
                            {v.status === "published" && <CheckCircle className="h-3 w-3 text-green-500" />}
                            {v.status === "archived" && <span className="text-xs text-muted-foreground">(archived)</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Separator */}
                <div className="h-8 w-px bg-border/60 mx-1 shrink-0" />

                {/* Diff mode toggle */}
                <div className="flex items-center bg-muted/60 rounded-lg p-0.5 shrink-0">
                  <button
                    onClick={() => setDiffViewMode("side-by-side")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      diffViewMode === "side-by-side"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Side by Side
                  </button>
                  <button
                    onClick={() => setDiffViewMode("inline")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      diffViewMode === "inline"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Inline
                  </button>
                </div>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>

              {/* Diff Content — no outer ScrollArea; inner components handle scrolling */}
              {selectedVersion && compareVersion ? (
                diffViewMode === "side-by-side" ? (
                  <SideBySideComparison
                    oldVersion={compareVersion}
                    newVersion={selectedVersion}
                  />
                ) : (
                  <VersionDiffViewer
                    currentVersion={selectedVersion}
                    compareVersion={compareVersion}
                    currentContent={post?.content}
                  />
                )
              ) : (
                <div className="text-center py-16 text-muted-foreground border border-dashed border-border/50 rounded-xl">
                  <GitCompare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Select two versions to compare</p>
                  <p className="text-sm mt-1 opacity-70">Use the dropdowns above to choose versions</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Preview View */}
          <TabsContent value="preview" className="mt-6">
            {selectedVersion ? (
              <div className={`transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 bg-background overflow-auto" : ""}`}>
                {/* Preview toolbar */}
                <div className="flex items-center justify-between mb-4 px-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-foreground">v{selectedVersion.version_number}</span>
                    {getRoleBadge(selectedVersion.editor_role)}
                    {selectedVersion.status === "published" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5">
                        <CheckCircle className="h-3 w-3" />
                        Live
                      </span>
                    )}
                    {selectedVersion.status === "archived" && (
                      <span className="text-xs text-muted-foreground bg-muted/60 border border-border/40 rounded-full px-2 py-0.5">
                        Archived
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/60">
                      by {selectedVersion.editor_profile?.full_name || selectedVersion.editor_profile?.email?.split("@")[0]} ·{" "}
                      {format(new Date(selectedVersion.created_at), "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => handleRestore(selectedVersion)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </Button>
                    {isAdmin && selectedVersion.status !== "published" && (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setPublishDialogOpen(true)}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Publish
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    >
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Content panel */}
                <div className={`border border-border/50 rounded-xl bg-card shadow-sm overflow-hidden ${isFullscreen ? "h-[calc(100vh-80px)]" : ""}`}>
                  <ScrollArea className={isFullscreen ? "h-full" : ""}>
                    <div className="px-8 py-8 max-w-3xl mx-auto">
                      {(() => {
                        const content = selectedVersion.content;
                        const isChat = isChatTranscript(content);

                        if (isChat) {
                          const parts = content.split(/\n---\n/);
                          const chatContent = parts[0];
                          const richTextContent = parts.length > 1 ? parts.slice(1).join("\n---\n") : null;
                          return (
                            <div className="space-y-8">
                              {chatContent && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">Chat</p>
                                  <ChatConversationView content={chatContent} />
                                </div>
                              )}
                              {richTextContent && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">Explanation</p>
                                  <ContentRenderer htmlContent={richTextContent} />
                                </div>
                              )}
                            </div>
                          );
                        }

                        return <ContentRenderer htmlContent={content} />;
                      })()}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border/50 rounded-xl">
                <Eye className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Select a version to preview</p>
                <p className="text-sm mt-1 opacity-70">Click any version in the All Versions tab</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>

    {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish v{selectedVersion?.version_number}?</DialogTitle>
            <DialogDescription>
              This will update the live post content with this version.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const publishedVersion = versions.find(v => v.status === "published");
            const isOlderThanPublished = publishedVersion && selectedVersion && 
              selectedVersion.version_number < publishedVersion.version_number;
            
            if (isOlderThanPublished) {
              return (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You are about to publish an older version (v{selectedVersion?.version_number}) than the currently live version (v{publishedVersion?.version_number}). 
                    This will replace newer content with older content.
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish}>
              <Upload className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPostVersions;
