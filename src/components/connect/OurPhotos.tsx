import { motion } from "framer-motion";
import { Camera, Plus, ImageIcon } from "lucide-react";

const mockPhotos = [
  { id: "1", caption: "Beach sunset 🌅", date: "2 days ago", placeholder: true },
  { id: "2", caption: "Date night dinner", date: "1 week ago", placeholder: true },
  { id: "3", caption: "Hiking together", date: "2 weeks ago", placeholder: true },
  { id: "4", caption: "Our anniversary", date: "1 month ago", placeholder: true },
  { id: "5", caption: "Cooking together", date: "1 month ago", placeholder: true },
  { id: "6", caption: "Weekend getaway", date: "2 months ago", placeholder: true },
];

const OurPhotos = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Your shared photo memories</p>
      <button className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add Photo
      </button>
    </div>

    <div className="grid grid-cols-3 gap-1.5">
      {mockPhotos.map((photo, i) => (
        <motion.button
          key={photo.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="relative aspect-square rounded-lg bg-secondary overflow-hidden group"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-[10px] text-primary-foreground font-medium truncate">{photo.caption}</p>
          </div>
        </motion.button>
      ))}
    </div>

    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
    >
      <Camera className="w-5 h-5" />
      <span>Upload photos together</span>
    </motion.button>
  </div>
);

export default OurPhotos;
