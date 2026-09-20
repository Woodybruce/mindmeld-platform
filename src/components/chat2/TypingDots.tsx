const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-0.5" aria-label="Butler is typing">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

export default TypingDots;
