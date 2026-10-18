// The frame of every page: head with meta tags, styles and scripts, the background photo and the footer.
import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';
import { ASSET_VERSION } from '../asset-version.ts';
import { themeOrDefault } from '../themes.ts';

export type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

/** What every page needs: the background theme, and the public origin for absolute URLs. */
export interface Page {
	theme: string;
	origin: string;
}

interface LayoutOptions {
	/** Shown in link previews (WhatsApp, Signal, …) and search results. */
	description?: string;
	/** Only the start page should appear in search engines. */
	index?: boolean;
}

const DEFAULT_DESCRIPTION = 'Kostenloser Online-Wichteltopf: Namen eintragen, geheim auslosen, fertig.';

export function layout(page: Page, title: string, content: Html, options: LayoutOptions = {}): Html {
	const description = options.description ?? DEFAULT_DESCRIPTION;
	return html`<!doctype html>
<html lang="de">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="referrer" content="no-referrer">
	<title>${title} · Wichteltopf</title>
	<meta name="description" content="${description}">
	${options.index ? '' : html`<meta name="robots" content="noindex">`}
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="Wichteltopf">
	<meta property="og:title" content="${title}">
	<meta property="og:description" content="${description}">
	<meta property="og:image" content="${page.origin}/static/og.jpg">
	<meta property="og:image:width" content="1200">
	<meta property="og:image:height" content="630">
	<meta name="twitter:card" content="summary_large_image">
	<link rel="icon" href="/static/icon.svg" type="image/svg+xml">
	<link rel="apple-touch-icon" href="/apple-touch-icon.png">
	<meta name="theme-color" content="${themeOrDefault(page.theme).color}">
	<link rel="preload" href="/static/fonts/young-serif-400.woff2" as="font" type="font/woff2" crossorigin>
	<link rel="preload" href="/static/fonts/caveat-600.woff2" as="font" type="font/woff2" crossorigin>
	<link rel="stylesheet" href="/static/style.css?v=${ASSET_VERSION}">
	<link rel="stylesheet" href="/static/themes.css?v=${ASSET_VERSION}">
	<script src="/static/app.js?v=${ASSET_VERSION}" defer></script>
</head>
<body data-theme="${page.theme}">
	<main>
		${content}
		<footer><a href="/datenschutz">Impressum und Datenschutz</a></footer>
	</main>
</body>
</html>`;
}
