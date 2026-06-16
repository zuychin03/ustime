const ADJECTIVES = [
	'lunar',
	'solar',
	'cosmic',
	'velvet',
	'golden',
	'amber',
	'rosy',
	'misty',
	'sunny',
	'cosy',
	'gentle',
	'merry',
	'dreamy',
	'silky',
	'breezy',
	'starry',
	'mellow',
	'tender',
	'glowing',
	'snowy',
	'coral',
	'azure',
	'jade',
	'ivory',
	'maple',
	'honey',
	'minty',
	'plush',
	'quiet',
	'brave'
];

const NOUNS = [
	'fox',
	'bee',
	'moon',
	'wave',
	'lark',
	'fern',
	'dove',
	'pine',
	'reef',
	'comet',
	'otter',
	'robin',
	'cloud',
	'river',
	'maple',
	'finch',
	'heron',
	'willow',
	'ember',
	'pearl',
	'aspen',
	'cocoa',
	'lily',
	'sparrow',
	'meadow',
	'puffin',
	'koala',
	'panda',
	'tulip',
	'biscuit'
];

function randInt(min: number, maxExclusive: number): number {
	const span = maxExclusive - min;
	const arr = new Uint32Array(1);
	crypto.getRandomValues(arr);
	return min + (arr[0] % span);
}

const pick = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length)]!;

export function generateInviteCode(): string {
	return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${randInt(10, 100)}`;
}
