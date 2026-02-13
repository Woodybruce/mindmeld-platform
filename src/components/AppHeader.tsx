import { Bell, Settings, Heart } from "lucide-react";

interface AppHeaderProps {
  subtitle?: string;
}

const AppHeader = ({ subtitle }: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-us-coral to-us-terracotta flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              US
            </h1>
            {subtitle && <p className="text-[10px] text-muted-foreground -mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-us-coral" />
          </button>
          <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
