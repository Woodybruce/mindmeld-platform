import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Plus, Link2, Trash2, MoreHorizontal } from "lucide-react";

interface SharedLink {
  id: string;
  title: string;
  url: string;
  category: string;
  addedBy: string;
  addedAt: string;
}

const LinksAndMedia = () => {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  const addLink = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    setLinks([
      { id: Date.now().toString(), title: newTitle.trim(), url: newUrl.trim(), category: "General", addedBy: "You", addedAt: "Just now" },
      ...links,
    ]);
    setNewTitle("");
    setNewUrl("");
    setShowAdd(false);
  };

  const removeLink = (id: string) => setLinks(links.filter((l) => l.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Saved links and resources</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Link
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2 overflow-hidden"
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Link title…"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
              placeholder="https://…"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={addLink} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              Save
            </button>
          </div>
        </motion.div>
      )}

      {links.length === 0 && !showAdd && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Link2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-base font-semibold text-foreground">No links yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Save restaurants, recipes, holidays & more</p>
        </div>
      )}

      {links.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {links.map((link, i) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 group"
            >
              <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[13px] text-us-gold font-medium">{link.category}</span>
                  <span className="text-[13px] text-muted-foreground">· {link.addedBy} · {link.addedAt}</span>
                </div>
              </div>
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setOpenActionMenu(openActionMenu === link.id ? null : link.id)}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
                {openActionMenu === link.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenActionMenu(null)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /> Open link
                      </a>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => { removeLink(link.id); setOpenActionMenu(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinksAndMedia;
