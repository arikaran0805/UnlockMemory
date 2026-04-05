import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Trash2, Edit2, Search, Image, FileText, Video, Music, Copy, FolderOpen } from "lucide-react";

interface MediaFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

const AdminMedia = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);

    // Check for admin or moderator role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    const roles = roleData.map(r => r.role);
    const moderatorOnly = roles.includes("moderator") && !roles.includes("admin");
    setIsModerator(moderatorOnly);

    fetchMedia(session.user.id, moderatorOnly);
  };

  const fetchMedia = async (currentUserId: string, moderatorOnly: boolean) => {
    let query = supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    // If moderator, only show their own media
    if (moderatorOnly) {
      query = query.eq("user_id", currentUserId);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error fetching media", variant: "destructive" });
    } else {
      setMedia(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !userId) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: `Failed to upload ${file.name}`, variant: "destructive" });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("media").insert({
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        user_id: userId,
      });

      if (dbError) {
        toast({ title: `Failed to save ${file.name}`, variant: "destructive" });
      }
    }

    toast({ title: "Upload complete" });
    setUploading(false);
    if (userId) fetchMedia(userId, isModerator);
    e.target.value = "";
  };

  const handleRename = async () => {
    if (!selectedFile || !newFileName.trim()) return;

    const { error } = await supabase
      .from("media")
      .update({ file_name: newFileName.trim() })
      .eq("id", selectedFile.id);

    if (error) {
      toast({ title: "Failed to rename", variant: "destructive" });
    } else {
      toast({ title: "File renamed" });
      if (userId) fetchMedia(userId, isModerator);
    }
    setRenameDialogOpen(false);
    setSelectedFile(null);
    setNewFileName("");
  };

  const handleDelete = async () => {
    if (!selectedFile) return;

    // Extract path from URL
    const urlParts = selectedFile.file_url.split("/site-assets/");
    if (urlParts.length > 1) {
      await supabase.storage.from("site-assets").remove([urlParts[1]]);
    }

    const { error } = await supabase.from("media").delete().eq("id", selectedFile.id);

    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "File deleted" });
      if (userId) fetchMedia(userId, isModerator);
    }
    setDeleteDialogOpen(false);
    setSelectedFile(null);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied to clipboard" });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-8 w-8 text-primary" />;
    if (type.startsWith("video/")) return <Video className="h-8 w-8 text-primary" />;
    if (type.startsWith("audio/")) return <Music className="h-8 w-8 text-primary" />;
    return <FileText className="h-8 w-8 text-primary" />;
  };

  const filteredMedia = media.filter((file) =>
    file.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLoadingGrid = () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <Card key={`media-skeleton-${index}`} className="overflow-hidden">
          <CardContent className="p-0">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Media Library</h1>
          <p className="text-muted-foreground">Upload and manage images, videos, and other assets</p>
        </div>
        <Button asChild disabled={uploading}>
          <Label htmlFor="upload" className="cursor-pointer">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Files"}
          </Label>
        </Button>
        <Input
          id="upload"
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
              <Input
                placeholder="Search files by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredMedia.length} {filteredMedia.length === 1 ? "file" : "files"} shown
              <span className="mx-2">•</span>
              Supports images, videos, and documents
            </p>
          </div>
          <div className="hidden shrink-0 text-xs text-muted-foreground lg:block">
            Built for uploads now, ready for filters and views later
          </div>
        </div>

        <Card className="border-border/70">
          <CardContent className="p-6">
            {loading ? (
              renderLoadingGrid()
            ) : filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-2xl border border-border/60 bg-muted/40 p-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {searchQuery ? "No matching files" : "No media files yet"}
                </h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different file name or clear your search to see the full library."
                    : "Upload images, videos, and other assets to use across your platform."}
                </p>
                {!searchQuery && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Supports common image, video, audio, and document formats
                  </p>
                )}
                {!searchQuery && (
                  <Button asChild className="mt-5" disabled={uploading}>
                    <Label htmlFor="upload-empty" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload your first file
                    </Label>
                  </Button>
                )}
                {!searchQuery && (
                  <Input
                    id="upload-empty"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredMedia.map((file) => (
                  <Card key={file.id} className="group overflow-hidden border-border/70">
                    <CardContent className="p-0">
                      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted">
                        {file.file_type.startsWith("image/") ? (
                          <img
                            src={file.file_url}
                            alt={file.file_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getFileIcon(file.file_type)
                        )}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => copyToClipboard(file.file_url)}
                            aria-label={`Copy URL for ${file.file_name}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => {
                              setSelectedFile(file);
                              setNewFileName(file.file_name);
                              setRenameDialogOpen(true);
                            }}
                            aria-label={`Rename ${file.file_name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => {
                              setSelectedFile(file);
                              setDeleteDialogOpen(true);
                            }}
                            aria-label={`Delete ${file.file_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newName">New Name</Label>
              <Input
                id="newName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedFile?.file_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminMedia;
