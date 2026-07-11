import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, Plus, Upload, Trash2, FileText, Image, File, Music,
  Video, X, ChevronRight, ArrowLeft, Download, FolderPlus, MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Folder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
}

interface SharedFile {
  id: string;
  folder_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

const fileIcon = (mime: string) => {
  if (mime.startsWith("image/")) return <Image className="w-5 h-5 text-[hsl(var(--us-gold))]" />;
  if (mime.startsWith("video/")) return <Video className="w-5 h-5 text-[hsl(var(--us-coral))]" />;
  if (mime.startsWith("audio/")) return <Music className="w-5 h-5 text-[hsl(var(--us-sage))]" />;
  if (mime.includes("pdf")) return <FileText className="w-5 h-5 text-destructive" />;
  return <File className="w-5 h-5 text-primary" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const SharedFileManager = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [folderStack, setFolderStack] = useState<Folder[]>([]); // breadcrumb path
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  const activeFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
  const currentParentId = activeFolder?.id || null;

  useEffect(() => {
    if (user) {
      fetchFolders();
      fetchFiles();
    }
  }, [user]);

  const fetchFolders = async () => {
    const { data } = await supabase
      .from("shared_folders")
      .select("*")
      .order("name", { ascending: true });
    if (data) setFolders(data as Folder[]);
  };

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("shared_files")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setFiles(data as SharedFile[]);
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    const { error } = await supabase.from("shared_folders").insert({
      name: newFolderName.trim(),
      user_id: user.id,
      parent_id: currentParentId,
    } as any);
    if (error) {
      toast({ title: "Failed to create folder", variant: "destructive" });
      return;
    }
    setNewFolderName("");
    setShowNewFolder(false);
    fetchFolders();
    toast({ title: "Folder created ✓" });
  };

  const deleteFolder = async (id: string) => {
    // Remove the storage objects for files in this folder (and its direct subfolders)
    // so we don't orphan them in the bucket when the DB rows go away.
    const folderIds = new Set<string>([id]);
    folders.forEach((f) => { if (f.parent_id === id) folderIds.add(f.id); });
    const paths = files.filter((f) => folderIds.has(f.folder_id)).map((f) => f.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from("shared-files").remove(paths);
    }

    // Check the delete actually affected a row — RLS blocks deleting a partner's folder,
    // so only update the UI / toast success on a real delete.
    const { data, error } = await supabase.from("shared_folders").delete().eq("id", id).select();
    if (error || !data || data.length === 0) {
      toast({ title: "Couldn't delete folder", description: "You can only delete folders you created.", variant: "destructive" });
      return;
    }
    setFolderStack((prev) => prev.filter((f) => f.id !== id));
    fetchFolders();
    fetchFiles();
    toast({ title: "Folder deleted" });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !user || !activeFolder) return;
    setUploading(true);

    let successCount = 0;
    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${activeFolder.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("shared-files").upload(path, file);
      if (uploadErr) {
        toast({ title: `Upload failed: ${file.name}`, variant: "destructive" });
        continue;
      }

      const { error: insertErr } = await supabase.from("shared_files").insert({
        folder_id: activeFolder.id,
        user_id: user.id,
        file_name: file.name,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
      } as any);
      if (insertErr) {
        // Roll back the orphaned storage object if the DB row couldn't be created.
        await supabase.storage.from("shared-files").remove([path]);
        toast({ title: `Upload failed: ${file.name}`, variant: "destructive" });
        continue;
      }
      successCount++;
    }

    setUploading(false);
    if (successCount > 0) {
      fetchFiles();
      toast({ title: `${successCount} file${successCount !== 1 ? "s" : ""} uploaded ✓` });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteFile = async (f: SharedFile) => {
    // Check the delete affected a row — RLS blocks deleting a partner's file, so only
    // remove the storage object / update the UI on a real delete.
    const { data, error } = await supabase.from("shared_files").delete().eq("id", f.id).select();
    if (error || !data || data.length === 0) {
      toast({ title: "Couldn't delete file", description: "You can only delete files you added.", variant: "destructive" });
      return;
    }
    await supabase.storage.from("shared-files").remove([f.storage_path]);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    toast({ title: "File deleted" });
  };

  const downloadFile = async (f: SharedFile) => {
    const { data } = await supabase.storage.from("shared-files").createSignedUrl(f.storage_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const navigateToFolder = (folder: Folder) => {
    setFolderStack((prev) => [...prev, folder]);
    setShowNewFolder(false);
  };

  const navigateBack = () => {
    setFolderStack((prev) => prev.slice(0, -1));
    setShowNewFolder(false);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      setFolderStack([]);
    } else {
      setFolderStack((prev) => prev.slice(0, index + 1));
    }
    setShowNewFolder(false);
  };

  // Current level items
  const currentFolders = folders.filter((f) => f.parent_id === currentParentId);
  const folderFiles = activeFolder ? files.filter((f) => f.folder_id === activeFolder.id) : [];

  // Inside a folder view
  if (activeFolder) {
    return (
      <div className="space-y-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <button
            onClick={() => navigateToBreadcrumb(-1)}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Files
          </button>
          {folderStack.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              {i === folderStack.length - 1 ? (
                <span className="font-semibold text-foreground">{f.name}</span>
              ) : (
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {f.name}
                </button>
              )}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={navigateBack}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" /> Subfolder
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
          <input ref={fileInputRef} type="file" multiple className="absolute w-0 h-0 overflow-hidden opacity-0" onChange={handleUpload} data-testid="file-upload-input" />
        </div>

        {/* New subfolder input */}
        <AnimatePresence>
          {showNewFolder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createFolder()}
                  placeholder="Subfolder name…"
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={createFolder} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                  Create
                </button>
                <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="p-2.5">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subfolders */}
        {currentFolders.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {currentFolders.map((folder, i) => {
              const count = files.filter((f) => f.folder_id === folder.id).length;
              const subCount = folders.filter((f) => f.parent_id === folder.id).length;
              return (
                <motion.div
                  key={folder.id}
                  role="button"
                  tabIndex={0}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigateToFolder(folder)}
                  onKeyDown={(e) => { if (e.key === "Enter") navigateToFolder(folder); }}
                  className="relative flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary/50 transition-colors group cursor-pointer"
                >
                  <FolderOpen className="w-7 h-7 text-[hsl(var(--us-gold))]" />
                  <p className="text-sm font-semibold text-foreground truncate w-full">{folder.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {count} file{count !== 1 ? "s" : ""}{subCount > 0 ? ` · ${subCount} folder${subCount !== 1 ? "s" : ""}` : ""}
                  </p>
                  <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-muted-foreground/40" />
                  {folder.user_id === user?.id && (
                  <div className="absolute bottom-3 right-3" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setOpenActionMenu(openActionMenu === `subfolder-${folder.id}` ? null : `subfolder-${folder.id}`)}
                        className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {openActionMenu === `subfolder-${folder.id}` && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                            <button
                              onClick={() => { deleteFolder(folder.id); setOpenActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete folder
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Files */}
        {folderFiles.length === 0 && currentFolders.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Upload className="w-6 h-6" />
            <span>{uploading ? "Uploading…" : "Upload your first file"}</span>
          </button>
        ) : folderFiles.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/40">
            {folderFiles.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 group"
              >
                {fileIcon(f.mime_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {formatSize(f.file_size)} · {new Date(f.created_at).toLocaleDateString("default", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenActionMenu(openActionMenu === `file-${f.id}` ? null : `file-${f.id}`)}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {openActionMenu === `file-${f.id}` && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                        <button
                          onClick={() => { downloadFile(f); setOpenActionMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-muted-foreground" /> Download
                        </button>
                        {f.user_id === user?.id && (
                          <>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => { deleteFile(f); setOpenActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // Root folder list view
  const rootFolders = folders.filter((f) => !f.parent_id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your shared file folders</p>
        <button
          onClick={() => setShowNewFolder(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Folder
        </button>
      </div>

      {/* New folder input */}
      <AnimatePresence>
        {showNewFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                placeholder="Folder name (e.g. Travel, Finances)"
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={createFolder} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                Create
              </button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="p-2.5">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folders grid */}
      {rootFolders.length === 0 && !showNewFolder ? (
        <button
          onClick={() => setShowNewFolder(true)}
          className="w-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <FolderOpen className="w-8 h-8" />
          <span>Create your first folder</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {rootFolders.map((folder, i) => {
            const count = files.filter((f) => f.folder_id === folder.id).length;
            const subCount = folders.filter((f) => f.parent_id === folder.id).length;
            return (
              <motion.div
                key={folder.id}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigateToFolder(folder)}
                onKeyDown={(e) => { if (e.key === "Enter") navigateToFolder(folder); }}
                className="relative flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary/50 transition-colors group cursor-pointer"
              >
                <FolderOpen className="w-8 h-8 text-[hsl(var(--us-gold))]" />
                <p className="text-sm font-semibold text-foreground truncate w-full">{folder.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {count} file{count !== 1 ? "s" : ""}{subCount > 0 ? ` · ${subCount} folder${subCount !== 1 ? "s" : ""}` : ""}
                </p>
                <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-muted-foreground/40" />
                {folder.user_id === user?.id && (
                <div className="absolute bottom-3 right-3" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      onClick={() => setOpenActionMenu(openActionMenu === `rootfolder-${folder.id}` ? null : `rootfolder-${folder.id}`)}
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {openActionMenu === `rootfolder-${folder.id}` && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                          <button
                            onClick={() => { deleteFolder(folder.id); setOpenActionMenu(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete folder
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {!user && (
        <p className="text-xs text-muted-foreground text-center">Sign in to manage files</p>
      )}
    </div>
  );
};

export default SharedFileManager;