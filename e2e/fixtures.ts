// Shared setup for the end-to-end tests:
// - every browser context comes from its own IP address (X-Forwarded-For), to stay below the rate limits
// - `person()` opens another browser context, e.g. for each participant
// - any JavaScript error or console error (e.g. a CSP violation) fails the test
import { type APIRequestContext, type BrowserContext, test as base, expect, type Page } from '@playwright/test';

export { expect };

const randomIp = () => `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 250) + 1).join('.')}`;

// WebKit reports its own built-in styles of <select> elements as blocked by our CSP; they still work
const IGNORED = /^Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline'/;

/**
 * Headless Chrome reports "reduce transparency", which hides the frosted glass card.
 * Real devices mostly don't, so the tests emulate that (there is no Playwright option for it yet).
 */
export async function normalTransparency(page: Page): Promise<void> {
	if (page.context().browser()?.browserType().name() !== 'chromium') return;
	const session = await page.context().newCDPSession(page);
	await session.send('Emulation.setEmulatedMedia', {
		features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
	});
}

function watchErrors(page: Page, errors: string[]): void {
	page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));
	page.on('console', (message) => {
		if (message.type() !== 'error' || IGNORED.test(message.text())) return;
		// "not found" pages are tested on purpose; missing files (CSS, images, …) are errors
		if (/status of 404/.test(message.text()) && !message.location().url.includes('/static/')) return;
		errors.push(`${page.url()}: ${message.text()}`);
	});
}

interface Fixtures {
	/** A new person with their own browser and IP address */
	person: () => Promise<Page>;
	errors: string[];
}

export const test = base.extend<Fixtures>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructuring pattern here
	errors: async ({}, use) => {
		const errors: string[] = [];
		await use(errors);
		expect(errors, 'JavaScript or console errors').toEqual([]);
	},
	context: async ({ context, errors }, use) => {
		await context.setExtraHTTPHeaders({ 'X-Forwarded-For': randomIp() });
		context.on('page', (page) => watchErrors(page, errors));
		await use(context);
	},
	page: async ({ page, errors }, use) => {
		watchErrors(page, errors);
		await normalTransparency(page);
		await use(page);
	},
	person: async ({ browser, errors }, use, testInfo) => {
		const contexts: BrowserContext[] = [];
		// the same device as the test's project (phone size, touch, user agent)
		const { defaultBrowserType: _, trace: __, ...options } = testInfo.project.use as Record<string, unknown>;
		await use(async () => {
			const context = await browser.newContext({ ...options, extraHTTPHeaders: { 'X-Forwarded-For': randomIp() } });
			contexts.push(context);
			const page = await context.newPage();
			watchErrors(page, errors);
			await normalTransparency(page);
			return page;
		});
		for (const context of contexts) await context.close();
	},
});

/** Creates a pot directly over HTTP (faster than the form) and returns its links. */
export async function createPot(
	request: APIRequestContext,
	{ theme, people = [] }: { theme?: string; people?: string[] } = {},
): Promise<{ potPath: string; adminPath: string; personalPaths: string[] }> {
	const post = async (path: string, form: Record<string, string>) => {
		const res = await request.post(path, {
			form,
			headers: { 'Sec-Fetch-Site': 'same-origin', 'X-Forwarded-For': randomIp() },
			maxRedirects: 0,
		});
		expect(res.status(), `POST ${path}`).toBe(303);
		return new URL(res.headers().location ?? '', 'http://x').pathname;
	};
	const adminPath = await post('/neu', theme ? { theme } : {});
	const potPath = adminPath.replace(/\/admin\/.*/, '');
	const personalPaths: string[] = [];
	for (const name of people) personalPaths.push(await post(potPath, { name }));
	return { potPath, adminPath, personalPaths };
}
