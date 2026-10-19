// Renders the link preview image (1200×630) for every background into public/static/og/<theme>.jpg,
// and the one of the default theme to public/static/og.jpg for pages without a pot.
// The template assets/og-image.html uses the site's stylesheets, served here from public/ by a tiny
// local server, and is shot with headless Chrome (set CHROME if it isn't found).
// Usage: npm run og [-- id ...]   (after `npm run images` and the entry in src/themes.ts)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { THEMES } from '../src/themes.ts';
import { startBrowser } from './lib/harness.ts';

/** The background of public/static/og.jpg, the preview of pages that don't belong to a pot */
const START_THEME = 'tree1';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const OUT = `${PUBLIC}static/og/`;
const template = readFileSync(new URL('../assets/og-image.html', import.meta.url), 'utf8');
const TYPES: Record<string, string> = {
	css: 'text/css',
	woff2: 'font/woff2',
	webp: 'image/webp',
	svg: 'image/svg+xml',
};

const server = createServer((req, res) => {
	const path = new URL(req.url ?? '/', 'http://localhost').pathname;
	const theme = path.match(/^\/og\/([\w-]+)$/)?.[1];
	if (theme) {
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
		return res.end(template.replace('{{theme}}', theme));
	}
	try {
		res.writeHead(200, { 'content-type': TYPES[path.split('.').pop() ?? ''] ?? 'application/octet-stream' });
		res.end(readFileSync(PUBLIC + path.replace(/^\//, '').replace(/\.\./g, '')));
	} catch {
		res.writeHead(404);
		res.end();
	}
});
await new Promise<void>((resolve) => server.listen(0, resolve));
const address = server.address();
const base = `http://localhost:${typeof address === 'object' && address ? address.port : 0}`;

const ids = process.argv.slice(2);
const themes = ids.length ? THEMES.filter((t) => ids.includes(t.id)) : THEMES;
const browser = await startBrowser();
await browser.setViewport(1200, 630, 1);
mkdirSync(OUT, { recursive: true });
for (const { id } of themes) {
	await browser.open(`${base}/og/${id}`);
	await browser.evaluate('document.fonts.ready.then(() => true)');
	const jpeg = await sharp(await browser.screenshot())
		.jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
		.toBuffer();
	writeFileSync(`${OUT}${id}.jpg`, jpeg);
	if (id === START_THEME) writeFileSync(`${PUBLIC}static/og.jpg`, jpeg);
	console.log(`✔ ${id}`);
}
server.close();
process.exit(0);
