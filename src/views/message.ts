// Short messages, e.g. for unknown links or after deleting a pot.
import { html } from 'hono/html';
import { type Html, layout, type Page } from './layout.ts';

export function messagePage(page: Page, title: string, text: string, offerNewPot = true): Html {
	return layout(
		page,
		title,
		html`<h1>${title}</h1>
		<p>${text}</p>
		${offerNewPot ? html`<p>Möchtest du vielleicht einen <a href="/">neuen Wichteltopf anlegen</a>?</p>` : ''}`,
	);
}
