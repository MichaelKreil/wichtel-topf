// The organiser's page, reachable only via the secret admin link.
import { html } from 'hono/html';
import { type Exclusion, MAX_TITLE_LENGTH, MIN_PARTICIPANTS, type Participant } from '../store.ts';
import { type Html, layout, type Page } from './layout.ts';
import { copyField, type ResultRow, resultList } from './parts.ts';

export interface AdminPageProps {
	page: Page;
	/** The pot's title, empty if none */
	title: string;
	/** A personal link the organiser just re-issued, to hand over to that participant */
	newLink?: { name: string; url: string };
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

/** Sets the title; without one, the form asks for it, with one it's folded away. */
function titleForm({ title, adminPath }: AdminPageProps): Html {
	const form = html`<form method="post" action="${adminPath}/titel">
		<label for="title">Titel des Topfs</label>
		<input type="text" id="title" name="title" value="${title}" maxlength="${MAX_TITLE_LENGTH}" placeholder="z. B. Familie Müller 2026" autocomplete="off">
		<button type="submit" class="secondary">Titel speichern</button>
	</form>`;
	return title
		? html`<details class="title-form">
		<summary>Titel ändern</summary>
		${form}
	</details>`
		: html`<section class="title-form">
		<p>Gib dem Topf einen Titel, damit niemand ihn mit einem anderen verwechselt. Er steht auf allen Seiten und in der Vorschau, wenn du den Link verschickst.</p>
		${form}
	</section>`;
}

export function adminPage(props: AdminPageProps): Html {
	const { participants, exclusions, adminPath } = props;
	const nameOf = new Map(participants.map((p) => [p.id, p.name]));
	const options = (selected: number) =>
		participants.map((p, i) => html`<option value="${p.id}" ${i === selected ? 'selected' : ''}>${p.name}</option>`);

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
			})}
		</section>`
				: ''
		}

		<section>
			<p>Bitte speichere dir beide Links gut ab.</p>
			${copyField('Teilnahme-Link: an alle Wichtel verschicken', props.potUrl, {
				share: { label: 'Teilen', text: 'Wir wichteln! Wirf hier deinen Namen in den Wichteltopf:' },
			})}
			${copyField('Admin-Link: geheim! Nur damit kannst du den Topf verwalten und schließen.', props.adminUrl)}
			<a class="button secondary" href="${linksMail(props.potUrl, props.adminUrl)}">Links an mich mailen</a>
		</section>

		${
			props.closed
				? html`<h2>Die Ziehung ist abgeschlossen</h2>${resultList(props.result ?? [])}`
				: html`
		<section>
			<h2>Im Topf (${participants.length} von max. ${props.maxParticipants})</h2>
			${
				participants.length === 0
					? html`<p>Noch niemand. Verschicke den Teilnahme-Link!</p>`
					: html`<ul class="list">
				${participants.map(
					(p) => html`<li>
						<span>${p.name}</span>
						<span class="actions">
							<form method="post" action="${adminPath}/neuer-link" data-confirm="Neuen Link für ${p.name} erzeugen? Der alte funktioniert dann nicht mehr.">
								<input type="hidden" name="participant" value="${p.id}">
								<button type="submit" class="small secondary">Neuer Link</button>
							</form>
							<form method="post" action="${adminPath}/entfernen" data-confirm="${p.name} wirklich aus dem Topf entfernen?">
								<input type="hidden" name="participant" value="${p.id}">
								<button type="submit" class="small secondary">Entfernen</button>
							</form>
						</span>
					</li>`,
				)}
			</ul>
			<p class="aside">Vertippt? Entferne die Person, sie trägt sich neu ein. Link verloren? Ein neuer Link ersetzt den alten, der Codename bleibt. Beides geht nur bis zur Auslosung.</p>`
			}
		</section>

		<section>
			<h2>Ausschlüsse</h2>
			<p>Wer soll sich nicht gegenseitig ziehen, z.&nbsp;B. Paare?</p>
			${
				exclusions.length > 0
					? html`<ul class="list">
				${exclusions.map(
					(e) => html`<li>
						<span>${nameOf.get(e.a)} ⟷ ${nameOf.get(e.b)}</span>
						<form method="post" action="${adminPath}/ausschluss-entfernen">
							<input type="hidden" name="a" value="${e.a}">
							<input type="hidden" name="b" value="${e.b}">
							<button type="submit" class="small secondary">Entfernen</button>
						</form>
					</li>`,
				)}
			</ul>`
					: ''
			}
			${
				participants.length >= 2
					? html`<form method="post" action="${adminPath}/ausschluss" class="pair">
				<select name="a" required aria-label="Erste Person">${options(0)}</select>
				<span>⟷</span>
				<select name="b" required aria-label="Zweite Person">${options(1)}</select>
				<button type="submit" class="secondary">Hinzufügen</button>
			</form>`
					: ''
			}
		</section>

		<section>
			<h2>Topf schließen und auslosen</h2>
			${
				participants.length < MIN_PARTICIPANTS
					? html`<p>Zum Auslosen braucht es mindestens ${MIN_PARTICIPANTS} Wichtel.</p>`
					: !props.drawPossible
						? html`<p class="error">Mit diesen Ausschlüssen ist keine Auslosung möglich. Bitte entferne einen Ausschluss.</p>`
						: html`<p>Danach können keine weiteren Wichtel mehr mitmachen.</p>
			<form method="post" action="${adminPath}/schliessen" data-confirm="Topf jetzt wirklich schließen und auslosen?">
				<button type="submit">Topf schließen und auslosen</button>
			</form>`
			}
		</section>`
		}

		<section>
			<h2>Topf löschen</h2>
			<p>Löscht alle Namen${props.closed ? ' und das Ergebnis' : ''} endgültig. Ungenutzte Töpfe werden nach 90 Tagen automatisch gelöscht.</p>
			<form method="post" action="${adminPath}/loeschen" data-confirm="Den Wichteltopf mit allen Namen endgültig löschen?">
				<button type="submit" class="secondary">Topf löschen</button>
			</form>
		</section>`,
	);
}
