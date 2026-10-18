import AxeBuilder from '@axe-core/playwright';
import { THEMES } from '../src/themes.ts';
import { createPot, expect, normalTransparency, test } from './fixtures.ts';

test('all pages pass the automated accessibility checks (axe)', async ({ page, request }) => {
	const { potPath, adminPath, personalPaths } = await createPot(request, { people: ['Anna', 'Ben', 'Carla'] });
	const pages: Record<string, string> = {
		start: '/',
		pot: potPath,
		personal: personalPaths[0] as string,
		admin: adminPath,
		privacy: '/datenschutz',
		'not found': '/Unbekannt-abcdefgh',
	};
	const closed = await createPot(request, { people: ['Anna', 'Ben', 'Carla'] });
	await page.request.post(`${closed.adminPath}/schliessen`, { headers: { 'Sec-Fetch-Site': 'same-origin' } });
	Object.assign(pages, {
		result: closed.potPath,
		'personal result': closed.personalPaths[0] as string,
		'admin result': closed.adminPath,
	});

	for (const [name, path] of Object.entries(pages)) {
		await page.goto(path);
		const { violations } = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
			// the card is translucent over a photo, which axe can't measure; see the contrast test below
			.disableRules(['color-contrast'])
			.analyze();
		expect(
			violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`),
			name,
		).toEqual([]);
	}
});

// WCAG AA for normal text
const MIN_CONTRAST = 4.5;
// the lightest text colour on the card (--ink-soft), so all darker text passes too
const SOFT_TEXT = [0x5c, 0x46, 0x36];

for (const [viewport, size] of [
	['phone', { width: 390, height: 844 }],
	['desktop', { width: 1440, height: 900 }],
] as const) {
	test(`text on the card is readable on every background (${viewport})`, async ({ browser, request, browserName }) => {
		// rendering of the frosted glass is the same in all engines; one is enough
		test.skip(browserName !== 'chromium', 'checked in Chrome only');
		test.setTimeout(120_000);
		const context = await browser.newContext({ viewport: size });
		const page = await context.newPage();
		await normalTransparency(page);
		const analysis = await context.newPage(); // a blank page without our CSP, to read pixels in a canvas

		const failures: string[] = [];
		for (const theme of THEMES) {
			const { potPath } = await createPot(request, { theme: theme.id, people: ['Anna'] });
			await page.goto(potPath);
			await page.evaluate(() => document.fonts.ready);
			// hide everything inside the card, so only its background is left
			await page.evaluate(() => {
				for (const child of document.querySelectorAll('main > *')) (child as HTMLElement).style.visibility = 'hidden';
			});
			const png = (await page.locator('main').screenshot()).toString('base64');
			// the darkest spots of the card are the worst case for dark text (ignoring the rounded corners)
			const darkest = await analysis.evaluate(async (data) => {
				const image = new Image();
				image.src = `data:image/png;base64,${data}`;
				await image.decode();
				const canvas = new OffscreenCanvas(image.width, image.height);
				const context = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
				context.drawImage(image, 0, 0);
				const inset = 16;
				const { data: pixels } = context.getImageData(inset, inset, image.width - 2 * inset, image.height - 2 * inset);
				const channel = (c: number) => {
					const s = c / 255;
					return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
				};
				const luminances: number[] = [];
				for (let i = 0; i < pixels.length; i += 4 * 7)
					luminances.push(
						0.2126 * channel(pixels[i] as number) +
							0.7152 * channel(pixels[i + 1] as number) +
							0.0722 * channel(pixels[i + 2] as number),
					);
				luminances.sort((a, b) => a - b);
				return luminances[Math.floor(luminances.length * 0.01)] as number; // 1st percentile, robust to single pixels
			}, png);
			const text = SOFT_TEXT.map((c) => {
				const s = c / 255;
				return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			});
			const textLuminance = 0.2126 * (text[0] as number) + 0.7152 * (text[1] as number) + 0.0722 * (text[2] as number);
			const contrast = (darkest + 0.05) / (textLuminance + 0.05);
			if (contrast < MIN_CONTRAST) failures.push(`${theme.id}: ${contrast.toFixed(2)}:1`);
		}
		await context.close();
		expect(failures, `contrast below ${MIN_CONTRAST}:1 for the lightest text`).toEqual([]);
	});
}
