import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 80;

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const delta = Math.max(0, e.touches[0].clientY - startY.current);
    // Dampen the pull
    setPullDistance(Math.min(delta * 0.4, 120));
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      haptics.medium();
      try { await onRefresh(); } catch {}
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: refreshing ? 48 : pullDistance }}
        >
          <motion.div
            animate={{ rotate: refreshing ? 360 : progress * 180 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0 }}
          >
            <RefreshCw className={`w-5 h-5 ${progress >= 1 || refreshing ? "text-primary" : "text-muted-foreground"}`} />
          </motion.div>
        </div>
      )}
      {children}
    </div>
  );
};

export default PullToRefresh;
