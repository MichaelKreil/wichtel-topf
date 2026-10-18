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
		{ name: 'chrome', use: { ...devices['Pixel 7'] } },
		{ name: 'safari', use: { ...devices['iPhone 15'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
	],
	webServer: {
		command: 'node src/server.ts',
		url: `http://localhost:${PORT}/healthz`,
		reuseExistingServer: false,
		// a fresh database in memory; TRUST_PROXY lets each test use its own IP, below the rate limits
		env: { PORT: String(PORT), DATABASE_PATH: ':memory:', TRUST_PROXY: '1' },
	},
});
