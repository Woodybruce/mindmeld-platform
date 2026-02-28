import { X } from "lucide-react";
import { motion } from "framer-motion";

interface StickerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sticker: string) => void;
}

const STICKER_PACKS = [
  {
    name: "Love",
    stickers: ["❤️", "💕", "💖", "💗", "💘", "💝", "😍", "🥰", "😘", "💋", "💑", "👩‍❤️‍👨", "💏", "🫶", "❤️‍🔥", "💌"],
  },
  {
    name: "Reactions",
    stickers: ["😂", "🤣", "😭", "🥺", "😱", "🤯", "🥳", "🤩", "😏", "🙈", "🙉", "🙊", "👀", "🫣", "😇", "🤭"],
  },
  {
    name: "Vibes",
    stickers: ["🔥", "✨", "🌈", "🦋", "🌸", "🌺", "🍑", "🍒", "🥂", "🎉", "💃", "🕺", "🎵", "🌙", "⭐", "🫧"],
  },
  {
    name: "Gestures",
    stickers: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🫰", "👋", "💪", "🫡", "🤗", "🤔", "😴", "😤", "🥱"],
  },
];

const StickerPicker = ({ open, onClose, onSelect }: StickerPickerProps) => {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-card rounded-t-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="text-[15px] font-semibold text-foreground font-body">Stickers</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-5 pb-5 space-y-4">
          {STICKER_PACKS.map((pack) => (
            <div key={pack.name}>
              <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{pack.name}</p>
              <div className="grid grid-cols-8 gap-1">
                {pack.stickers.map((sticker, i) => (
                  <button
                    key={i}
                    onClick={() => { onSelect(sticker); onClose(); }}
                    className="aspect-square rounded-xl flex items-center justify-center text-2xl hover:bg-secondary/80 active:scale-90 transition-all"
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StickerPicker;
