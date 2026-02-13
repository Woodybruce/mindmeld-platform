import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, Calendar, Bell, FolderOpen, ExternalLink, FileText, Image, File, Upload } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

const mockFiles = [
  { name: "Holiday Itinerary.pdf", type: "pdf", updated: "2 days ago" },
  { name: "Wedding Mood Board", type: "folder", updated: "5 days ago" },
  { name: "Apartment Shortlist.docx", type: "doc", updated: "1 week ago" },
  { name: "Us — Summer 2025", type: "image", updated: "2 weeks ago" },
  { name: "Budget Tracker.xlsx", type: "doc", updated: "3 weeks ago" },
];

const fileIcon = (type: string) => {
  switch (type) {
    case "pdf": return <FileText className="w-5 h-5 text-destructive" />;
    case "image": return <Image className="w-5 h-5 text-us-gold" />;
    case "folder": return <FolderOpen className="w-5 h-5 text-us-sage" />;
    default: return <File className="w-5 h-5 text-primary" />;
  }
};

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
          <TabsTrigger value="lists" className="flex-1 gap-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <ListChecks className="w-4 h-4" /> Lists
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 gap-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <Calendar className="w-4 h-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex-1 gap-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <Bell className="w-4 h-4" /> Reminders
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex-1 gap-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <FolderOpen className="w-4 h-4" /> Files
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

        <TabsContent value="resources" className="mt-4 space-y-3">
          {/* Connect cloud storage CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-body text-sm font-semibold text-slate-700 dark:text-slate-200">Shared Folder</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Link OneDrive, Dropbox, or Google Drive
                </p>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Connect
              </button>
            </div>
          </motion.div>

          {/* File list */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recent Files</span>
              <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
            </div>
            {mockFiles.map((file, i) => (
              <motion.button
                key={file.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.06 }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0 text-left"
              >
                {fileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{file.updated}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Admin;
