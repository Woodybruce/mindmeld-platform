import { apiInvoke } from "@/lib/api";

export type TaskStatus = "todo" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskSource = "manual" | "butler" | "school" | "holiday";

export interface HouseholdTask {
  id: string;
  householdId: string;
  title: string;
  notes: string | null;
  assigneeUserId: string | null;
  dependentId: string | null;
  dueDate: string | null;
  recurrence: string | null;
  priority: TaskPriority;
  source: TaskSource;
  status: TaskStatus;
  createdAt: string;
}

export type EventCategory = "school" | "holiday" | "household" | "us";

export interface HouseholdEvent {
  id: string;
  householdId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  category: EventCategory;
  dependentId: string | null;
  source: "manual" | "butler" | "outlook";
  createdAt: string;
}

export async function fetchTasks(): Promise<HouseholdTask[]> {
  const { data, error } = await apiInvoke<HouseholdTask[]>("tasks");
  if (error) throw error;
  return data ?? [];
}

export async function createTask(title: string): Promise<HouseholdTask | null> {
  const { data, error } = await apiInvoke<HouseholdTask>("tasks", { body: { title } });
  if (error) throw error;
  return data;
}

export async function completeTask(id: string): Promise<HouseholdTask | null> {
  const { data, error } = await apiInvoke<HouseholdTask>(`tasks/${id}/complete`, { method: "POST" });
  if (error) throw error;
  return data;
}

export async function fetchEvents(from: Date, to: Date): Promise<HouseholdEvent[]> {
  const { data, error } = await apiInvoke<HouseholdEvent[]>("events", {
    query: { from: from.toISOString(), to: to.toISOString() },
  });
  if (error) throw error;
  return data ?? [];
}
