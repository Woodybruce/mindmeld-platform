import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface PollComposerProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { question: string; options: string[] }) => void;
}

const PollComposer = ({ open, onClose, onSend }: PollComposerProps) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const canSend = question.trim() && options.filter((o) => o.trim()).length >= 2;

  const handleSend = () => {
    if (!canSend) return;
    onSend({
      question: question.trim(),
      options: options.filter((o) => o.trim()),
    });
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  };

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
        className="w-full max-w-lg bg-card rounded-t-3xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground font-body">Create Poll</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          className="w-full bg-secondary/60 border border-border/30 rounded-2xl px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20"
        />

        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-border/50 flex-shrink-0" />
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 bg-secondary/60 border border-border/30 rounded-xl px-3 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/20"
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 6 && (
          <button
            onClick={addOption}
            className="flex items-center gap-2 text-[13px] text-primary font-medium hover:text-primary/80"
          >
            <Plus className="w-4 h-4" /> Add option
          </button>
        )}

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full py-3.5 rounded-2xl bg-[hsl(var(--us-sage))] text-white font-semibold text-[14px] disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          Send Poll
        </button>
      </motion.div>
    </motion.div>
  );
};

export default PollComposer;
