import { useState, useEffect } from "react";
import { Link2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChatLink {
  id: string;
  url: string;
  sender: string;
  time: string;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const extractDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
};

const RecentChatLinksWidget = () => {
  const { user, profile } = useAuth();
  const [links, setLinks] = useState<ChatLink[]>([]);
  const partnerId = profile?.partner_id;

  useEffect(() => {
    if (!user || !partnerId) return;

    const fetchLinks = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!data) return;

      const extracted: ChatLink[] = [];
      for (const msg of data) {
        const urls = msg.content.match(URL_REGEX);
        if (urls) {
          for (const url of urls) {
            extracted.push({
              id: `${msg.id}-${url}`,
              url,
              sender: msg.sender_id === user.id ? "You" : profile?.username || "Partner",
              time: new Date(msg.created_at).toLocaleDateString("default", { day: "numeric", month: "short" }),
            });
          }
        }
        if (extracted.length >= 5) break;
      }
      setLinks(extracted.slice(0, 5));
    };

    fetchLinks();
  }, [user, partnerId]);

  if (links.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <Link2 className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">Recent Chat Links</h3>
      </div>
      <div className="divide-y divide-border/40">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{extractDomain(link.url)}</p>
              <p className="text-[10px] text-muted-foreground">{link.sender} · {link.time}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default RecentChatLinksWidget;
