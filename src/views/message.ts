// Short messages, e.g. for unknown links or after deleting a pot.
import { html } from 'hono/html';
import { type Html, layout, type Page } from './layout.ts';

interface MessageOptions {
	/** The page's title, if the heading is too long for the tab */
	title?: string;
	offerNewPot?: boolean;
}

export function messagePage(page: Page, heading: string, text: string, options: MessageOptions = {}): Html {
	return layout(
		page,
		options.title ?? heading,
		html`<h1>${heading}</h1>
		<p>${text}</p>
		${(options.offerNewPot ?? true) ? html`<p>Möchtest du vielleicht einen <a href="/">neuen Wichteltopf anlegen</a>?</p>` : ''}`,
	);
}
