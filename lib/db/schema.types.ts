import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { users, events, eventAllowlist, tickets, waitlist } from "./schema";

export type User = InferSelectModel<typeof users>;
export type Event = InferSelectModel<typeof events>;
export type EventAllowlist = InferSelectModel<typeof eventAllowlist>;
export type Ticket = InferSelectModel<typeof tickets>;
export type Waitlist = InferSelectModel<typeof waitlist>;

export type NewUser = InferInsertModel<typeof users>;
export type NewEvent = InferInsertModel<typeof events>;
export type NewEventAllowlist = InferInsertModel<typeof eventAllowlist>;
export type NewTicket = InferInsertModel<typeof tickets>;
export type NewWaitlist = InferInsertModel<typeof waitlist>;

export type AllowlistBookingStatus = 'invited' | 'pending' | 'confirmed';
export type AllowlistPaymentMode = 'razorpay' | 'cash_div' | 'cash_ted' | 'cash_g' | 'cash_utu' | 'cash_elli';
