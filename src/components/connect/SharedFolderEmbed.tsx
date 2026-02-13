import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, ExternalLink, Trash2, FolderOpen, Link2, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EmbeddedFolder {
  id: string;
  label: string;
  url: string;
  embedUrl: string;
  provider: string;
}

const STORAGE_KEY = "shared-folder-embeds";

/** Convert a share URL into an embeddable iframe URL */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);

    // Google Drive folder
    if (u.hostname.includes("drive.google.com") && u.pathname.includes("/folders/")) {
      const folderId = u.pathname.split("/folders/")[1]?.split(/[?/]/)[0];
      if (folderId) return `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
    }

    // Google Docs/Sheets/Slides
    if (u.hostname.includes("docs.google.com")) {
      return url.replace(/\/edit.*/, "/preview").replace(/\/view.*/, "/preview");
    }

    // OneDrive / SharePoint — use the _layouts/15/embed.aspx endpoint
    if (u.hostname.includes("sharepoint.com") || u.hostname.includes("onedrive.live.com") || u.hostname.includes("1drv.ms")) {
      // For SharePoint personal (OneDrive for Business), use embed.aspx with the original URL
      const host = u.origin;
      return `${host}/_layouts/15/embed.aspx?url=${encodeURIComponent(url)}`;
    }

    // Dropbox
    if (u.hostname.includes("dropbox.com")) {
      return url.replace("www.dropbox.com", "www.dropbox.com");
    }

    // Notion
    if (u.hostname.includes("notion.so") || u.hostname.includes("notion.site")) {
      return url;
    }

    // Generic
    return url;
  } catch {
    return null;
  }
}

function detectProvider(url: string): string {
  if (url.includes("drive.google.com") || url.includes("docs.google.com")) return "Google Drive";
  if (url.includes("sharepoint.com") || url.includes("onedrive")) return "OneDrive";
  if (url.includes("1drv.ms")) return "OneDrive";
  if (url.includes("dropbox.com")) return "Dropbox";
  if (url.includes("notion.so") || url.includes("notion.site")) return "Notion";
  return "Link";
}

const SharedFolderEmbed = () => {
  const [folders, setFolders] = useState<EmbeddedFolder[]>([]);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const existing: EmbeddedFolder[] = JSON.parse(stored);
      const updated = existing.map((f) => ({
        ...f,
        embedUrl: toEmbedUrl(f.url) || f.embedUrl,
      }));
      save(updated);
      setFolders(updated);
    }
  }, []);

  const save = (next: EmbeddedFolder[]) => {
    setFolders(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addFolder = () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;

    const embedUrl = toEmbedUrl(url);
    if (!embedUrl) {
      toast({ title: "Couldn't parse that URL", variant: "destructive" });
      return;
    }

    const provider = detectProvider(url);
    const label = newLabel.trim() || provider;

    const folder: EmbeddedFolder = {
      id: Date.now().toString(),
      label,
      url,
      embedUrl,
      provider,
    };

    save([...folders, folder]);
    setNewUrl("");
    setNewLabel("");
    setAdding(false);
    toast({ title: `${provider} folder added ✓` });
  };

  const removeFolder = (id: string) => {
    save(folders.filter((f) => f.id !== id));
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Embed shared folders from OneDrive, Google Drive, Dropbox, or Notion</p>

      {/* Folder embeds — always visible */}
      {folders.map((folder, i) => {
        const isCollapsed = collapsedIds.has(folder.id);
        return (
          <motion.div
            key={folder.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border/50 bg-card overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{folder.label}</p>
                <p className="text-[11px] text-muted-foreground">{folder.provider}</p>
              </div>
              <button
                onClick={() => toggleCollapse(folder.id)}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
              </button>
              <a
                href={folder.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
              <button
                onClick={() => removeFolder(folder.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>

            {/* Embedded iframe — shown by default */}
            {!isCollapsed && (
              <div className="border-t border-border/30 p-2">
                <iframe
                  src={folder.embedUrl}
                  className="w-full rounded-lg"
                  style={{ height: 500, border: "none" }}
                  title={folder.label}
                  allow="autoplay; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                />
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Add folder */}
      {adding ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Shared Folder</p>
            <button onClick={() => setAdding(false)} className="p-1"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Family Documents)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFolder()}
            placeholder="Paste share link (OneDrive, Google Drive, Dropbox…)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addFolder}
            disabled={!newUrl.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Link2 className="w-4 h-4" /> Embed Folder
          </button>
        </motion.div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Shared Folder
        </button>
      )}
    </div>
  );
};

export default SharedFolderEmbed;
