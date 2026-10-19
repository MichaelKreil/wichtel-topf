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
			<li><span><b>Topf anlegen.</b> Du bekommst einen <b>Teilnahme-Link</b> für alle und einen geheimen <b>Admin-Link</b> für dich.</span></li>
			<li><span><b>Alle tragen sich ein</b> und bekommen einen geheimen Codenamen.</span></li>
			<li><span><b>Du schließt den Topf.</b> Jeder Codename bekommt eine Person, die er beschenkt.</span></li>
		</ol>
		<p class="aside">Auch bekannt als Julklapp, Secret Santa oder „Engerl und Bengerl“. Kostenlos, werbefrei, ohne Anmeldung und ohne E-Mail-Adresse. Ein Topf wird ${ttlDays} Tage nach der letzten Änderung automatisch gelöscht, frühestens also am ${deletion}.</p>

		<form method="post" action="/neu" class="create">
			<div class="field">
				<label for="title">Wie heißt euer Wichteln? <span class="optional">(optional)</span></label>
				<input type="text" id="title" name="title" maxlength="${MAX_TITLE_LENGTH}" placeholder="z. B. Familie Müller 2026" autocomplete="off">
				<p class="aside">Der Titel steht auf allen Seiten des Topfs und in der Vorschau, wenn du den Link verschickst. So verwechselt niemand zwei Töpfe.</p>
			</div>

			<fieldset class="field">
				<legend>Codenamen</legend>
				<div class="lists">
					${CODE_NAME_LISTS.map(
						(list) => html`<label>
							<input type="radio" name="codenames" value="${list.id}"${list.id === DEFAULT_LIST_ID ? ' checked' : ''}${list.tag ? html` data-tag="${list.tag}"` : ''}>
							<span>
								<b>${list.label}</b> <span class="capacity">bis zu ${list.names.length} Personen</span><br>
								<small>z.&nbsp;B. ${list.names.slice(0, 3).join(', ')}</small>
							</span>
						</label>`,
					)}
				</div>
			</fieldset>

			<fieldset class="field">
				<legend>Hintergrundbild</legend>
				<label class="theme-filter" hidden>
					Zeige
					<select data-theme-filter>
						<option value="">alle Bilder</option>
						${TAGS.map((tag) => html`<option value="${tag.id}">${tag.label}</option>`)}
					</select>
				</label>
				<div class="themes">
					${THEMES.map(
						(t) => html`<label class="theme" data-tags="${t.tags.join(' ')}">
							<input type="radio" name="theme" value="${t.id}" ${t.id === page.theme ? 'checked' : ''}>
							<img class="swatch" src="/static/img/thumb/${t.id}.webp" alt="${t.label}" width="384" height="256" loading="lazy">
						</label>`,
					)}
				</div>
			</fieldset>

			<div class="form-end">
				<p class="aside">Du bekommst gleich den Teilnahme&#8209;Link für alle und deinen Admin&#8209;Link.</p>
				<button type="submit" class="large">Wichteltopf anlegen</button>
			</div>
		</form>`,
		{ index: true },
	);
}
