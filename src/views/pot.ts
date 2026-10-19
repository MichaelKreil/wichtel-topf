// The page behind the participation link: join the pot with your name.
import { html } from 'hono/html';
import { MAX_NAME_LENGTH, type Participant } from '../store.ts';
import { type Html, layout, type Page } from './layout.ts';
import { icon, joinNames } from './parts.ts';

/** The participant this browser remembers, if any */
export interface KnownParticipant {
	name: string;
	personalPath: string;
}

export interface PotPageProps {
	page: Page;
	potPath: string;
	participants: Participant[];
	me?: KnownParticipant;
	error?: string;
}

export function potPage({ page, potPath, participants, me, error }: PotPageProps): Html {
	const names = participants.map((p) => p.name);
	return layout(
		page,
		'Mitmachen',
		html`<h1>Mach mit beim Wichteln!</h1>
		${
			names.length === 0
				? html`<p>Noch ist niemand im Topf. Mach den Anfang!</p>`
				: html`<p class="eyebrow">Schon im Topf · ${names.length}</p>
		<p>${joinNames(names)} ${names.length === 1 ? 'macht' : 'machen'} bereits mit.</p>`
		}
		${
			me
				? html`<h2>Du bist als ${me.name} dabei</h2>
			<p>Dieser Browser hat sich deinen Zugang gemerkt.</p>
			<a class="button" href="${me.personalPath}">Zu deiner Seite</a>
			<div class="row">
				${icon('person', 22)}
				<span>Nicht ${me.name}? Dann vergisst dieser Browser den Zugang, und du kannst dich eintragen. ${me.name} kommt mit dem persönlichen Link jederzeit wieder auf die eigene Seite.</span>
				<form method="post" action="${potPath}/wechseln">
					<button type="submit" class="link">Jemand anderen eintragen</button>
				</form>
			</div>`
				: html`<form method="post" action="${potPath}">
			${error ? html`<p class="error" role="alert">${error}</p>` : ''}
			<div class="field">
				<label for="name">Dein Vor- und Nachname</label>
				<input type="text" id="name" name="name" maxlength="${MAX_NAME_LENGTH}" autocomplete="name" required>
				<p class="aside">So wie die anderen dich kennen, damit das Geschenk ankommt.</p>
			</div>
			<button type="submit" class="large">Mitmachen</button>
			<p class="aside center">Du bekommst sofort deinen geheimen Codenamen.</p>
		</form>`
		}`,
		{ description: 'Wirf deinen Namen in den Wichteltopf und bekomme deinen geheimen Codenamen.' },
	);
}
