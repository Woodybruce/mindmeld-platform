import { ArrowLeft, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Chat = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-to-br from-us-blush to-us-coral text-primary-foreground text-xs font-display">
              P
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-body text-sm font-semibold text-foreground">Partner</h1>
            <p className="text-[10px] text-muted-foreground">Online</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No messages yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Say something lovely 💕</p>
        </div>
      </main>

      <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 p-3">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-us-coral/30"
          />
          <button className="w-10 h-10 rounded-full bg-gradient-to-br from-us-coral to-us-terracotta flex items-center justify-center text-primary-foreground">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
