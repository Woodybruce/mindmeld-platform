import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Gamepad2, Camera, ChevronRight,
} from "lucide-react";

const links = [
  { label: "Games", icon: Gamepad2, tab: "games", gradient: "from-us-sage to-emerald-500" },
  { label: "Photos", icon: Camera, tab: "photos", gradient: "from-us-blush to-pink-400" },
];

const QuickLinks = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-display text-base font-semibold text-foreground">More in Us</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Quick access to all your shared sections</p>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        {links.map((link, i) => (
          <button
            key={link.tab}
            onClick={() => navigate(`/us?tab=${link.tab}`)}
            className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 hover:bg-secondary py-3 px-2 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center text-primary-foreground`}>
              <link.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-foreground">{link.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default QuickLinks;
