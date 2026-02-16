import { Bell, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usLogo from "@/assets/us-logo.png";

interface AppHeaderProps {
  subtitle?: string;
}

const AppHeader = ({ subtitle }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={usLogo} alt="Us logo" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              US
            </h1>
            {subtitle && <p className="text-xs text-muted-foreground -mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-us-coral" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
