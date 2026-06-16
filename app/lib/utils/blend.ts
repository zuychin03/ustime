import { formatHex, interpolate, wcagLuminance } from 'culori';

export function blend(hexA: string, hexB: string): string {
	return formatHex(interpolate([hexA, hexB], 'oklch')(0.5)) ?? hexA;
}

export function readableTextColor(background: string): '#000000' | '#ffffff' {
	return wcagLuminance(background) > 0.4 ? '#000000' : '#ffffff';
}
