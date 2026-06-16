export type ProfileStatus = 'free' | 'studying' | 'in_class' | 'sleeping';
export type EventType = 'general' | 'call' | 'study' | 'date' | 'visit' | 'busy_import';
export type EventSource = 'app' | 'google';
export type EventVisibility = 'full' | 'busy';

export interface ProfileRow {
	id: string;
	display_name: string;
	colour: string;
	timezone: string;
	sleep_start: string;
	sleep_end: string;
	status: ProfileStatus;
	avatar_url: string | null;
	onboarded_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface CoupleRow {
	id: string;
	member_a: string;
	member_b: string | null;
	anniversary_date: string | null;
	unlinked_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface EventRow {
	id: string;
	couple_id: string;
	owner_id: string | null;
	title: string;
	description: string | null;
	type: EventType;
	starts_at: string;
	ends_at: string;
	all_day: boolean;
	colour_override: string | null;
	rrule: string | null;
	rrule_until: string | null;
	tzid: string | null;
	location: string | null;
	source: EventSource;
	external_id: string | null;
	visibility: EventVisibility;
	created_at: string;
	updated_at: string;
}

export interface StudySessionRow {
	id: string;
	couple_id: string;
	event_id: string | null;
	started_at: string;
	ended_at: string | null;
	pomodoros_completed: number;
	participants: string[];
	created_at: string;
	updated_at: string;
}

export interface PingRow {
	id: string;
	couple_id: string;
	sender_id: string;
	sent_at: string;
	created_at: string;
	updated_at: string;
}
