// The result behind the participation link, once the pot is closed.
import { html } from 'hono/html';
import { type Html, layout, type Page } from './layout.ts';
import { type ResultRow, resultList } from './parts.ts';

export function resultPage(page: Page, rows: ResultRow[]): Html {
	return layout(
		page,
		'Ergebnis',
		html`<h1>Die Ziehung ist abgeschlossen</h1>
		<p>Suche deinen geheimen Codenamen in der Liste, oder öffne deinen persönlichen Link.</p>
		${resultList(rows)}`,
	);
}
