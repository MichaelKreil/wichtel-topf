// The organiser's page, reachable only via the secret admin link.
import { html } from 'hono/html';
import { type Exclusion, MAX_TITLE_LENGTH, MIN_PARTICIPANTS, type Participant } from '../store.ts';
import { type Html, layout, type Page } from './layout.ts';
import { copyField, icon, type ResultRow, resultList } from './parts.ts';

export interface AdminPageProps {
	page: Page;
	/** The pot's title, empty if none */
	title: string;
	/** The day the pot is deleted automatically, if nothing changes any more */
	deletion: string;
	/** A personal link the organiser just re-issued, to hand over to that participant */
	newLink?: { name: string; url: string };
	/** Label of the pot's code name list */
	codeNameList: string;
	/** One per code name in the pot's list */
	maxParticipants: number;
	potUrl: string;
	adminUrl: string;
	adminPath: string;
	isNew: boolean;
	closed: boolean;
	participants: Participant[];
	exclusions: Exclusion[];
	drawPossible: boolean;
	error?: string;
	result?: ResultRow[];
}

/** mailto: link that opens the organiser's mail app with both links, so they can't get lost. */
function linksMail(potUrl: string, adminUrl: string): string {
	const subject = 'Mein Wichteltopf';
	const body = `Teilnahme-Link (an alle Wichtel verschicken):\n${potUrl}\n\nAdmin-Link (geheim, nur für mich):\n${adminUrl}\n`;
	return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The title form: open while there is no title, folded behind a link once there is one. */
function titleForm({ title, adminPath }: AdminPageProps): Html {
	return html`<details class="title-form"${title ? '' : ' open'}>
		<summary>${icon('pencil', 16)}${title ? 'Titel ändern' : 'Titel setzen'}</summary>
		${title ? '' : html`<p class="aside">Gib dem Topf einen Titel, damit niemand ihn mit einem anderen verwechselt. Er steht auf allen Seiten und in der Vorschau, wenn du den Link verschickst.</p>`}
		<form method="post" action="${adminPath}/titel">
			<div class="field">
				<label for="title">Titel des Topfs</label>
				<input type="text" id="title" name="title" value="${title}" maxlength="${MAX_TITLE_LENGTH}" placeholder="z. B. Familie Müller 2026" autocomplete="off">
			</div>
			<button type="submit" class="secondary">Titel speichern</button>
		</form>
	</details>`;
}

const METER_SEGMENTS = 8;

/** How full the pot is, and the draw: the organiser's main concern, so it comes first. */
function status(props: AdminPageProps): Html {
	const { participants, maxParticipants, adminPath } = props;
	const filled =
		participants.length === 0 ? 0 : Math.max(1, Math.round((participants.length / maxParticipants) * METER_SEGMENTS));
	return html`<section class="status">
		<div class="count">
			<span class="n">${participants.length}</span>
			<span><b>Wichtel im Topf</b><br><span class="aside">Codenamen: ${props.codeNameList} · Platz für ${maxParticipants}</span></span>
		</div>
		<div class="meter" aria-hidden="true">${Array.from({ length: METER_SEGMENTS }, (_, i) => html`<span${i < filled ? ' class="on"' : ''}></span>`)}</div>
		${
			participants.length < MIN_PARTICIPANTS
				? html`<p>Zum Auslosen braucht es mindestens ${MIN_PARTICIPANTS} Wichtel. Verschicke den Teilnahme-Link!</p>`
				: !props.drawPossible
					? html`<p class="error">Mit diesen Ausschlüssen ist keine Auslosung möglich. Bitte entferne einen Ausschluss.</p>`
					: html`<p>Sind alle dabei? Dann los. Danach kann niemand mehr dazukommen.</p>
			<form method="post" action="${adminPath}/schliessen" data-confirm="Topf jetzt wirklich schließen und auslosen?">
				<button type="submit">Topf schließen und auslosen</button>
			</form>`
		}
	</section>`;
}

export function adminPage(props: AdminPageProps): Html {
	const { participants, exclusions, adminPath } = props;
	const nameOf = new Map(participants.map((p) => [p.id, p.name]));
	const options = (selected: number) =>
		participants.map((p, i) => html`<option value="${p.id}" ${i === selected ? 'selected' : ''}>${p.name}</option>`);
	const mailLink = html`<p class="center"><a class="button link" href="${linksMail(props.potUrl, props.adminUrl)}">Beide Links an mich mailen →</a></p>`;

	return layout(
		props.page,
		'Admin',
		html`<h1>${props.isNew ? 'Wichteltopf angelegt 🎉' : 'Dein Wichteltopf'}</h1>
		${props.error ? html`<p class="error" role="alert">${props.error}</p>` : ''}
		${titleForm(props)}
		${
			props.newLink
				? html`<section class="notice">
			<h2>Neuer Link für ${props.newLink.name}</h2>
			<p>Der alte Link funktioniert nicht mehr. Schick diesen Link nur an ${props.newLink.name}, nicht an alle.</p>
			${copyField(`Persönlicher Link für ${props.newLink.name}`, props.newLink.url, {
				share: { label: 'Teilen', text: 'Dein neuer persönlicher Wichtel-Link (nicht weitergeben):' },
				secret: true,
			})}
		</section>`
				: ''
		}

		${
			props.closed
				? html`<section class="status">
			<h2>Die Ziehung ist abgeschlossen</h2>
			<p>Sag jetzt allen Bescheid: Schick den Teilnahme-Link noch einmal herum. Mit ihm und dem eigenen Codenamen findet jede Person ihr Ergebnis, auch ohne persönlichen Link.</p>
			${copyField('Teilnahme-Link: an alle Wichtel verschicken', props.potUrl, {
				share: { label: 'Teilen', text: 'Die Auslosung ist fertig! Öffne den Link und such deinen Codenamen:' },
			})}
		</section>
		${resultList(props.result ?? [])}
		<h2>Dein Admin-Link</h2>
		${copyField('Admin-Link: geheim! Nur damit kannst du den Topf verwalten.', props.adminUrl, { secret: true })}
		${mailLink}`
				: html`${status(props)}

		<h2>Links</h2>
		<p class="aside">Bitte speichere dir beide Links gut ab.</p>
		${copyField('Teilnahme-Link: an alle Wichtel verschicken', props.potUrl, {
			share: { label: 'Teilen', text: 'Wir wichteln! Wirf hier deinen Namen in den Wichteltopf:' },
		})}
		${copyField('Admin-Link: geheim! Nur damit kannst du den Topf verwalten und schließen.', props.adminUrl, { secret: true })}
		${mailLink}

		<h2>Im Topf</h2>
		${
			participants.length === 0
				? html`<p>Noch niemand. Verschicke den Teilnahme-Link!</p>`
				: html`<ul class="list">
			${participants.map(
				(p) => html`<li>
					<span>${p.name}</span>
					<span class="row-actions">
						<form method="post" action="${adminPath}/neuer-link" data-confirm="Neuen Link für ${p.name} erzeugen? Der alte funktioniert dann nicht mehr.">
							<input type="hidden" name="participant" value="${p.id}">
							<button type="submit" class="link quiet">Neuer Link</button>
						</form>
						<form method="post" action="${adminPath}/entfernen" data-confirm="${p.name} wirklich aus dem Topf entfernen?">
							<input type="hidden" name="participant" value="${p.id}">
							<button type="submit" class="icon" aria-label="${p.name} entfernen">×</button>
						</form>
					</span>
				</li>`,
			)}
		</ul>`
		}
		<a class="add" href="${props.potUrl}">Selbst mitmachen</a>
		<p class="aside">Du trägst dich wie alle anderen über den Teilnahme-Link ein. Als Admin siehst du nicht, wer welchen Codenamen hat. Vertippt? Entferne die Person, sie trägt sich neu ein. Link verloren? Ein neuer Link ersetzt den alten, der Codename bleibt.</p>

		<h2>Ausschlüsse</h2>
		<p class="aside">Wer soll sich nicht gegenseitig ziehen, z.&nbsp;B. Paare?</p>
		${
			exclusions.length > 0
				? html`<div class="chips">
			${exclusions.map(
				(e) => html`<span class="chip">${nameOf.get(e.a)} ⟷ ${nameOf.get(e.b)}
					<form method="post" action="${adminPath}/ausschluss-entfernen">
						<input type="hidden" name="a" value="${e.a}">
						<input type="hidden" name="b" value="${e.b}">
						<button type="submit" class="icon" aria-label="Ausschluss ${nameOf.get(e.a)} und ${nameOf.get(e.b)} entfernen">×</button>
					</form>
				</span>`,
			)}
		</div>`
				: ''
		}
		${
			participants.length >= 2
				? html`<form method="post" action="${adminPath}/ausschluss" class="pair">
			<select name="a" required aria-label="Erste Person">${options(0)}</select>
			<select name="b" required aria-label="Zweite Person">${options(1)}</select>
			<button type="submit" class="secondary">Hinzufügen</button>
		</form>`
				: html`<p class="aside">Sobald zwei Personen im Topf sind, kannst du Paare ausschließen.</p>`
		}`
		}

		<div class="row dashed">
			<p>Löscht alle Namen${props.closed ? ' und das Ergebnis' : ''} endgültig. Wenn sich nichts mehr ändert, wird der Topf am ${props.deletion} automatisch gelöscht.</p>
			<form method="post" action="${adminPath}/loeschen" data-confirm="Den Wichteltopf mit allen Namen endgültig löschen?">
				<button type="submit" class="link">Topf löschen</button>
			</form>
		</div>`,
	);
}
