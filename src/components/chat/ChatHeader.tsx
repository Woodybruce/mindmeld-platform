import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ChatHeaderProps {
  partnerName: string;
  isOnline?: boolean;
  partnerPhone?: string | null;
  onStartCall?: (type: "audio" | "video") => void;
}

const ChatHeader = ({ partnerName, isOnline, partnerPhone, onStartCall }: ChatHeaderProps) => {
  const navigate = useNavigate();
  const initial = partnerName.charAt(0).toUpperCase();

  const handleCall = (type: "audio" | "video") => {
    if (isOnline) {
      // Partner is on the chat page — use WebRTC
      onStartCall?.(type);
    } else if (partnerPhone) {
      // Partner offline — fallback to native call
      if (type === "video") {
        // Try FaceTime on iOS, otherwise tel:
        window.open(`facetime:${partnerPhone}`, "_self");
      } else {
        window.open(`tel:${partnerPhone}`, "_self");
      }
    } else {
      toast.error("Partner is offline. Add their phone number in Profile for call fallback.");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[hsl(var(--us-navy))] text-primary-foreground shadow-lg">
      <div className="flex items-center gap-2 px-2 py-2 max-w-lg mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground/80 hover:text-primary-foreground transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--us-blush))] to-[hsl(var(--us-coral))] text-primary-foreground text-sm font-display font-semibold">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="font-body text-[15px] font-semibold truncate">{partnerName}</h1>
          <p className="text-[11px] text-primary-foreground/50 font-body flex items-center gap-1.5">
            {isOnline && (
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--us-sage))] inline-block" />
            )}
            {isOnline ? "online" : "offline"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCall("video")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Video className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => handleCall("audio")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Phone className="w-[17px] h-[17px]" />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground/70 hover:text-primary-foreground transition-colors">
            <MoreVertical className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
