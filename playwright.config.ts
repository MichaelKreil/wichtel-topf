// End-to-end tests in real browsers: Chrome, Safari (WebKit) and Firefox.
// Usage: npm run test:e2e   (once: npx playwright install chromium webkit firefox)
import { defineConfig, devices } from '@playwright/test';

const PORT = 8797;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure',
	},
	projects: [
		{ name: 'chrome', use: { ...devices['Pixel 7'] }, testIgnore: 'visual.spec.ts' },
		{ name: 'safari', use: { ...devices['iPhone 15'] }, testIgnore: 'visual.spec.ts' },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: 'visual.spec.ts' },
		// comparison with reference screenshots: only on demand (npm run test:visual), see e2e/visual.spec.ts
		{ name: 'visual', use: { ...devices['Desktop Chrome'] }, testMatch: 'visual.spec.ts' },
	],
	webServer: {
		command: 'node src/server.ts',
		url: `http://localhost:${PORT}/healthz`,
		reuseExistingServer: false,
		// a fresh database in memory; TRUST_PROXY lets each test use its own IP, below the rate limits
		env: { PORT: String(PORT), DATABASE_PATH: ':memory:', TRUST_PROXY: '1' },
	},
});
