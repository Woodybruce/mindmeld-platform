import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, Plus, Upload, Trash2, FileText, Image, File, Music,
  Video, X, ChevronRight, ArrowLeft, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Folder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
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
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);

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
    // Files cascade-delete via FK
    await supabase.from("shared_folders").delete().eq("id", id);
    if (activeFolder?.id === id) setActiveFolder(null);
    fetchFolders();
    fetchFiles();
    toast({ title: "Folder deleted" });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !user || !activeFolder) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${activeFolder.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("shared-files").upload(path, file);
      if (uploadErr) {
        toast({ title: `Upload failed: ${file.name}`, variant: "destructive" });
        continue;
      }

      await supabase.from("shared_files").insert({
        folder_id: activeFolder.id,
        user_id: user.id,
        file_name: file.name,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
      } as any);
    }

    setUploading(false);
    fetchFiles();
    toast({ title: "Files uploaded ✓" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteFile = async (f: SharedFile) => {
    await supabase.storage.from("shared-files").remove([f.storage_path]);
    await supabase.from("shared_files").delete().eq("id", f.id);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    toast({ title: "File deleted" });
  };

  const downloadFile = async (f: SharedFile) => {
    const { data } = await supabase.storage.from("shared-files").createSignedUrl(f.storage_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const folderFiles = activeFolder ? files.filter((f) => f.folder_id === activeFolder.id) : [];

  // Folder view
  if (activeFolder) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveFolder(null)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to folders
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">{activeFolder.name}</h3>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
          >
            <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Upload"}
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
        </div>

        {folderFiles.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Upload className="w-6 h-6" />
            <span>{uploading ? "Uploading…" : "Upload your first file"}</span>
          </button>
        ) : (
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
                  <p className="text-[11px] text-muted-foreground">
                    {formatSize(f.file_size)} · {new Date(f.created_at).toLocaleDateString("default", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <button onClick={() => downloadFile(f)} className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                </button>
                <button onClick={() => deleteFile(f)} className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Folder list view
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
      {folders.length === 0 && !showNewFolder ? (
        <button
          onClick={() => setShowNewFolder(true)}
          className="w-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <FolderOpen className="w-8 h-8" />
          <span>Create your first folder</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {folders.map((folder, i) => {
            const count = files.filter((f) => f.folder_id === folder.id).length;
            return (
              <motion.button
                key={folder.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveFolder(folder)}
                className="relative flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary/50 transition-colors group"
              >
                <FolderOpen className="w-8 h-8 text-[hsl(var(--us-gold))]" />
                <p className="text-sm font-semibold text-foreground truncate w-full">{folder.name}</p>
                <p className="text-[11px] text-muted-foreground">{count} file{count !== 1 ? "s" : ""}</p>
                <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-muted-foreground/40" />
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                  className="absolute bottom-3 right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </motion.button>
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
