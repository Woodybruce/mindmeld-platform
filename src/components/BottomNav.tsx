import { Home, Heart, MessageCircle, Shield } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const tabs = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "us", label: "Us", icon: Heart, path: "/us" },
  { id: "chat", label: "Chat", icon: MessageCircle, path: "/chat" },
  { id: "admin", label: "Admin", icon: Shield, path: "/us?tab=admin" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useUnreadMessages();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === "admin"
            ? location.pathname === "/us" && location.search.includes("tab=admin")
            : location.pathname === tab.path;
          const showBadge = tab.id === "chat" && unreadCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all active:scale-95 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <tab.icon className={`w-5 h-5 transition-transform ${isActive ? "fill-primary/20 scale-110" : ""}`} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-primary -mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
