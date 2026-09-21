import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Baby,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import AppHeader from "@/components/AppHeader";
import {
  createDependent,
  createRenewal,
  createSchool,
  createSchoolEvent,
  deleteDependent,
  deleteRenewal,
  deleteSchool,
  fetchDependents,
  fetchRenewals,
  fetchSchoolEvents,
  fetchSchools,
  updateDependent,
  updateRenewal,
  updateSchool,
} from "@/lib/family";
import type {
  Dependent,
  DependentInput,
  Renewal,
  RenewalCategory,
  RenewalInput,
  School,
  SchoolEventKind,
  SchoolInput,
  SchoolStatus,
} from "@/lib/family";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "@/hooks/use-toast";

const STATUS_ORDER: SchoolStatus[] = [
  "researching",
  "shortlisted",
  "applied",
  "offered",
  "accepted",
  "rejected",
];

const STATUS_LABELS: Record<SchoolStatus, string> = {
  researching: "Researching",
  shortlisted: "Shortlisted",
  applied: "Applied",
  offered: "Offered",
  accepted: "Accepted",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<SchoolStatus, string> = {
  researching: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  shortlisted: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  applied: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  offered: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const KIND_LABELS: Record<SchoolEventKind, string> = {
  open_day: "Open day",
  application_deadline: "Deadline",
  term_date: "Term date",
  parents_evening: "Parents' evening",
  permission_slip: "Permission slip",
  other: "Other",
};

const RENEWAL_CATEGORY_EMOJIS: Record<RenewalCategory, string> = {
  passport: "🛂",
  driving_licence: "🪪",
  mot: "🚗",
  insurance: "🛡️",
  tax: "💷",
  subscription: "🔄",
  membership: "🎟️",
  other: "📋",
};

const RENEWAL_CATEGORY_LABELS: Record<RenewalCategory, string> = {
  passport: "Passport",
  driving_licence: "Driving licence",
  mot: "MOT",
  insurance: "Insurance",
  tax: "Tax",
  subscription: "Subscription",
  membership: "Membership",
  other: "Other",
};

function daysUntilDate(date: string): number {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.parse(`${date}T00:00:00Z`) - todayUtc) / 86_400_000);
}

function daysLeftText(days: number): string {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function daysLeftStyle(days: number): string {
  if (days < 7) return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
  if (days < 30) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-secondary text-muted-foreground";
}

const inputClass =
  "flex-1 min-w-0 bg-secondary/60 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30";

function ageFromDob(dob: string): number {
  const birth = new Date(`${dob}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function dependentName(id: string | null, dependents: Dependent[]): string | null {
  return id ? (dependents.find((d) => d.id === id)?.name ?? null) : null;
}

interface DependentFormProps {
  initial?: Dependent;
  onSubmit: (input: DependentInput) => void;
  onCancel: () => void;
  pending: boolean;
}

const DependentForm = ({ initial, onSubmit, onCancel, pending }: DependentFormProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth ?? "");
  const [yearGroup, setYearGroup] = useState(initial?.yearGroup ?? "");

  return (
    <form
      className="rounded-2xl bg-card border border-border px-4 py-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          ...(dateOfBirth ? { dateOfBirth } : {}),
          ...(yearGroup.trim() ? { yearGroup: yearGroup.trim() } : {}),
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Child's name"
        aria-label="Child name"
        className={inputClass + " w-full"}
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          aria-label="Date of birth"
          className={inputClass}
        />
        <input
          value={yearGroup}
          onChange={(e) => setYearGroup(e.target.value)}
          placeholder="Year group (e.g. Year 4)"
          aria-label="Year group"
          className={inputClass}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || pending}
          className="text-sm font-medium bg-primary text-primary-foreground rounded-xl px-4 py-1.5 disabled:opacity-40"
        >
          {initial ? "Save" : "Add child"}
        </button>
      </div>
    </form>
  );
};

interface SchoolFormProps {
  initial?: School;
  onSubmit: (input: SchoolInput) => void;
  onCancel: () => void;
  pending: boolean;
}

const SchoolForm = ({ initial, onSubmit, onCancel, pending }: SchoolFormProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [status, setStatus] = useState<SchoolStatus>(initial?.status ?? "researching");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <form
      className="rounded-2xl bg-card border border-border px-4 py-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          status,
          ...(website.trim() ? { website: website.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="School name"
        aria-label="School name"
        className={inputClass + " w-full"}
      />
      <div className="flex gap-2">
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website (optional)"
          aria-label="School website"
          className={inputClass}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SchoolStatus)}
          aria-label="School status"
          className={inputClass}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        aria-label="School notes"
        rows={2}
        className={inputClass + " w-full resize-none"}
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || pending}
          className="text-sm font-medium bg-primary text-primary-foreground rounded-xl px-4 py-1.5 disabled:opacity-40"
        >
          {initial ? "Save" : "Add school"}
        </button>
      </div>
    </form>
  );
};

interface RenewalFormProps {
  initial?: Renewal;
  dependents: Dependent[];
  onSubmit: (input: RenewalInput) => void;
  onCancel: () => void;
  pending: boolean;
}

const RenewalForm = ({ initial, dependents, onSubmit, onCancel, pending }: RenewalFormProps) => {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [category, setCategory] = useState<RenewalCategory>(initial?.category ?? "other");
  const [renewalDate, setRenewalDate] = useState(initial?.renewalDate ?? "");
  const [dependentId, setDependentId] = useState(initial?.dependentId ?? "");
  const [remindBeforeDays, setRemindBeforeDays] = useState(
    String(initial?.remindBeforeDays ?? 30)
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <form
      className="rounded-2xl bg-card border border-border px-4 py-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim() || !renewalDate) return;
        const days = Number.parseInt(remindBeforeDays, 10);
        onSubmit({
          label: label.trim(),
          category,
          renewalDate,
          ...(dependentId ? { dependentId } : {}),
          ...(Number.isFinite(days) && days >= 0 ? { remindBeforeDays: days } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
      }}
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Woody's passport"
        aria-label="Renewal label"
        className={inputClass + " w-full"}
      />
      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RenewalCategory)}
          aria-label="Renewal category"
          className={inputClass}
        >
          {(Object.keys(RENEWAL_CATEGORY_LABELS) as RenewalCategory[]).map((c) => (
            <option key={c} value={c}>
              {RENEWAL_CATEGORY_EMOJIS[c]} {RENEWAL_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={renewalDate}
          onChange={(e) => setRenewalDate(e.target.value)}
          aria-label="Renewal date"
          className={inputClass}
        />
      </div>
      <div className="flex gap-2">
        {dependents.length > 0 && (
          <select
            value={dependentId}
            onChange={(e) => setDependentId(e.target.value)}
            aria-label="Renewal child"
            className={inputClass}
          >
            <option value="">Whole family</option>
            {dependents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="number"
          min={0}
          max={365}
          value={remindBeforeDays}
          onChange={(e) => setRemindBeforeDays(e.target.value)}
          aria-label="Remind days before"
          placeholder="Remind days before"
          className={inputClass}
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        aria-label="Renewal notes"
        rows={2}
        className={inputClass + " w-full resize-none"}
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!label.trim() || !renewalDate || pending}
          className="text-sm font-medium bg-primary text-primary-foreground rounded-xl px-4 py-1.5 disabled:opacity-40"
        >
          {initial ? "Save" : "Add renewal"}
        </button>
      </div>
    </form>
  );
};

interface SchoolCardProps {
  school: School;
  dependents: Dependent[];
}

const SchoolCard = ({ school, dependents }: SchoolCardProps) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventKind, setEventKind] = useState<SchoolEventKind>("open_day");
  const [eventDependentId, setEventDependentId] = useState("");
  const [eventAutoTask, setEventAutoTask] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ["family", "schools", school.id, "events"],
    queryFn: () => fetchSchoolEvents(school.id),
    enabled: expanded,
  });

  const invalidateSchools = () => {
    queryClient.invalidateQueries({ queryKey: ["family", "schools"] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: SchoolStatus) => updateSchool(school.id, { status }),
    onSuccess: invalidateSchools,
    onError: (err) => {
      toast({ title: "Couldn't update school", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: (input: SchoolInput) => updateSchool(school.id, input),
    onSuccess: () => {
      setEditing(false);
      invalidateSchools();
    },
    onError: (err) => {
      toast({ title: "Couldn't save school", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSchool(school.id),
    onSuccess: invalidateSchools,
    onError: (err) => {
      toast({ title: "Couldn't delete school", description: err.message, variant: "destructive" });
    },
  });

  const eventMutation = useMutation({
    mutationFn: () =>
      createSchoolEvent(school.id, {
        title: eventTitle.trim(),
        date: eventDate,
        kind: eventKind,
        ...(eventDependentId ? { dependentId: eventDependentId } : {}),
        autoTask: eventAutoTask,
      }),
    onSuccess: () => {
      setEventTitle("");
      setEventDate("");
      setEventKind("open_day");
      setEventDependentId("");
      setEventAutoTask(false);
      setShowEventForm(false);
      queryClient.invalidateQueries({ queryKey: ["family", "schools", school.id, "events"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => {
      toast({ title: "Couldn't add event", description: err.message, variant: "destructive" });
    },
  });

  if (editing) {
    return (
      <SchoolForm
        initial={school}
        pending={editMutation.isPending}
        onSubmit={(input) => editMutation.mutate(input)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const events = eventsQuery.data ?? [];

  return (
    <div className="rounded-2xl bg-card border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${school.name}`}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
          <span className="text-sm font-medium text-foreground truncate">{school.name}</span>
          <span
            className={`text-[13px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${STATUS_STYLES[school.status]}`}
          >
            {STATUS_LABELS[school.status]}
          </span>
        </button>
        <button
          onClick={() => setEditing(true)}
          aria-label={`Edit ${school.name}`}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`status-${school.id}`}
              className="text-xs text-muted-foreground shrink-0"
            >
              Status
            </label>
            <select
              id={`status-${school.id}`}
              value={school.status}
              onChange={(e) => statusMutation.mutate(e.target.value as SchoolStatus)}
              disabled={statusMutation.isPending}
              className="bg-secondary/60 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {school.website && (
              <a
                href={school.website}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline truncate"
              >
                Website
              </a>
            )}
            <button
              onClick={() => {
                if (window.confirm(`Remove ${school.name}? Its events will be deleted too.`)) {
                  deleteMutation.mutate();
                }
              }}
              aria-label={`Delete ${school.name}`}
              className="ml-auto text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {school.notes && <p className="text-xs text-muted-foreground">{school.notes}</p>}

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Events
            </h4>
            {eventsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(`${ev.date}T00:00:00`), "d MMM yyyy")}
                    </span>
                    <span className="text-[13px] font-semibold rounded-full px-2 py-0.5 bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
                      {KIND_LABELS[ev.kind]}
                    </span>
                    <span className="text-foreground truncate">
                      {ev.title}
                      {dependentName(ev.dependentId, dependents) && (
                        <span className="text-muted-foreground"> · {dependentName(ev.dependentId, dependents)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {showEventForm ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (eventTitle.trim() && eventDate) eventMutation.mutate();
              }}
            >
              <div className="flex gap-2">
                <input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Event title"
                  aria-label="Event title"
                  className={inputClass}
                />
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  aria-label="Event date"
                  className={inputClass}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={eventKind}
                  onChange={(e) => setEventKind(e.target.value as SchoolEventKind)}
                  aria-label="Event kind"
                  className={inputClass}
                >
                  {(Object.keys(KIND_LABELS) as SchoolEventKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                {dependents.length > 0 && (
                  <select
                    value={eventDependentId}
                    onChange={(e) => setEventDependentId(e.target.value)}
                    aria-label="Event child"
                    className={inputClass}
                  >
                    <option value="">Whole family</option>
                    {dependents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={eventAutoTask}
                  onChange={(e) => setEventAutoTask(e.target.checked)}
                  className="rounded"
                />
                Add to tasks automatically
              </label>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="text-sm text-muted-foreground px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!eventTitle.trim() || !eventDate || eventMutation.isPending}
                  className="text-sm font-medium bg-primary text-primary-foreground rounded-xl px-4 py-1.5 disabled:opacity-40"
                >
                  Add event
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowEventForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary"
            >
              <Plus className="w-3.5 h-3.5" /> Add event
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FamilyPage = () => {
  usePageTitle("Family");
  const queryClient = useQueryClient();
  const [showChildForm, setShowChildForm] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [editingRenewalId, setEditingRenewalId] = useState<string | null>(null);

  const dependentsQuery = useQuery({
    queryKey: ["family", "dependents"],
    queryFn: fetchDependents,
  });

  const schoolsQuery = useQuery({
    queryKey: ["family", "schools"],
    queryFn: fetchSchools,
  });

  const renewalsQuery = useQuery({
    queryKey: ["family", "renewals"],
    queryFn: fetchRenewals,
  });

  const invalidateDependents = () => {
    queryClient.invalidateQueries({ queryKey: ["family", "dependents"] });
  };

  const addChildMutation = useMutation({
    mutationFn: createDependent,
    onSuccess: () => {
      setShowChildForm(false);
      invalidateDependents();
    },
    onError: (err) => {
      toast({ title: "Couldn't add child", description: err.message, variant: "destructive" });
    },
  });

  const editChildMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DependentInput }) =>
      updateDependent(id, input),
    onSuccess: () => {
      setEditingChildId(null);
      invalidateDependents();
    },
    onError: (err) => {
      toast({ title: "Couldn't save child", description: err.message, variant: "destructive" });
    },
  });

  const deleteChildMutation = useMutation({
    mutationFn: deleteDependent,
    onSuccess: invalidateDependents,
    onError: (err) => {
      toast({ title: "Couldn't remove child", description: err.message, variant: "destructive" });
    },
  });

  const addSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      setShowSchoolForm(false);
      queryClient.invalidateQueries({ queryKey: ["family", "schools"] });
    },
    onError: (err) => {
      toast({ title: "Couldn't add school", description: err.message, variant: "destructive" });
    },
  });

  const invalidateRenewals = () => {
    queryClient.invalidateQueries({ queryKey: ["family", "renewals"] });
  };

  const addRenewalMutation = useMutation({
    mutationFn: createRenewal,
    onSuccess: () => {
      setShowRenewalForm(false);
      invalidateRenewals();
    },
    onError: (err) => {
      toast({ title: "Couldn't add renewal", description: err.message, variant: "destructive" });
    },
  });

  const editRenewalMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RenewalInput }) => updateRenewal(id, input),
    onSuccess: () => {
      setEditingRenewalId(null);
      invalidateRenewals();
    },
    onError: (err) => {
      toast({ title: "Couldn't save renewal", description: err.message, variant: "destructive" });
    },
  });

  const deleteRenewalMutation = useMutation({
    mutationFn: deleteRenewal,
    onSuccess: invalidateRenewals,
    onError: (err) => {
      toast({ title: "Couldn't delete renewal", description: err.message, variant: "destructive" });
    },
  });

  const dependents = dependentsQuery.data ?? [];
  const schools = schoolsQuery.data ?? [];
  const renewals = renewalsQuery.data ?? [];
  const schoolsByStatus = STATUS_ORDER.map((status) => ({
    status,
    schools: schools.filter((s) => s.status === status),
  })).filter((group) => group.schools.length > 0);

  return (
    <AppShell>
      <AppHeader subtitle="Children & schools" />

      <div className="px-4 py-4 space-y-6">
        <section aria-labelledby="family-children-heading">
          <div className="flex items-center gap-2 mb-3">
            <Baby className="w-4 h-4 text-primary" />
            <h2
              id="family-children-heading"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Children
            </h2>
          </div>
          {dependentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : dependentsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Couldn't load children.</p>
          ) : (
            <ul className="space-y-2">
              {dependents.map((child) =>
                editingChildId === child.id ? (
                  <li key={child.id}>
                    <DependentForm
                      initial={child}
                      pending={editChildMutation.isPending}
                      onSubmit={(input) => editChildMutation.mutate({ id: child.id, input })}
                      onCancel={() => setEditingChildId(null)}
                    />
                  </li>
                ) : (
                  <li
                    key={child.id}
                    className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{child.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[
                          child.dateOfBirth ? `Age ${ageFromDob(child.dateOfBirth)}` : null,
                          child.yearGroup,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No details yet"}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingChildId(child.id)}
                      aria-label={`Edit ${child.name}`}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${child.name}?`)) {
                          deleteChildMutation.mutate(child.id);
                        }
                      }}
                      aria-label={`Delete ${child.name}`}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}
          <div className="mt-2">
            {showChildForm ? (
              <DependentForm
                pending={addChildMutation.isPending}
                onSubmit={(input) => addChildMutation.mutate(input)}
                onCancel={() => setShowChildForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowChildForm(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <Plus className="w-3.5 h-3.5" /> Add child
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="family-schools-heading">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h2
              id="family-schools-heading"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Schools
            </h2>
          </div>
          {schoolsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : schoolsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Couldn't load schools.</p>
          ) : schools.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No schools yet — add one to start tracking applications.
            </p>
          ) : (
            <div className="space-y-4">
              {schoolsByStatus.map((group) => (
                <div key={group.status}>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                    {STATUS_LABELS[group.status]} · {group.schools.length}
                  </h3>
                  <div className="space-y-2">
                    {group.schools.map((school) => (
                      <SchoolCard key={school.id} school={school} dependents={dependents} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2">
            {showSchoolForm ? (
              <SchoolForm
                pending={addSchoolMutation.isPending}
                onSubmit={(input) => addSchoolMutation.mutate(input)}
                onCancel={() => setShowSchoolForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowSchoolForm(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <Plus className="w-3.5 h-3.5" /> Add school
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="family-renewals-heading">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h2
              id="family-renewals-heading"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Renewals & admin
            </h2>
          </div>
          {renewalsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : renewalsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Couldn't load renewals.</p>
          ) : renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No renewals yet — add passports, MOTs, insurance and the butler will nudge you.
            </p>
          ) : (
            <ul className="space-y-2">
              {renewals.map((renewal) => {
                const days = daysUntilDate(renewal.renewalDate);
                return editingRenewalId === renewal.id ? (
                  <li key={renewal.id}>
                    <RenewalForm
                      initial={renewal}
                      dependents={dependents}
                      pending={editRenewalMutation.isPending}
                      onSubmit={(input) => editRenewalMutation.mutate({ id: renewal.id, input })}
                      onCancel={() => setEditingRenewalId(null)}
                    />
                  </li>
                ) : (
                  <li
                    key={renewal.id}
                    className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3"
                  >
                    <span className="text-lg shrink-0" aria-hidden="true">
                      {RENEWAL_CATEGORY_EMOJIS[renewal.category]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{renewal.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(`${renewal.renewalDate}T00:00:00`), "d MMM yyyy")}
                        {dependentName(renewal.dependentId, dependents)
                          ? ` · ${dependentName(renewal.dependentId, dependents)}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[13px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap shrink-0 ${daysLeftStyle(days)}`}
                    >
                      {daysLeftText(days)}
                    </span>
                    <button
                      onClick={() => setEditingRenewalId(renewal.id)}
                      aria-label={`Edit ${renewal.label}`}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${renewal.label}?`)) {
                          deleteRenewalMutation.mutate(renewal.id);
                        }
                      }}
                      aria-label={`Delete ${renewal.label}`}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-2">
            {showRenewalForm ? (
              <RenewalForm
                dependents={dependents}
                pending={addRenewalMutation.isPending}
                onSubmit={(input) => addRenewalMutation.mutate(input)}
                onCancel={() => setShowRenewalForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowRenewalForm(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <Plus className="w-3.5 h-3.5" /> Add renewal
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="family-more-heading">
          <h2
            id="family-more-heading"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3"
          >
            More
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/tasks"
              className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3"
            >
              <ListChecks className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">Tasks</span>
            </Link>
            <Link
              to="/diary"
              className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3"
            >
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">Diary</span>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default FamilyPage;
