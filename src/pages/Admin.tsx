import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, Calendar, Bell } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Admin = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 max-w-lg mx-auto relative">
      <header className="sticky top-0 z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3">
          <h1 className="font-body text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Admin
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your shared life, organised</p>
        </div>
      </header>

      <Tabs defaultValue="lists" className="px-4 pt-3 pb-24">
        <TabsList className="w-full bg-slate-200/60 dark:bg-slate-800">
          <TabsTrigger value="lists" className="flex-1 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <ListChecks className="w-4 h-4" /> Lists
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <Calendar className="w-4 h-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex-1 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <Bell className="w-4 h-4" /> Reminders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="mt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
            <ListChecks className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h2 className="font-display text-lg font-semibold text-slate-700 dark:text-slate-200">Shared Lists</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Groceries, to-dos, bucket lists — all in one place.</p>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
            <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h2 className="font-display text-lg font-semibold text-slate-700 dark:text-slate-200">Shared Calendar</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Stay in sync with your partner's schedule.</p>
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="mt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
            <Bell className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h2 className="font-display text-lg font-semibold text-slate-700 dark:text-slate-200">Reminders</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Never forget the important moments.</p>
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Admin;
