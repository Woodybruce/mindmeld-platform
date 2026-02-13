import { Home, LayoutGrid, Heart, User } from "lucide-react";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "admin", label: "Admin", icon: LayoutGrid },
  { id: "connect", label: "Connect", icon: Heart },
  { id: "profile", label: "Profile", icon: User },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === "home";
          return (
            <button
              key={tab.id}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
                isActive ? "text-us-coral" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "fill-us-coral/20" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
