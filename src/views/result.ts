// The result behind the participation link, once the pot is closed.
import { html } from 'hono/html';
import { type Html, layout, type Page } from './layout.ts';
import { type ResultRow, resultList } from './parts.ts';
import type { KnownParticipant } from './pot.ts';

export interface ResultPageProps {
	page: Page;
	rows: ResultRow[];
	me?: KnownParticipant;
}

/** Lists longer than this get a filter field (shown by app.js), to find one's code name quickly. */
export const FILTER_FROM = 9;

export function resultPage({ page, rows, me }: ResultPageProps): Html {
	return layout(
		page,
		'Ergebnis',
		html`<h1>Die Ziehung ist abgeschlossen</h1>
		${
			me
				? html`<p>Du bist als <b>${me.name}</b> dabei. Dieser Browser hat sich deinen Zugang gemerkt.</p>
		<a class="button" href="${me.personalPath}">Zu deinem Ergebnis</a>
		<h2>Alle Ergebnisse</h2>`
				: ''
		}
		<p>Suche deinen geheimen Codenamen in der Liste, oder öffne deinen persönlichen Link.</p>
		${
			rows.length >= FILTER_FROM
				? html`<label class="filter" hidden>Codename suchen<input type="search" data-filter-rows autocomplete="off"></label>
		<p class="aside" data-filter-empty hidden>Kein Codename passt. Prüfe die Schreibweise.</p>`
				: ''
		}
		${resultList(rows)}`,
	);
}
