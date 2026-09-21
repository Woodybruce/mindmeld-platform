import { apiInvoke } from "@/lib/api";

export type SchoolStatus =
  | "researching"
  | "shortlisted"
  | "applied"
  | "offered"
  | "accepted"
  | "rejected";

export type SchoolEventKind =
  | "open_day"
  | "application_deadline"
  | "term_date"
  | "parents_evening"
  | "permission_slip"
  | "other";

export interface Dependent {
  id: string;
  householdId: string;
  name: string;
  dateOfBirth: string | null;
  yearGroup: string | null;
  schoolId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface School {
  id: string;
  householdId: string;
  name: string;
  address: string | null;
  website: string | null;
  status: SchoolStatus;
  notes: string | null;
  createdAt: string;
}

export interface SchoolEvent {
  id: string;
  schoolId: string;
  dependentId: string | null;
  title: string;
  date: string;
  kind: SchoolEventKind;
  autoTask: boolean;
  createdAt: string;
}

export interface DependentInput {
  name: string;
  dateOfBirth?: string;
  yearGroup?: string;
  schoolId?: string;
  notes?: string;
}

export interface SchoolInput {
  name: string;
  address?: string;
  website?: string;
  status?: SchoolStatus;
  notes?: string;
}

export interface SchoolEventInput {
  title: string;
  date: string;
  kind: SchoolEventKind;
  dependentId?: string;
  autoTask?: boolean;
}

export async function fetchDependents(): Promise<Dependent[]> {
  const { data, error } = await apiInvoke<Dependent[]>("dependents");
  if (error) throw error;
  return data ?? [];
}

export async function createDependent(input: DependentInput): Promise<Dependent | null> {
  const { data, error } = await apiInvoke<Dependent>("dependents", { body: input });
  if (error) throw error;
  return data;
}

export async function updateDependent(
  id: string,
  patch: Partial<DependentInput>
): Promise<Dependent | null> {
  const { data, error } = await apiInvoke<Dependent>(`dependents/${id}`, {
    method: "PATCH",
    body: patch,
  });
  if (error) throw error;
  return data;
}

export async function deleteDependent(id: string): Promise<void> {
  const { error } = await apiInvoke(`dependents/${id}`, { method: "DELETE" });
  if (error) throw error;
}

export async function fetchSchools(): Promise<School[]> {
  const { data, error } = await apiInvoke<School[]>("schools");
  if (error) throw error;
  return data ?? [];
}

export async function createSchool(input: SchoolInput): Promise<School | null> {
  const { data, error } = await apiInvoke<School>("schools", { body: input });
  if (error) throw error;
  return data;
}

export async function updateSchool(
  id: string,
  patch: Partial<SchoolInput>
): Promise<School | null> {
  const { data, error } = await apiInvoke<School>(`schools/${id}`, {
    method: "PATCH",
    body: patch,
  });
  if (error) throw error;
  return data;
}

export async function deleteSchool(id: string): Promise<void> {
  const { error } = await apiInvoke(`schools/${id}`, { method: "DELETE" });
  if (error) throw error;
}

export async function fetchSchoolEvents(schoolId: string): Promise<SchoolEvent[]> {
  const { data, error } = await apiInvoke<SchoolEvent[]>(`schools/${schoolId}/events`);
  if (error) throw error;
  return data ?? [];
}

export async function createSchoolEvent(
  schoolId: string,
  input: SchoolEventInput
): Promise<SchoolEvent | null> {
  const { data, error } = await apiInvoke<SchoolEvent>(`schools/${schoolId}/events`, {
    body: input,
  });
  if (error) throw error;
  return data;
}
