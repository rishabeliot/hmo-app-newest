import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "pending",
  "cancelled",
]);

export const entryStatusEnum = pgEnum("entry_status", [
  "not_entered",
  "admitted",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 150 }).unique().notNull(),
  name: varchar("name", { length: 100 }),
  igHandle: varchar("ig_handle", { length: 80 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  venue: varchar("venue", { length: 200 }),
  backgroundImageUrl: text("background_image_url"),
  youtubeUrl: text("youtube_url"),
  razorpayItemId: varchar("razorpay_item_id", { length: 100 }),
  location: varchar("location", { length: 200 }),
  timeDisplay: varchar("time_display", { length: 50 }),
  isTicketingClosed: boolean("is_ticketing_closed").default(false).notNull(),
  isUpcoming: boolean("is_upcoming").default(false).notNull(),
  waitlistingEnabled: boolean("waitlisting_enabled").default(true).notNull(),
  defaultTicketPrice: integer("default_ticket_price").default(175000).notNull(),
  capacity: integer("capacity"),
  mapsUrl: text("maps_url"),
  greetingImageUrl: text("greeting_image_url"),
  checkoutImageUrl: text("checkout_image_url"),
  confirmationImageUrl: text("confirmation_image_url"),
  ticketVisualUrl: text("ticket_visual_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eventAllowlist = pgTable(
  "event_allowlist",
  {
    eventId: uuid("event_id").notNull().references(() => events.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    ticketPrice: integer("ticket_price").notNull(),
    paymentMode: varchar("payment_mode", { length: 20 }).notNull(),
    bookingStatus: varchar("booking_status", { length: 20 }).notNull().default("invited"),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.userId] })]
);

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  bookingStatus: bookingStatusEnum("booking_status").notNull(),
  razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
  qrCodeToken: text("qr_code_token").unique(),
  entryStatus: entryStatusEnum("entry_status").default("not_entered").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id),
  name: varchar("name", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  igHandle: varchar("ig_handle", { length: 80 }),
  email: varchar("email", { length: 150 }),
  addedToEvent: boolean("added_to_event").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
