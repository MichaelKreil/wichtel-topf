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
	/** The pot's title, on pages that belong to a pot; empty if the pot has none */
	potTitle?: string;
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
	const potTitle = page.potTitle ?? '';
	// the site first, then the pot, then the page: the same in the tab, in bookmarks and in link previews
	// pages of a pot get the preview image of its background (npm run og), the others the default one
	const ogImage = page.potTitle === undefined ? '/static/og.jpg' : `/static/og/${page.theme}.jpg`;
	const fullTitle = ['Wichteltopf.de', potTitle, title].filter(Boolean).join(' · ');
	return html`<!doctype html>
<html lang="de">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="referrer" content="same-origin">
	<title>${fullTitle}</title>
	<meta name="description" content="${description}">
	${options.index ? '' : html`<meta name="robots" content="noindex">`}
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="Wichteltopf.de">
	<meta property="og:title" content="${fullTitle}">
	<meta property="og:description" content="${description}">
	<meta property="og:image" content="${page.origin}${ogImage}">
	<meta property="og:image:width" content="1200">
	<meta property="og:image:height" content="630">
	<meta name="twitter:card" content="summary_large_image">
	<link rel="icon" href="/static/icon.svg" type="image/svg+xml">
	<link rel="apple-touch-icon" href="/apple-touch-icon.png">
	<meta name="theme-color" content="${themeOrDefault(page.theme).color}">
	<link rel="preload" href="/static/fonts/young-serif-400.woff2" as="font" type="font/woff2" crossorigin>
	<link rel="preload" href="/static/fonts/caveat-600.woff2" as="font" type="font/woff2" crossorigin>
	<link rel="preload" href="/static/fonts/nunito-sans-400-700.woff2" as="font" type="font/woff2" crossorigin>
	<link rel="stylesheet" href="/static/style.css?v=${ASSET_VERSION}">
	<link rel="stylesheet" href="/static/themes.css?v=${ASSET_VERSION}">
	<script src="/static/app.js?v=${ASSET_VERSION}" defer></script>
</head>
<body data-theme="${page.theme}">
	<main>
		${potTitle ? html`<p class="kicker">${potTitle}</p>` : ''}
		${content}
		<footer>
			<a href="/datenschutz">Impressum und Datenschutz</a>
			<a class="source" href="https://github.com/MichaelKreil/wichtel-topf/" rel="noopener" aria-label="Quellcode auf GitHub"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" fill="currentcolor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg></a>
		</footer>
	</main>
</body>
</html>`;
}
