// Shared setup for the end-to-end tests:
// - every browser context comes from its own IP address (X-Forwarded-For), to stay below the rate limits
// - `person()` opens another browser context, e.g. for each participant
// - any JavaScript error or console error (e.g. a CSP violation) fails the test
import { type BrowserContext, test as base, expect, type Page } from '@playwright/test';

export { expect };

const randomIp = () => `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 250) + 1).join('.')}`;

// WebKit reports its own built-in styles of <select> elements as blocked by our CSP; they still work
const IGNORED = /^Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline'/;

function watchErrors(page: Page, errors: string[]): void {
	page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));
	page.on('console', (message) => {
		if (message.type() === 'error' && !IGNORED.test(message.text())) errors.push(`${page.url()}: ${message.text()}`);
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
			return page;
		});
		for (const context of contexts) await context.close();
	},
});
