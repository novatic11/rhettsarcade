import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const vaults = sqliteTable("save_vaults", {
  id:text("id").primaryKey(), passwordKey:text("password_key").notNull().unique(),
  payload:text("payload").notNull(), revision:integer("revision").notNull().default(1),
  updatedAt:integer("updated_at").notNull()
});
export const sessions = sqliteTable("save_sessions", {
  tokenHash:text("token_hash").primaryKey(), vaultId:text("vault_id").notNull().references(()=>vaults.id),
  expiresAt:integer("expires_at").notNull()
});
export const limits = sqliteTable("save_limits", {
  key:text("key").primaryKey(), count:integer("count").notNull(), expiresAt:integer("expires_at").notNull()
});
export const requestEvents = sqliteTable("arcade_request_events", {
  id:integer("id").primaryKey({autoIncrement:true}),
  eventKey:text("event_key").notNull().unique(),
  requestId:text("request_id").notNull(),
  kind:text("kind").notNull(),
  value:text("value").notNull(),
  createdAt:integer("created_at").notNull(),
  seenAt:integer("seen_at")
}, table=>[index("arcade_request_events_thread").on(table.requestId,table.id),index("arcade_request_events_unseen").on(table.requestId,table.seenAt)]);

export const presence = sqliteTable("arcade_presence", {
  sessionId: text("session_id").primaryKey().notNull(),
  visitorId: text("visitor_id").notNull(),
  gameId: text("game_id"),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("arcade_presence_expiry").on(table.expiresAt)]);

export const releaseGames = sqliteTable("arcade_release_games", {
  gameId: text("game_id").primaryKey().notNull(),
  metadata: text("metadata").notNull(),
});
