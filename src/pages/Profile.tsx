import { Settings, Heart, LinkIcon, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";

const Profile = () => {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Profile</h1>
          <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 space-y-6">
        {/* Profile card */}
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Avatar className="w-20 h-20 mx-auto mb-3">
            <AvatarFallback className="bg-gradient-to-br from-us-coral to-us-terracotta text-primary-foreground text-2xl font-display">
              U
            </AvatarFallback>
          </Avatar>
          <h2 className="font-display text-xl font-bold text-foreground">Your Name</h2>
          <p className="text-sm text-muted-foreground mt-1">Partner not linked yet</p>
        </div>

        {/* Relationship stats */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-us-coral" /> Relationship Stats
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">0</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Days Together</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">0</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Quizzes Done</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">0</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Games Played</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button className="w-full rounded-xl border border-border bg-card p-4 text-left flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            <LinkIcon className="w-5 h-5 text-us-coral" />
            <div>
              <span className="font-medium text-foreground text-sm">Link Partner</span>
              <p className="text-xs text-muted-foreground">Invite your partner to join</p>
            </div>
          </button>
          <button className="w-full rounded-xl border border-border bg-card p-4 text-left flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            <LogOut className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground text-sm">Sign Out</span>
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
