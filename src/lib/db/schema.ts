import Dexie, { Table } from "dexie";

export type SyncState = "local" | "pending" | "synced";

export interface UserRow {
  id: string;
  name: string;
  email?: string;
  cosmoLinked?: boolean;
  createdAt: number;
}

export interface TaskRow {
  id: string;
  userId: string;
  text: string;
  due?: string;
  chipLabel?: string;
  chipCls?: string;
  focus: boolean;
  done: boolean;
  urgent?: boolean;
  areaId?: string;
  createdAt: number;
  updatedAt: number;
  section?: string;
  syncState: SyncState;
}

export interface NoteRow {
  id: string;
  userId: string;
  title: string;
  body: string;
  tag?: string;
  pinned: boolean;
  serif?: boolean;
  time?: string;
  createdAt: number;
  updatedAt: number;
  syncState: SyncState;
}

export interface HabitRow {
  id: string;
  userId: string;
  name: string;
  icon: string;
  cadence: "daily" | "weekly";
  createdAt: number;
}

export interface HabitLogRow {
  id: string;
  habitId: string;
  date: string;
  value: 0 | 1 | 2 | 3;
}

export interface EventRow {
  id: string;
  userId: string;
  source: "local" | "ics" | "google";
  externalId?: string;
  title: string;
  sub?: string;
  start: number;
  end: number;
  attendees: string[];
  color?: string;
  createdAt: number;
}

export type CaptureKind = "text" | "photo" | "voice" | "file" | "link";
export interface CaptureRow {
  id: string;
  userId: string;
  kind: CaptureKind;
  body?: string;
  blobRef?: string;
  ocrText?: string;
  transcript?: string;
  tags: string[];
  createdAt: number;
  processed: boolean;
}

export interface TagRow {
  id: string;
  userId: string;
  name: string;
  color?: string;
}

export interface AreaRow {
  id: string;
  userId: string;
  name: string;
  color: string;
  cls: string;
}

export interface SettingRow {
  key: string;
  value: any;
}

export interface SyncQueueRow {
  id: string;
  table: string;
  recordId: string;
  op: "insert" | "update" | "delete";
  payload: any;
  attempts: number;
  createdAt: number;
}

export interface BlobRow {
  id: string;
  mime: string;
  blob: Blob;
  createdAt: number;
}

export interface AgentRunRow {
  id: string;
  userId: string;
  workflowId: string;
  prompt: string;
  status: "running" | "completed" | "failed" | "unknown";
  resultText?: string;
  costUSD?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CosmoProfileRow {
  id: string;
  userId: string;
  externalId: string;
  name?: string;
  email?: string;
  raw: any;
  fetchedAt: number;
}

export interface CosmoContentRow {
  id: string;
  userId: string;
  externalId: string;
  title?: string;
  body?: string;
  url?: string;
  createdAt: number;
  fetchedAt: number;
}

export interface MCPCatalogRow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  raw: any;
  fetchedAt: number;
}

export interface EmailAccountRow {
  id: string;
  userId: string;
  source: "gmail" | "imap";
  address: string;
  displayName?: string;
  addedAt: number;
}

export interface EmailRow {
  id: string;
  userId: string;
  accountId: string;
  source: "gmail" | "imap";
  externalId: string;
  threadId?: string;
  from: string;
  fromEmail?: string;
  subject: string;
  snippet?: string;
  receivedAt: number;
  labels: string[];
  unread: boolean;
  starred: boolean;
  summary?: string;
  promoted?: "task" | "note" | null;
  processed: boolean;
}

class LifeHubDB extends Dexie {
  users!: Table<UserRow, string>;
  tasks!: Table<TaskRow, string>;
  notes!: Table<NoteRow, string>;
  habits!: Table<HabitRow, string>;
  habitLogs!: Table<HabitLogRow, string>;
  events!: Table<EventRow, string>;
  captures!: Table<CaptureRow, string>;
  tags!: Table<TagRow, string>;
  areas!: Table<AreaRow, string>;
  settings!: Table<SettingRow, string>;
  syncQueue!: Table<SyncQueueRow, string>;
  blobs!: Table<BlobRow, string>;
  agentRuns!: Table<AgentRunRow, string>;
  cosmoProfiles!: Table<CosmoProfileRow, string>;
  cosmoContent!: Table<CosmoContentRow, string>;
  mcpCatalog!: Table<MCPCatalogRow, string>;
  emailAccounts!: Table<EmailAccountRow, string>;
  emails!: Table<EmailRow, string>;

  constructor() {
    super("lifehub");
    this.version(1).stores({
      users: "id, email",
      tasks: "id, userId, done, focus, areaId, createdAt, updatedAt, section",
      notes: "id, userId, tag, pinned, createdAt, updatedAt",
      habits: "id, userId",
      habitLogs: "id, habitId, date, [habitId+date]",
      events: "id, userId, start, end, source",
      captures: "id, userId, kind, processed, createdAt",
      tags: "id, userId, name",
      areas: "id, userId, cls",
      settings: "key",
      syncQueue: "id, table, createdAt",
    });
    this.version(2).stores({
      blobs: "id, createdAt",
      agentRuns: "id, userId, status, createdAt, updatedAt",
      cosmoProfiles: "id, userId, externalId",
      cosmoContent: "id, userId, externalId, createdAt",
      mcpCatalog: "id, name, category",
    });
    this.version(3).stores({
      emailAccounts: "id, userId, source, address",
      emails: "id, userId, accountId, externalId, receivedAt, unread, processed, [accountId+externalId]",
    });
  }
}

let _db: LifeHubDB | null = null;
export function db(): LifeHubDB {
  if (typeof window === "undefined") {
    throw new Error("Dexie is browser-only. Don't call db() from server code.");
  }
  if (!_db) _db = new LifeHubDB();
  return _db;
}

export const LOCAL_USER_ID = "local-guest";
export const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));
