// The start page: how it works, and the form to create a pot with code names and a background photo.
import { html } from 'hono/html';
import { CODE_NAME_LISTS, DEFAULT_LIST_ID } from '../codenames.ts';
import { MAX_TITLE_LENGTH } from '../store.ts';
import { TAGS, THEMES } from '../themes.ts';
import { type Html, layout, type Page } from './layout.ts';
import { giftTag } from './parts.ts';

export interface StartPageProps {
	ttlDays: number;
	/** The day a pot created now would be deleted, if nothing happens to it */
	deletion: string;
}

export function startPage(page: Page, { ttlDays, deletion }: StartPageProps): Html {
	return layout(
		page,
		'Wichteln online auslosen',
		html`<div class="hero">
			<h1>Wichteltopf</h1>
			<p class="lead">Alle werfen ihren Namen in den Topf. Dann wird geheim ausgelost, wer wen beschenkt.</p>
			${giftTag([
				['Von:', '???'],
				['Für:', 'dich'],
			])}
		</div>

		<h2>So geht’s</h2>
		<ol class="steps">
			<li>Lege einen Topf an. Du bekommst einen <b>Teilnahme-Link</b> für alle und einen geheimen <b>Admin-Link</b> für dich.</li>
			<li>Alle tragen sich ein und bekommen einen geheimen Codenamen.</li>
			<li>Wenn alle dabei sind, schließt du den Topf. Jeder Codename bekommt eine Person, die er beschenkt.</li>
		</ol>
		<p class="aside">Auch bekannt als Julklapp, Secret Santa oder „Engerl und Bengerl“. Kostenlos, werbefrei, ohne Anmeldung und ohne E-Mail-Adresse. Ein Topf wird ${ttlDays} Tage nach der letzten Änderung automatisch gelöscht, frühestens also am ${deletion}.</p>

		<form method="post" action="/neu" class="create">
			<section>
				<h2><label for="title">Wie heißt euer Wichteln?</label></h2>
				<input type="text" id="title" name="title" maxlength="${MAX_TITLE_LENGTH}" placeholder="z. B. Familie Müller 2026" autocomplete="off">
				<p class="aside">Optional. Der Titel steht auf allen Seiten des Topfs und in der Vorschau, wenn du den Link verschickst. So verwechselt niemand zwei Töpfe.</p>
			</section>

			<fieldset class="lists">
				<legend><h2>Wähle die Codenamen</h2></legend>
				${CODE_NAME_LISTS.map(
					(list) => html`<label>
						<input type="radio" name="codenames" value="${list.id}"${list.id === DEFAULT_LIST_ID ? ' checked' : ''}${list.tag ? html` data-tag="${list.tag}"` : ''}>
						<span>
							<b>${list.label}</b> <span class="capacity">bis zu ${list.names.length} Personen</span><br>
							<small>z.&nbsp;B. ${list.names.slice(0, 3).join(', ')}</small>
						</span>
					</label>`,
				)}
			</fieldset>

			<fieldset class="themes">
				<legend><h2>Wähle ein Hintergrundbild</h2></legend>
				<label class="theme-filter" hidden>
					Zeige
					<select data-theme-filter>
						<option value="">alle Bilder</option>
						${TAGS.map((tag) => html`<option value="${tag.id}">${tag.label}</option>`)}
					</select>
				</label>
				${THEMES.map(
					(t) => html`<label class="theme" data-tags="${t.tags.join(' ')}">
						<input type="radio" name="theme" value="${t.id}" ${t.id === page.theme ? 'checked' : ''}>
						<img class="swatch" src="/static/img/thumb/${t.id}.webp" alt="${t.label}" width="384" height="256" loading="lazy">
					</label>`,
				)}
			</fieldset>
			<section class="form-end">
				<h2>Alles bereit?</h2>
				<p>Du bekommst gleich den Teilnahme&#8209;Link für alle und deinen Admin&#8209;Link.</p>
				<button type="submit" class="large">Wichteltopf anlegen</button>
			</section>
		</form>`,
		{ index: true },
	);
}
