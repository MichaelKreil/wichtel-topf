// Computes the colors of each background for src/themes.ts from the thumbnails in public/static/img/thumb:
// - color: the photo's average color (shown while it loads, and as the browser bar color)
// - card: a light tint of the photo's main hue for the content card, so dark text stays readable
// Usage: node scripts/theme-colors.ts [id ...]   (after `npm run images`)
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const THUMBS = fileURLToPath(new URL('../public/static/img/thumb/', import.meta.url));

function hex(rgb: number[]): string {
	return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** The a and b components of a color in Oklab, which carry its hue and chroma */
function srgbToOklab(r: number, g: number, b: number): [number, number] {
	const linear = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
	const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function oklchToHex(lightness: number, chroma: number, hue: number): string {
	const a = chroma * Math.cos((hue * Math.PI) / 180);
	const b = chroma * Math.sin((hue * Math.PI) / 180);
	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const rgb = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
	const gamma = (x: number) => {
		const c = Math.min(Math.max(x, 0), 1);
		return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
	};
	return hex(rgb.map((c) => gamma(c) * 255));
}

async function colors(path: string): Promise<{ average: string; card: string }> {
	const image = sharp(path).removeAlpha();
	const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
	const sum = [0, 0, 0];
	for (let i = 0; i < data.length; i += info.channels) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
	const pixels = info.width * info.height;
	const average = hex(sum.map((s) => s / pixels));

	// main hue: colorful pixels dominate, gray ones hardly count
	const small = await image.resize(96, 64, { fit: 'fill' }).raw().toBuffer();
	let x = 0;
	let y = 0;
	for (let i = 0; i < small.length; i += 3) {
		const [a, b] = srgbToOklab(small[i], small[i + 1], small[i + 2]);
		const chroma = Math.hypot(a, b);
		x += chroma * a; // = chroma² · cos(hue)
		y += chroma * b;
	}
	const strength = Math.hypot(x, y) / (96 * 64); // how colorful (and consistent in hue) the photo is
	const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
	// nearly colorless photos get an almost neutral card
	const card = oklchToHex(0.925, strength < 0.0015 ? 0.012 : 0.035, hue);
	return { average, card };
}

const ids = process.argv.slice(2);
if (ids.length === 0)
	ids.push(
		...readdirSync(THUMBS)
			.filter((f) => f.endsWith('.webp'))
			.map((f) => f.slice(0, -5))
			.sort(),
	);
for (const id of ids) {
	const { average, card } = await colors(`${THUMBS}${id}.webp`);
	console.log(`${id}: color: '${average}', card: '${card}'`);
}
