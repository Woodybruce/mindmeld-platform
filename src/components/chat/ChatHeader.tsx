import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatHeaderProps {
  partnerName: string;
  isOnline?: boolean;
}

const ChatHeader = ({ partnerName, isOnline }: ChatHeaderProps) => {
  const navigate = useNavigate();
  const initial = partnerName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[hsl(var(--us-navy))] text-primary-foreground">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground/80 hover:text-primary-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-9 h-9">
          <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--us-blush))] to-[hsl(var(--us-coral))] text-primary-foreground text-xs font-display">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-body text-sm font-semibold">{partnerName}</h1>
          <p className="text-[10px] text-primary-foreground/60">
            {isOnline ? "online" : "Your partner"}
          </p>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
