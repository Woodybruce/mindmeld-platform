import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => (
  <div className="min-h-screen bg-background max-w-lg mx-auto relative">
    <main className="pb-24">{children}</main>
    <BottomNav />
  </div>
);

export default AppShell;
