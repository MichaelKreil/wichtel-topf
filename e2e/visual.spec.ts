// Visual regression test: compares screenshots of all pages with the reference images in visual.spec.ts-snapshots/.
// Run with `npm run test:visual`; after intended design changes: `npm run test:visual -- --update-snapshots`.
// Not part of CI: fonts render slightly differently on each operating system, so the references are made on macOS.
import type { Page } from '@playwright/test';
import { createPot, expect, normalTransparency, test } from './fixtures.ts';

// the same background colour everywhere, also on pages that pick a random one
const THEME = 'snowman';

for (const [device, viewport] of [
	['phone', { width: 390, height: 844 }],
	['desktop', { width: 1440, height: 900 }],
] as const) {
	test(`pages look as before (${device})`, async ({ browser, request }) => {
		test.setTimeout(120_000);
		const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
		const page = await context.newPage();
		await normalTransparency(page);

		const open = await createPot(request, {
			theme: THEME,
			people: ['Anna Schmidt', 'Ben Müller', 'Carla Weiß', 'David Fischer'],
		});
		const closed = await createPot(request, {
			theme: THEME,
			people: ['Anna Schmidt', 'Ben Müller', 'Carla Weiß', 'David Fischer'],
		});
		await page.request.post(`${closed.adminPath}/schliessen`, { headers: { 'Sec-Fetch-Site': 'same-origin' } });

		const pages: [string, string][] = [
			['start', '/'],
			['pot', open.potPath],
			['personal', open.personalPaths[0] as string],
			['pot-known', open.potPath], // after the personal page: the browser remembers the participant
			['admin', open.adminPath],
			['result', closed.potPath],
			['personal-result', closed.personalPaths[0] as string],
			['result-known', closed.potPath],
			['admin-result', closed.adminPath],
			['privacy', '/datenschutz'],
			['not-found', '/Unbekannt-abcdefgh'],
		];
		for (const [name, path] of pages) {
			await show(page, path);
			await expect(page, `${name} (${device})`).toHaveScreenshot(`${name}-${device}.png`, {
				fullPage: true,
				// the photo previews are checked by test/assets.test.ts; masked, the reference images stay small
				mask: [page.locator('.swatch')],
				maxDiffPixelRatio: 0.002,
			});
		}
		await context.close();
	});
}

async function show(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.evaluate((theme) => {
		document.body.dataset.theme = theme;
		// without the photo itself (only its colour): smaller reference images; the photos are covered by the contrast test
		document.body.style.setProperty('--bg-sm', 'none');
		document.body.style.setProperty('--bg-lg', 'none');
		// the start page also has a random photo preselected
		const radio = document.querySelector<HTMLInputElement>(`input[name="theme"][value="${theme}"]`);
		if (radio) radio.checked = true;
		// random parts (code names, who draws whom, secret links) become fixed placeholders, so the layout is stable
		// (inside <mark>, where there is one, so the highlighted own row stays highlighted)
		const fill = (selector: string, text: string) => {
			for (const el of document.querySelectorAll(selector)) (el.querySelector('mark') ?? el).textContent = text;
		};
		fill('.tag-value, .note td:first-child', 'Siebenschläfer');
		fill('.note td + td', 'Carla Weiß');
		// the own row's position depends on the random code name: always mark the first one instead
		const marks = [...document.querySelectorAll('.note mark')];
		for (const mark of marks) mark.replaceWith(mark.textContent ?? '');
		if (marks.length > 0)
			for (const cell of document.querySelectorAll('.note tbody tr:first-child td'))
				cell.replaceChildren(Object.assign(document.createElement('mark'), { textContent: cell.textContent }));
		for (const input of document.querySelectorAll<HTMLInputElement>('.copy input'))
			input.value = 'https://wichteltopf.de/Melbedin-abcdefgh';
	}, THEME);
	await page.evaluate(() => document.fonts.ready);
	await page.waitForLoadState('networkidle');
}
