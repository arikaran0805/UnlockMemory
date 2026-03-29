import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { usePostVersions, PostVersion } from "@/hooks/usePostVersions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  ArrowLeft, 
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
import { isChatTranscript, extractExplanation } from "@/lib/chatContent";

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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/admin/posts/edit/${id}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Editor
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Version History
              </h1>
              <p className="text-muted-foreground">
                {post?.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {versions.length} version{versions.length !== 1 ? "s" : ""}
            </Badge>
          </div>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </Card>
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No versions saved yet</p>
                <p className="text-sm">Versions are created when you save or publish</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {versions.map((version, index) => (
                  <Card
                    key={version.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedVersion?.id === version.id ? "ring-2 ring-primary" : ""
                    } ${version.status === "published" ? "border-green-500/50 bg-green-50/50 dark:bg-green-900/10" : ""}`}
                    onClick={() => setSelectedVersion(version)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">v{version.version_number}</span>
                        {getRoleBadge(version.editor_role)}
                      </div>
                      {version.status === "published" && (
                        <Badge className="bg-green-600 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      )}
                      {version.status === "archived" && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Archived
                        </Badge>
                      )}
                    </div>
                    
                    {version.change_summary && (
                      <p className="text-sm text-muted-foreground mb-2 italic line-clamp-2">
                        "{version.change_summary}"
                      </p>
                    )}
                    
                    <div className="text-xs text-muted-foreground mb-3">
                      <div>{version.editor_profile?.full_name || version.editor_profile?.email || "Unknown"}</div>
                      <div>{format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}</div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVersion(version);
                          setViewMode("preview");
                        }}
                        className="gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(version);
                        }}
                        className="gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                      {isAdmin && version.status !== "published" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVersion(version);
                            setPublishDialogOpen(true);
                          }}
                          className="gap-1"
                        >
                          <Upload className="h-3 w-3" />
                          Publish
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Compare View */}
          <TabsContent value="compare" className="mt-6">
            <Card className={`p-6 transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 rounded-none overflow-auto" : ""}`}>
              {/* Fullscreen Toggle */}
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="gap-2"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="h-4 w-4" />
                      Exit Fullscreen
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4" />
                      Fullscreen
                    </>
                  )}
                </Button>
              </div>

              {/* Version Selectors */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">From (Older)</label>
                  <Select
                    value={compareVersion?.id || "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setCompareVersion(null);
                      } else {
                        setCompareVersion(versions.find(v => v.id === value) || null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a version</SelectItem>
                      {versions.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center gap-2">
                            <span>v{v.version_number}</span>
                            {v.editor_role === "admin" && <Shield className="h-3 w-3 text-primary" />}
                            {v.status === "published" && <CheckCircle className="h-3 w-3 text-green-500" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-6" />
                
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">To (Newer)</label>
                  <Select
                    value={selectedVersion?.id || "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setSelectedVersion(null);
                      } else {
                        setSelectedVersion(versions.find(v => v.id === value) || null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a version</SelectItem>
                      {versions.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center gap-2">
                            <span>v{v.version_number}</span>
                            {v.editor_role === "admin" && <Shield className="h-3 w-3 text-primary" />}
                            {v.status === "published" && <CheckCircle className="h-3 w-3 text-green-500" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Diff View Toggle */}
              <Tabs value={diffViewMode} onValueChange={(v) => setDiffViewMode(v as any)} className="mb-4">
                <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                  <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                  <TabsTrigger value="inline">Inline Diff</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Diff Content */}
              <ScrollArea className={isFullscreen ? "h-[calc(100vh-280px)]" : "h-[500px]"}>
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
                  <div className="text-center py-12 text-muted-foreground">
                    <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select two versions to compare</p>
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Preview View */}
          <TabsContent value="preview" className="mt-6">
            {selectedVersion ? (
              <Card className={`p-6 transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 rounded-none overflow-auto" : ""}`}>
                {/* Fullscreen Toggle */}
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="gap-2"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 className="h-4 w-4" />
                        Exit Fullscreen
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-4 w-4" />
                        Fullscreen
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">v{selectedVersion.version_number}</span>
                    {getRoleBadge(selectedVersion.editor_role)}
                    {selectedVersion.status === "published" && (
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    )}
                    {selectedVersion.status === "archived" && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Archived
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(selectedVersion)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                    {isAdmin && selectedVersion.status !== "published" && (
                      <Button
                        size="sm"
                        onClick={() => setPublishDialogOpen(true)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-4">
                  {selectedVersion.change_summary && (
                    <p className="italic mb-1">"{selectedVersion.change_summary}"</p>
                  )}
                  <p>
                    By {selectedVersion.editor_profile?.full_name || selectedVersion.editor_profile?.email} 
                    on {format(new Date(selectedVersion.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                
                <ScrollArea className={isFullscreen ? "h-[calc(100vh-220px)]" : ""}>
                  <div className="border rounded-lg p-6 bg-background">
                    {/* Render full post content - chat + rich text */}
                    {(() => {
                      const content = selectedVersion.content;
                      const isChat = isChatTranscript(content);
                      
                      if (isChat) {
                        // Split content at --- separator for chat vs explanation
                        const parts = content.split(/\n---\n/);
                        const chatContent = parts[0];
                        const richTextContent = parts.length > 1 ? parts.slice(1).join("\n---\n") : null;
                        
                        return (
                          <div className="space-y-8">
                            {chatContent && (
                              <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-4">Chat Content</h3>
                                <ChatConversationView content={chatContent} />
                              </div>
                            )}
                            {richTextContent && (
                              <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-4">Explanation</h3>
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
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a version to preview</p>
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
