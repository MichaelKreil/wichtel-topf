// The page behind the participation link: join the pot with your name.
import { html } from 'hono/html';
import { MAX_NAME_LENGTH, type Participant } from '../store.ts';
import { type Html, layout, type Page } from './layout.ts';
import { joinNames } from './parts.ts';

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
		html`<h1>Wichteltopf</h1>
		${
			names.length === 0
				? html`<p>Noch ist niemand im Topf. Mach den Anfang!</p>`
				: html`<p>${joinNames(names)} ${names.length === 1 ? 'macht' : 'machen'} bereits mit.</p>`
		}
		${
			me
				? html`<section>
			<h2>Du bist als ${me.name} dabei</h2>
			<p>Dieser Browser hat sich deinen Zugang gemerkt.</p>
			<a class="button" href="${me.personalPath}">Zu deiner Seite</a>
		</section>
		<section>
			<h2>Nicht ${me.name}?</h2>
			<p>Dann vergisst dieser Browser den Zugang, und du kannst dich eintragen. ${me.name} kommt mit dem persönlichen Link jederzeit wieder auf die eigene Seite.</p>
			<form method="post" action="${potPath}/wechseln">
				<button type="submit" class="secondary">Jemand anderen eintragen</button>
			</form>
		</section>`
				: html`<form method="post" action="${potPath}">
			${error ? html`<p class="error" role="alert">${error}</p>` : ''}
			<h2><label for="name">Dein Vor- und Nachname</label></h2>
			<input type="text" id="name" name="name" maxlength="${MAX_NAME_LENGTH}" autocomplete="name" required>
			<button type="submit">Mitmachen</button>
		</form>`
		}`,
		{ description: 'Wirf deinen Namen in den Wichteltopf und bekomme deinen geheimen Codenamen.' },
	);
}
