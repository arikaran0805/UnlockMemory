import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { PostVersion } from "@/hooks/usePostVersions";
import { useVersionBookmarks } from "@/hooks/useVersionBookmarks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, RotateCcw, CheckCircle, GitCompare, Shield, User, AlertTriangle, ArrowLeftRight, ExternalLink, Bookmark, Pencil, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VersioningNoteType } from "@/components/VersioningNoteDialog";
import VersionDiffViewer from "@/components/VersionDiffViewer";
import SideBySideComparison from "@/components/SideBySideComparison";
import { isChatTranscript, extractChatSegments } from "@/lib/chatContent";

interface VersionHistoryPanelProps {
  versions: PostVersion[];
  loading: boolean;
  isAdmin: boolean;
  currentContent?: string;
  liveContent?: string;
  /** The post's actual DB status — used to prevent draft posts from being
   *  mis-labelled as "Live" by the content-matching fallback. */
  postStatus?: string;
  onRestore: (version: PostVersion) => void;
  onPublish: (version: PostVersion) => void;
  onPreview: (version: PostVersion) => void;
  onUpdateNote?: (versionId: string, noteType: string | null, summary: string | null) => Promise<boolean>;
  showVersionNotes?: boolean;
}

const VERSIONING_OPTIONS: { type: VersioningNoteType; label: string }[] = [
  { type: "typo_fix", label: "Typo Fix" },
  { type: "formatting", label: "Formatting" },
  { type: "content_update", label: "Content Update" },
  { type: "major_revision", label: "Major Revision" },
];

const VersionHistoryPanel = ({
  versions,
  loading,
  isAdmin,
  currentContent,
  liveContent,
  postStatus,
  onRestore,
  onPublish,
  onUpdateNote,
  showVersionNotes = true,
}: VersionHistoryPanelProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  // ID of the version the user explicitly clicked; null = auto-follow latest
  const [userClickedVersionId, setUserClickedVersionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [editNoteDialogOpen, setEditNoteDialogOpen] = useState(false);
  const [editNoteType, setEditNoteType] = useState<string | null>(null);
  const [editNoteSummary, setEditNoteSummary] = useState("");
  const [editNoteLoading, setEditNoteLoading] = useState(false);
  const [compareVersion, setCompareVersion] = useState<PostVersion | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<"inline" | "side-by-side">("side-by-side");

  // Version bookmarks
  const { isBookmarked, toggleBookmark } = useVersionBookmarks(id);

  // Determine which version(s) are currently published/live
  const publishedVersionIds = useMemo(() => {
    const ids = new Set<string>();

    versions.forEach((v) => {
      if (v.status === "published" || v.is_published === true) ids.add(v.id);
    });

    // Fallback: if nothing is marked published but we know the live post content,
    // infer the live version by matching content.
    // Only run when the post is actually published — draft posts share the same
    // DB content as their v1, which would wrongly label the draft as "Live".
    if (ids.size === 0 && liveContent && postStatus === "published") {
      const inferred = versions.find((v) => v.content === liveContent);
      if (inferred) ids.add(inferred.id);
    }

    return ids;
  }, [versions, liveContent]);

  // Group versions by status and bookmarks
  const groupedVersions = useMemo(() => {
    const bookmarked = versions.filter((v) => isBookmarked(v.id));
    const published = versions.filter(
      (v) => publishedVersionIds.has(v.id) && !isBookmarked(v.id)
    );
    const archived = versions.filter(
      (v) => v.status === "archived" && !publishedVersionIds.has(v.id) && !isBookmarked(v.id)
    );
    const unpublished = versions.filter(
      (v) =>
        !publishedVersionIds.has(v.id) &&
        v.status !== "archived" &&
        !isBookmarked(v.id)
    );

    return { bookmarked, published, archived, unpublished };
  }, [versions, isBookmarked, publishedVersionIds]);

  // Derive selectedVersion: follow latest automatically; respect explicit user selection.
  const selectedVersion = useMemo(() => {
    if (userClickedVersionId) {
      return versions.find(v => v.id === userClickedVersionId) ?? versions[0] ?? null;
    }
    return versions[0] ?? null;
  }, [userClickedVersionId, versions]);

  // When a new version is saved (versions[0] changes), reset to auto-follow latest.
  const latestVersionId = versions[0]?.id;
  useEffect(() => {
    setUserClickedVersionId(null);
  }, [latestVersionId]);


  const handleConfirmPublish = () => {
    if (selectedVersion) {
      onPublish(selectedVersion);
      setPublishDialogOpen(false);
    }
  };

  const handleRevertClick = (version: PostVersion) => {
    // Navigate to full version control page with preview tab active
    if (id) {
      navigate(`/admin/posts/${id}/versions?tab=preview&version=${version.id}`);
      setHistoryOpen(false);
    }
  };

  const handleConfirmRevert = () => {
    if (selectedVersion) {
      onRestore(selectedVersion);
      setRevertDialogOpen(false);
    }
  };

  const handleEditNoteClick = (version: PostVersion) => {
    setUserClickedVersionId(version.id);
    setEditNoteType(getVersionNoteType(version));
    setEditNoteSummary(getVersionNoteSummary(version) || "");
    setEditNoteDialogOpen(true);
  };

  const handleConfirmEditNote = async () => {
    if (selectedVersion && onUpdateNote) {
      setEditNoteLoading(true);
      const success = await onUpdateNote(
        selectedVersion.id,
        editNoteType,
        editNoteSummary || null
      );
      setEditNoteLoading(false);
      if (success) {
        setEditNoteDialogOpen(false);
      }
    }
  };

  const handleCompareClick = (version: PostVersion) => {
    // Navigate to full version control page with compare tab active
    if (id) {
      navigate(`/admin/posts/${id}/versions?tab=compare&version=${version.id}`);
      setHistoryOpen(false);
    }
  };

  const formatVersionDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy, h:mm a");
  };

  const getVersionNoteSummary = (version: PostVersion): string | null => {
    return (
      (version as PostVersion & { change_summary?: string | null }).change_summary ??
      null
    );
  };

  const getVersionNoteType = (version: PostVersion): string | null => {
    return (
      (version as PostVersion & { versioning_note_type?: string | null })
        .versioning_note_type ?? null
    );
  };

  const isVersionNoteLocked = (version: PostVersion): boolean => {
    return (
      (version as PostVersion & { versioning_note_locked?: boolean })
        .versioning_note_locked ?? false
    );
  };

  // Find the currently published/live version
  const currentlyPublishedVersion = useMemo(() => {
    return versions.find((v) => publishedVersionIds.has(v.id)) || null;
  }, [versions, publishedVersionIds]);

  const VersionListItem = ({
    version,
    isSelected,
    showBookmarkIcon = false,
  }: {
    version: PostVersion;
    isSelected?: boolean;
    showBookmarkIcon?: boolean;
  }) => {
    const versionIsBookmarked = isBookmarked(version.id);
    const isCurrentlyPublished = currentlyPublishedVersion?.id === version.id;

    const noteSummary = getVersionNoteSummary(version);
    const noteType = getVersionNoteType(version);
    const noteText = showVersionNotes
      ? noteSummary || noteType?.replace(/_/g, " ") || "No notes"
      : `Version ${version.version_number}`;

    const day = format(new Date(version.created_at), "MMM d, yyyy");
    const time = format(new Date(version.created_at), "h:mm a");

    return (
      <div
        className={`group relative rounded-lg cursor-pointer transition-colors ${
          isSelected ? "bg-primary/10" : "hover:bg-muted/50"
        }`}
        onClick={() => {
          setUserClickedVersionId(version.id);
          onRestore(version); // Load this version into the editor
          setHistoryOpen(false);
        }}
      >
        <div className="grid grid-cols-[1fr_auto] items-start gap-3 px-3 py-2.5">
          <div className="flex items-start gap-2 min-w-0">
            {showBookmarkIcon && (
              <Bookmark
                className="h-4 w-4 text-foreground flex-shrink-0"
                fill="currentColor"
              />
            )}
            <Badge
              variant="outline"
              className="h-5 text-[10px] px-1.5 flex-shrink-0 font-mono"
            >
              v{version.version_number}
            </Badge>
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-start gap-2 min-w-0">
                <span
                  className={`text-sm leading-snug whitespace-normal break-words overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] ${
                    isSelected ? "text-primary font-medium" : "text-foreground"
                  }`}
                  title={noteText}
                >
                  {noteText}
                </span>
                {isCurrentlyPublished && (
                  <Badge
                    variant="secondary"
                    className="h-5 text-[10px] px-1.5 gap-1 flex-shrink-0"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Live
                  </Badge>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {showVersionNotes && noteType && noteSummary && (
                  <span className="capitalize">
                    {noteType.replace(/_/g, " ")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  {version.editor_role === "admin" ? (
                    <Shield className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  <span className="capitalize">{version.editor_role}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className="text-xs text-muted-foreground whitespace-nowrap tabular-nums text-right leading-tight"
              title={formatVersionDate(version.created_at)}
            >
              <span className="block">{day}</span>
              <span className="block">{time}</span>
            </span>

            <div className="flex items-center gap-1 bg-muted rounded-md px-1 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(version.id);
                }}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${versionIsBookmarked ? "text-primary" : ""}`}
                  fill={versionIsBookmarked ? "currentColor" : "none"}
                />
              </Button>
              {showVersionNotes && !isVersionNoteLocked(version) && onUpdateNote && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditNoteClick(version);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompareClick(version);
                }}
                title="Compare versions"
              >
                <GitCompare className="h-3.5 w-3.5" />
              </Button>
              {version.status !== "published" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevertClick(version);
                  }}
                  title="Revert to this version"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            Version History
            {versions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {versions.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[460px] sm:w-[640px] max-w-[90vw] p-0 [&>button:last-child]:hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between gap-4">
              <SheetTitle>History</SheetTitle>
              <div className="flex items-center gap-1">
                {id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/posts/${id}/versions`)}
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
            </div>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="px-4 py-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="px-3 py-2.5 animate-pulse">
                      <div className="h-4 bg-muted rounded w-2/3 mb-1" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No versions saved yet</p>
                  <p className="text-sm mt-1">Versions are saved when you edit</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Currently Editing Indicator */}
                  {selectedVersion && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Currently editing v{selectedVersion.version_number}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bookmarked Section */}
                  {groupedVersions.bookmarked.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 px-3">
                        Bookmarked
                      </h3>
                      <div className="space-y-0.5">
                        {groupedVersions.bookmarked.map((version) => (
                          <VersionListItem 
                            key={version.id} 
                            version={version}
                            isSelected={selectedVersion?.id === version.id}
                            showBookmarkIcon={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Published Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 px-3">
                      Published
                    </h3>
                    {groupedVersions.published.length > 0 ? (
                      <div className="space-y-0.5">
                        {groupedVersions.published.map((version) => (
                          <VersionListItem
                            key={version.id}
                            version={version}
                            isSelected={selectedVersion?.id === version.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No published version yet
                      </div>
                    )}
                  </div>

                  {/* Unpublished Section */}
                  {groupedVersions.unpublished.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 px-3">
                        Unpublished
                      </h3>
                      <div className="space-y-0.5">
                        {groupedVersions.unpublished.map((version) => (
                          <VersionListItem 
                            key={version.id} 
                            version={version}
                            isSelected={selectedVersion?.id === version.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Archived Section */}
                  {groupedVersions.archived.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 px-3">
                        Archived
                      </h3>
                      <div className="space-y-0.5">
                        {groupedVersions.archived.map((version) => (
                          <VersionListItem
                            key={version.id}
                            version={version}
                            isSelected={selectedVersion?.id === version.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Version {selectedVersion?.version_number}?</DialogTitle>
            <DialogDescription>
              This will update the live post content with this version and mark it as published.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPublish}>
              Publish This Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Compare Versions
              {selectedVersion?.editor_role === "admin" && (
                <Badge className="bg-primary text-primary-foreground gap-1 ml-2">
                  <Shield className="h-3 w-3" />
                  Admin Edit
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Compare any two versions to see the differences
            </DialogDescription>
          </DialogHeader>
          
          {/* Version Selectors */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg flex-shrink-0">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Compare From (Older)
              </label>
              <Select
                value={compareVersion?.id || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setCompareVersion(null);
                  } else {
                    const version = versions.find(v => v.id === value);
                    setCompareVersion(version || null);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No comparison (show all)</SelectItem>
                  {versions
                    .filter(v => v.id !== selectedVersion?.id)
                    .map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          <span>v{v.version_number}</span>
                          {v.editor_role === "admin" && (
                            <Shield className="h-3 w-3 text-primary" />
                          )}
                          {v.status === "published" && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(v.created_at), "MMM d")}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-5" />
            
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Compare To (Newer)
              </label>
              <Select
                value={selectedVersion?.id || ""}
                onValueChange={(value) => {
                  setUserClickedVersionId(value || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                {versions
                    .filter(v => v.id !== compareVersion?.id)
                    .map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          <span>v{v.version_number}</span>
                          {v.editor_role === "admin" && (
                            <Shield className="h-3 w-3 text-primary" />
                          )}
                          {v.status === "published" && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(v.created_at), "MMM d")}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 overflow-hidden mt-2">
            <Tabs value={diffViewMode} onValueChange={(v) => setDiffViewMode(v as "inline" | "side-by-side")}>
              <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="inline">Inline Diff</TabsTrigger>
              </TabsList>
              
              <TabsContent value="side-by-side" className="mt-4">
                {selectedVersion && compareVersion ? (
                  <SideBySideComparison
                    oldVersion={compareVersion}
                    newVersion={selectedVersion}
                  />
                ) : selectedVersion ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Select a version to compare from the dropdown above</p>
                    <p className="text-sm mt-1">Or view all content without comparison</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select versions to compare
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="inline" className="mt-4">
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-green-200 dark:bg-green-800/50" />
                    <span>Added</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-red-200 dark:bg-red-800/50" />
                    <span>Removed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-amber-200 dark:bg-amber-800/50" />
                    <span>Modified</span>
                  </div>
                </div>

                {selectedVersion && (
                  <VersionDiffViewer
                    currentVersion={selectedVersion}
                    compareVersion={compareVersion}
                    currentContent={currentContent}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setDiffDialogOpen(false)}>
              Close
            </Button>
            {isAdmin && selectedVersion && (
              <Button onClick={() => {
                setDiffDialogOpen(false);
                handleRevertClick(selectedVersion);
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Version {selectedVersion.version_number}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog with Preview */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Restore to Version {selectedVersion?.version_number}?
            </DialogTitle>
            <DialogDescription>
              This will replace your current editor content with the content from this version.
              Review the content below before confirming.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVersion && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="flex items-center gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Version {selectedVersion.version_number}</span>
                    {selectedVersion.editor_role === "admin" ? (
                      <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <User className="h-3 w-3" />
                        Moderator
                      </Badge>
                    )}
                    {selectedVersion.status === "published" && (
                      <Badge className="bg-green-600 text-white text-xs">Published</Badge>
                    )}
                    {selectedVersion.status === "archived" && (
                      <Badge variant="outline" className="text-xs">Archived</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created on {format(new Date(selectedVersion.created_at), "MMMM d, yyyy 'at' h:mm a")} by{" "}
                    {selectedVersion.editor_profile?.full_name || selectedVersion.editor_profile?.email || "Unknown"}
                  </div>
                  {showVersionNotes && getVersionNoteSummary(selectedVersion) && (
                    <div className="text-sm text-muted-foreground mt-1 italic">
                      "{getVersionNoteSummary(selectedVersion)}"
                    </div>
                  )}
                </div>
              </div>

              {/* Content Preview styled like public post */}
              <div className="border rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-lg">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center text-xs shadow">
                      🤖
                    </div>
                    <span className="text-sm font-medium">Content Preview</span>
                  </div>
                </div>
                <ScrollArea className="h-[280px]">
                  <div className="p-4">
                    {isChatTranscript(selectedVersion.content) ? (
                      <div className="space-y-4">
                        {extractChatSegments(selectedVersion.content, { allowSingle: true }).map((bubble: any, index: number) => {
                          const isMentor = bubble.speaker?.toLowerCase() === "karan";
                          return (
                            <div
                              key={index}
                              className={`flex items-end gap-2.5 ${isMentor ? "flex-row-reverse" : "flex-row"}`}
                            >
                              {/* Avatar */}
                              <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md ${
                                  isMentor
                                    ? "bg-gradient-to-br from-blue-400 to-blue-600"
                                    : "bg-gradient-to-br from-muted to-muted/80"
                                }`}
                              >
                                {isMentor ? "👨‍💻" : "🤖"}
                              </div>
                              {/* Bubble */}
                              <div
                                className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm ${
                                  isMentor
                                    ? "bg-gradient-to-br from-[hsl(210,100%,52%)] to-[hsl(210,100%,45%)] text-white rounded-br-md"
                                    : "bg-muted/80 text-foreground rounded-bl-md border border-border/30"
                                }`}
                              >
                                <div className={`text-[10px] font-semibold mb-1 tracking-wide uppercase ${
                                  isMentor ? "text-blue-100/80" : "text-primary"
                                }`}>
                                  {bubble.speaker || "Assistant"}
                                </div>
                                <div className="text-sm leading-relaxed">{bubble.content}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div 
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedVersion.content) }}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t bg-background">
            <Button variant="outline" onClick={() => setRevertDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleConfirmRevert} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Restore This Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showVersionNotes && (
        <Dialog open={editNoteDialogOpen} onOpenChange={setEditNoteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Version Note</DialogTitle>
              <DialogDescription>
                Update the note type and summary for this version.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Note Type</Label>
                <Select
                  value={editNoteType || ""}
                  onValueChange={(value) => setEditNoteType(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VERSIONING_OPTIONS.map((option) => (
                      <SelectItem key={option.type} value={option.type}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-change-summary">Change Summary</Label>
                <Textarea
                  id="edit-change-summary"
                  value={editNoteSummary}
                  onChange={(e) => setEditNoteSummary(e.target.value)}
                  placeholder="Describe what changed..."
                  className="h-20 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setEditNoteDialogOpen(false)}
                disabled={editNoteLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmEditNote} disabled={editNoteLoading}>
                {editNoteLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default VersionHistoryPanel;
