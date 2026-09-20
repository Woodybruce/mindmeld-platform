const DayDivider = ({ label }: { label: string }) => (
  <div className="flex justify-center my-3">
    <span className="text-[13px] font-medium text-muted-foreground bg-secondary/80 backdrop-blur-md px-3.5 py-1 rounded-full">
      {label}
    </span>
  </div>
);

export default DayDivider;
