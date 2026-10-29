import type { Bag, Resource } from "./engine";
export const HOUR = 3600000;
export interface GatherJob {
  id: string;
  activityId: string;
  resource: Resource;
  total: number;
  delivered: number;
  start: number;
  end: number;
  duration: number;
  rule: number;
  cancelled?: boolean;
}
export interface ConstructionJob {
  id: string;
  building: string;
  start: number;
  end: number;
  cost: Bag;
  rule: number;
  done: boolean;
}
export function fraction(job: { start: number; end: number }, clock: number) {
  return Math.min(1, Math.max(0, (clock - job.start) / (job.end - job.start)));
}
export function durationLabel(ms: number) {
  if (ms <= 0) return "Complete";
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h${minutes % 60 ? " " + (minutes % 60) + "m" : ""}`;
}
