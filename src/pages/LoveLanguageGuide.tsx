import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Heart,
  Lightbulb,
  BookOpen,
  Quote,
  Sparkles,
  FlaskConical,
  Check,
} from "lucide-react";
import { loveLanguageIdeas } from "@/data/loveLanguageData";
import type { LoveLanguageIdea } from "@/data/loveLanguageData";

const LoveLanguageGuide = () => {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>("what");
  const [triedIdeas, setTriedIdeas] = useState<Record<string, boolean>>({});

  const lang = loveLanguageIdeas[activeIdx];

  const toggleSection = (id: string) =>
    setExpandedSection((prev) => (prev === id ? null : id));

  const toggleTried = (key: string) =>
    setTriedIdeas((prev) => ({ ...prev, [key]: !prev[key] }));

  const triedCount = lang.everydayIdeas.filter(
    (_, i) => triedIdeas[`${lang.id}-${i}`]
  ).length;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">
              Love Language Ideas
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Understand how you both give and receive love
            </p>
          </div>
        </div>
      </header>

      {/* Language tabs */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {loveLanguageIdeas.map((l, i) => (
            <button
              key={l.id}
              onClick={() => {
                setActiveIdx(i);
                setExpandedSection("what");
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                i === activeIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{l.emoji}</span>
              <span className="whitespace-nowrap">{l.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lang.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-24 space-y-3"
        >
          {/* Hero card */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary p-5 border border-border/30">
            <span className="text-4xl">{lang.emoji}</span>
            <h2 className="font-display text-xl font-bold text-foreground mt-2">
              {lang.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {lang.whatItMeans}
            </p>
          </div>

          {/* Example */}
          <SectionCard
            icon={<Lightbulb className="w-4 h-4" />}
            title="Example"
            expanded={expandedSection === "example"}
            onToggle={() => toggleSection("example")}
          >
            <p className="text-sm text-foreground leading-relaxed">{lang.example}</p>
            <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs font-semibold text-primary mb-1">💡 Insight</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{lang.insight}</p>
            </div>
          </SectionCard>

          {/* Experience Stories */}
          <SectionCard
            icon={<Quote className="w-4 h-4" />}
            title="Real Stories"
            expanded={expandedSection === "stories"}
            onToggle={() => toggleSection("stories")}
          >
            {lang.experienceStories.map((story, i) => (
              <div
                key={i}
                className="rounded-lg bg-secondary/50 p-3.5 border-l-2 border-primary/40"
              >
                <p className="text-sm text-foreground/90 leading-relaxed italic">
                  "{story}"
                </p>
              </div>
            ))}
          </SectionCard>

          {/* Pro Tip */}
          <div className="rounded-xl border border-border/50 bg-card p-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary mb-0.5">Pro Tip</p>
              <p className="text-sm text-foreground leading-relaxed">{lang.proTip}</p>
            </div>
          </div>

          {/* Everyday Ideas — interactive checklist */}
          <SectionCard
            icon={<Heart className="w-4 h-4" />}
            title={`Everyday Ideas (${triedCount}/${lang.everydayIdeas.length} tried)`}
            expanded={expandedSection === "ideas"}
            onToggle={() => toggleSection("ideas")}
            defaultOpen
          >
            <div className="space-y-1.5">
              {lang.everydayIdeas.map((idea, i) => {
                const key = `${lang.id}-${i}`;
                const tried = !!triedIdeas[key];
                return (
                  <button
                    key={i}
                    onClick={() => toggleTried(key)}
                    className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                      tried ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                        tried
                          ? "bg-primary text-primary-foreground"
                          : "border border-border"
                      }`}
                      style={{ width: 18, height: 18 }}
                    >
                      {tried && <Check className="w-3 h-3" />}
                    </div>
                    <span
                      className={`text-sm ${
                        tried
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {idea}
                    </span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Research */}
          <SectionCard
            icon={<FlaskConical className="w-4 h-4" />}
            title="Research Insight"
            expanded={expandedSection === "research"}
            onToggle={() => toggleSection("research")}
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang.researchInsight}
            </p>
          </SectionCard>

          {/* Nav buttons */}
          <div className="flex gap-3 pt-2">
            {activeIdx > 0 && (
              <button
                onClick={() => {
                  setActiveIdx((p) => p - 1);
                  setExpandedSection("what");
                }}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {loveLanguageIdeas[activeIdx - 1].emoji}{" "}
                {loveLanguageIdeas[activeIdx - 1].title}
              </button>
            )}
            {activeIdx < loveLanguageIdeas.length - 1 && (
              <button
                onClick={() => {
                  setActiveIdx((p) => p + 1);
                  setExpandedSection("what");
                }}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {loveLanguageIdeas[activeIdx + 1].emoji}{" "}
                {loveLanguageIdeas[activeIdx + 1].title}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* Collapsible section card */
interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const SectionCard = ({
  icon,
  title,
  expanded,
  onToggle,
  children,
}: SectionCardProps) => (
  <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
    >
      <span className="text-primary">{icon}</span>
      <span className="flex-1 text-sm font-semibold text-foreground">
        {title}
      </span>
      <ChevronRight
        className={`w-4 h-4 text-muted-foreground transition-transform ${
          expanded ? "rotate-90" : ""
        }`}
      />
    </button>
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 space-y-3">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default LoveLanguageGuide;
