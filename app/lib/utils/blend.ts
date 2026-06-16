import { rgb, formatHex, wcagLuminance } from 'culori';

/** Convert an additive RGB triple (0–255) to the artists' RYB colour space. */
function rgbToRyb(r: number, g: number, b: number): [number, number, number] {
	// Remove the whiteness.
	const w = Math.min(r, g, b);
	r -= w;
	g -= w;
	b -= w;
	const mg = Math.max(r, g, b);
	// Get the yellow out of the red + green.
	let y = Math.min(r, g);
	r -= y;
	g -= y;
	// If this unfortunate conversion combines blue and green, split them.
	if (b > 0 && g > 0) {
		b /= 2;
		g /= 2;
	}
	// Redistribute the remaining green.
	y += g;
	b += g;
	// Normalise.
	const my = Math.max(r, y, b);
	if (my > 0) {
		const n = mg / my;
		r *= n;
		y *= n;
		b *= n;
	}
	// Add the white back in.
	return [r + w, y + w, b + w];
}

/** Convert an RYB triple (0–255) back to additive RGB. */
function rybToRgb(r: number, y: number, b: number): [number, number, number] {
	const w = Math.min(r, y, b);
	r -= w;
	y -= w;
	b -= w;
	const my = Math.max(r, y, b);
	// Get the green out of the yellow + blue.
	let g = Math.min(y, b);
	y -= g;
	b -= g;
	if (b > 0 && g > 0) {
		b *= 2;
		g *= 2;
	}
	// Redistribute the remaining yellow.
	r += y;
	g += y;
	const mg = Math.max(r, g, b);
	if (mg > 0) {
		const n = my / mg;
		r *= n;
		g *= n;
		b *= n;
	}
	return [r + w, g + w, b + w];
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, v));

/**
 * Mix two colours the way pigments mix (subtractive), via the artists' RYB
 * colour wheel: blue + yellow → green, red + yellow → orange, red + blue →
 * purple. Reacts to either input changing.
 */
export function blend(hexA: string, hexB: string): string {
	if (hexA === hexB) return hexA;
	const a = rgb(hexA);
	const b = rgb(hexB);
	if (!a || !b) return hexA;

	const [ar, ay, ab] = rgbToRyb(a.r * 255, a.g * 255, a.b * 255);
	const [br, by, bb] = rgbToRyb(b.r * 255, b.g * 255, b.b * 255);
	const [r, g, bl] = rybToRgb((ar + br) / 2, (ay + by) / 2, (ab + bb) / 2);

	return (
		formatHex({
			mode: 'rgb',
			r: clamp255(r) / 255,
			g: clamp255(g) / 255,
			b: clamp255(bl) / 255
		}) ?? hexA
	);
}

export function readableTextColor(background: string): '#000000' | '#ffffff' {
	return wcagLuminance(background) > 0.4 ? '#000000' : '#ffffff';
}
