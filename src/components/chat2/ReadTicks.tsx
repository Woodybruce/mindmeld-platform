const ReadTicks = ({ read }: { read: boolean }) => (
  <span
    data-testid="read-ticks"
    aria-label={read ? "Read" : "Sent"}
    className={`text-[11px] leading-none font-medium ${read ? "text-sky-300" : "text-primary-foreground/60"}`}
  >
    {read ? "✓✓" : "✓"}
  </span>
);

export default ReadTicks;
