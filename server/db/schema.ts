import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	time,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
};

export const profileStatus = pgEnum('profile_status', ['free', 'studying', 'in_class', 'sleeping']);

export const eventType = pgEnum('event_type', [
	'general',
	'call',
	'study',
	'date',
	'visit',
	'busy_import'
]);

export const eventSource = pgEnum('event_source', ['app', 'google']);

export const eventVisibility = pgEnum('event_visibility', ['full', 'busy']);

export const milestoneKind = pgEnum('milestone_kind', ['anniversary', 'custom']);

export const profiles = pgTable('profiles', {
	id: uuid('id').primaryKey(), // = auth.users.id (FK + trigger live in the SQL migration)
	displayName: text('display_name').notNull().default(''),
	colour: text('colour').notNull().default('#7c3aed'),
	timezone: text('timezone').notNull().default('UTC'),
	sleepStart: time('sleep_start').notNull().default('23:00'),
	sleepEnd: time('sleep_end').notNull().default('07:00'),
	status: profileStatus('status').notNull().default('free'),
	avatarUrl: text('avatar_url'),
	onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
	...timestamps
});

export const couples = pgTable('couples', {
	id: uuid('id').primaryKey().defaultRandom(),
	memberA: uuid('member_a')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	memberB: uuid('member_b').references(() => profiles.id, { onDelete: 'set null' }),
	anniversaryDate: date('anniversary_date'),
	unlinkedAt: timestamp('unlinked_at', { withTimezone: true }),
	...timestamps
});

export const inviteCodes = pgTable(
	'invite_codes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		coupleId: uuid('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		code: text('code').notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		usedAt: timestamp('used_at', { withTimezone: true }),
		...timestamps
	},
	(t) => [index('invite_codes_code_idx').on(t.code)]
);

export const events = pgTable(
	'events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		coupleId: uuid('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		ownerId: uuid('owner_id').references(() => profiles.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		type: eventType('type').notNull().default('general'),
		startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
		endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
		allDay: boolean('all_day').notNull().default(false),
		colourOverride: text('colour_override'),
		rrule: text('rrule'),
		rruleUntil: timestamp('rrule_until', { withTimezone: true }),
		tzid: text('tzid'),
		location: text('location'),
		source: eventSource('source').notNull().default('app'),
		externalId: text('external_id'),
		visibility: eventVisibility('visibility').notNull().default('full'),
		...timestamps
	},
	(t) => [
		index('events_couple_starts_idx').on(t.coupleId, t.startsAt),
		index('events_owner_idx').on(t.ownerId)
	]
);

export const eventExceptions = pgTable('event_exceptions', {
	id: uuid('id').primaryKey().defaultRandom(),
	eventId: uuid('event_id')
		.notNull()
		.references(() => events.id, { onDelete: 'cascade' }),
	originalStart: timestamp('original_start', { withTimezone: true }).notNull(),
	cancelled: boolean('cancelled').notNull().default(false),
	overrideEventId: uuid('override_event_id').references(() => events.id, { onDelete: 'set null' }),
	...timestamps
});

export const busyTimes = pgTable(
	'busy_times',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		profileId: uuid('profile_id')
			.notNull()
			.references(() => profiles.id, { onDelete: 'cascade' }),
		startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
		endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
		sourceCalendar: text('source_calendar'),
		...timestamps
	},
	(t) => [index('busy_times_profile_starts_idx').on(t.profileId, t.startsAt)]
);

export const studySessions = pgTable('study_sessions', {
	id: uuid('id').primaryKey().defaultRandom(),
	coupleId: uuid('couple_id')
		.notNull()
		.references(() => couples.id, { onDelete: 'cascade' }),
	eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
	endedAt: timestamp('ended_at', { withTimezone: true }),
	pomodorosCompleted: integer('pomodoros_completed').notNull().default(0),
	participants: uuid('participants')
		.array()
		.notNull()
		.default(sql`'{}'::uuid[]`),
	...timestamps
});

export const milestones = pgTable('milestones', {
	id: uuid('id').primaryKey().defaultRandom(),
	coupleId: uuid('couple_id')
		.notNull()
		.references(() => couples.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	date: date('date').notNull(),
	kind: milestoneKind('kind').notNull().default('custom'),
	recurring: boolean('recurring').notNull().default(false),
	...timestamps
});

export type ChecklistItem = { id: string; label: string; done: boolean };
export type BudgetItem = { id: string; label: string; amount: number };

export const visits = pgTable('visits', {
	id: uuid('id').primaryKey().defaultRandom(),
	eventId: uuid('event_id')
		.notNull()
		.references(() => events.id, { onDelete: 'cascade' }),
	checklist: jsonb('checklist')
		.$type<ChecklistItem[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),
	budgetItems: jsonb('budget_items')
		.$type<BudgetItem[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),
	...timestamps
});

export const memories = pgTable('memories', {
	id: uuid('id').primaryKey().defaultRandom(),
	coupleId: uuid('couple_id')
		.notNull()
		.references(() => couples.id, { onDelete: 'cascade' }),
	eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
	authorId: uuid('author_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	photoPath: text('photo_path'),
	note: text('note'),
	takenOn: date('taken_on'),
	...timestamps
});

export const pings = pgTable('pings', {
	id: uuid('id').primaryKey().defaultRandom(),
	coupleId: uuid('couple_id')
		.notNull()
		.references(() => couples.id, { onDelete: 'cascade' }),
	senderId: uuid('sender_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
	...timestamps
});

export type PushKeys = { p256dh: string; auth: string };

export const pushSubscriptions = pgTable('push_subscriptions', {
	id: uuid('id').primaryKey().defaultRandom(),
	profileId: uuid('profile_id')
		.notNull()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull(),
	keys: jsonb('keys').$type<PushKeys>().notNull(),
	...timestamps
});

export const googleTokens = pgTable('google_tokens', {
	id: uuid('id').primaryKey().defaultRandom(),
	profileId: uuid('profile_id')
		.notNull()
		.unique()
		.references(() => profiles.id, { onDelete: 'cascade' }),
	refreshToken: text('refresh_token').notNull(),
	scope: text('scope'),
	lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
	...timestamps
});

export const aiUsage = pgTable(
	'ai_usage',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		coupleId: uuid('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		day: date('day').notNull(),
		calls: integer('calls').notNull().default(0),
		...timestamps
	},
	(t) => [unique('ai_usage_couple_day_unq').on(t.coupleId, t.day)]
);

export const aiFeedback = pgTable('ai_feedback', {
	id: uuid('id').primaryKey().defaultRandom(),
	coupleId: uuid('couple_id')
		.notNull()
		.references(() => couples.id, { onDelete: 'cascade' }),
	feature: text('feature').notNull(),
	payload: jsonb('payload'),
	rating: integer('rating'),
	...timestamps
});

export type Profile = typeof profiles.$inferSelect;
export type Couple = typeof couples.$inferSelect;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventException = typeof eventExceptions.$inferSelect;
export type BusyTime = typeof busyTimes.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Ping = typeof pings.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type GoogleToken = typeof googleTokens.$inferSelect;
export type AiUsage = typeof aiUsage.$inferSelect;
export type AiFeedback = typeof aiFeedback.$inferSelect;
