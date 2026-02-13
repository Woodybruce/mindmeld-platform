import { motion } from "framer-motion";
import { Calendar, Plus, MapPin, Clock } from "lucide-react";

const mockEvents = [
  { id: "1", title: "Date Night", date: "Fri 14 Feb", time: "7:30 PM", location: "Chez Marcel", emoji: "🍷" },
  { id: "2", title: "Weekend Getaway", date: "Sat 22 Feb", time: "All day", location: "Cotswolds", emoji: "🏡" },
  { id: "3", title: "Partner's Birthday", date: "Sun 9 Mar", time: "All day", location: "Home", emoji: "🎂" },
  { id: "4", title: "Anniversary", date: "Tue 15 Apr", time: "7:00 PM", location: "TBD", emoji: "❤️" },
];

const OurEvents = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Upcoming moments together</p>
      <button className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add Event
      </button>
    </div>

    {mockEvents.map((event, i) => (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="rounded-xl border border-border/50 bg-card p-4 flex items-start gap-3"
      >
        <span className="text-2xl">{event.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{event.title}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="w-3 h-3" /> {event.date}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" /> {event.time}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
            <MapPin className="w-3 h-3" /> {event.location}
          </span>
        </div>
      </motion.div>
    ))}
  </div>
);

export default OurEvents;
