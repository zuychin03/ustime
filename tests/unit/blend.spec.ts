import { describe, expect, it } from 'vitest';
import { blend, readableTextColor } from '~/lib/utils/blend';

describe('blend', () => {
	it('returns a valid hex colour', () => {
		expect(blend('#ff0000', '#0000ff')).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('is symmetric in its arguments', () => {
		expect(blend('#ff0000', '#0000ff')).toBe(blend('#0000ff', '#ff0000'));
	});

	it('blending a colour with itself is a no-op', () => {
		expect(blend('#7c3aed', '#7c3aed')).toBe('#7c3aed');
	});
});

describe('readableTextColor', () => {
	it('is white on dark backgrounds and black on light', () => {
		expect(readableTextColor('#000000')).toBe('#ffffff');
		expect(readableTextColor('#ffffff')).toBe('#000000');
		expect(readableTextColor('#0b1020')).toBe('#ffffff');
	});
});
