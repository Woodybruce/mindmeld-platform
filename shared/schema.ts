import { pgTable, uuid, text, boolean, timestamp, integer, date, jsonb, bigint, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username"),
  partnerId: uuid("partner_id"),
  partnerCode: text("partner_code").unique(),
  phoneNumber: text("phone_number"),
  calendarForwardToken: text("calendar_forward_token").unique(),
  avatarUrl: text("avatar_url"),
  anniversaryDate: date("anniversary_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizSessions = pgTable("quiz_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  quizId: text("quiz_id").notNull(),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizAnswers = pgTable("quiz_answers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  questionIndex: integer("question_index").notNull(),
  questionText: text("question_text").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couplePhotos = pgTable("couple_photos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  storagePath: text("storage_path").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sharedLinks = pgTable("shared_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  note: text("note"),
  platform: text("platform").notNull().default("Link"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const microsoftTokens = pgTable("microsoft_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: uuid("sender_id").notNull(),
  receiverId: uuid("receiver_id").notNull(),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  imageUrl: text("image_url"),
  replyToId: uuid("reply_to_id"),
  messageType: text("message_type").notNull().default("text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  subject: text("subject").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  isAllDay: boolean("is_all_day").notNull().default(false),
  location: text("location"),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sharedFolders = pgTable("shared_folders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  userId: uuid("user_id").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sharedFiles = pgTable("shared_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  folderId: uuid("folder_id"),
  userId: uuid("user_id").notNull(),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
  mimeType: text("mime_type").notNull().default("application/octet-stream"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedContent = pgTable("feed_content", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("quiz"),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  body: text("body").notNull(),
  emoji: text("emoji"),
  imageUrl: text("image_url"),
  tag: text("tag").notNull().default("Quiz"),
  tagColor: text("tag_color").notNull().default("text-us-gold"),
  link: text("link"),
  size: text("size").notNull().default("half"),
  active: boolean("active").notNull().default(true),
  weight: integer("weight").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weeklyTasks = pgTable("weekly_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  scheduledDate: date("scheduled_date").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  source: text("source").notNull().default("manual"),
  sourceId: text("source_id"),
  attachments: jsonb("attachments").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const bucketListProposals = pgTable("bucket_list_proposals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  proposalType: text("proposal_type").notNull().default("sex-bucket"),
  items: jsonb("items").notNull().default([]),
  selectedItems: jsonb("selected_items"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export const moodCheckins = pgTable("mood_checkins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  mood: text("mood").notNull(),
  note: text("note"),
  checkDate: date("check_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentLikes = pgTable("content_likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  contentTitle: text("content_title"),
  contentEmoji: text("content_emoji"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const instaSuggestions = pgTable("insta_suggestions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  handle: text("handle").notNull(),
  label: text("label"),
  bio: text("bio"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deviceTokens = pgTable("device_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  token: text("token").notNull(),
  platform: text("platform").notNull().default("ios"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coupleAnnouncements = pgTable("couple_announcements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  content: text("content").notNull(),
  emoji: text("emoji").default("\uD83D\uDCCC"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sharedLists = pgTable("shared_lists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("\uD83D\uDCDD"),
  template: text("template"),
  maxItems: integer("max_items"),
  items: jsonb("items").notNull().default([]),
  scoreData: jsonb("score_data"),
  aiSuggestable: boolean("ai_suggestable").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
export type FeedContent = typeof feedContent.$inferSelect;
export type InsertFeedContent = typeof feedContent.$inferInsert;
export type WeeklyTask = typeof weeklyTasks.$inferSelect;
export type InsertWeeklyTask = typeof weeklyTasks.$inferInsert;
export type SharedList = typeof sharedLists.$inferSelect;
export type InsertSharedList = typeof sharedLists.$inferInsert;
