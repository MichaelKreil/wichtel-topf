// The page behind the participation link: join the pot with your name.
import { html } from 'hono/html';
import { MAX_NAME_LENGTH, type Participant } from '../store.ts';
import { type Html, layout, type Page } from './layout.ts';
import { joinNames } from './parts.ts';

export interface PotPageProps {
	page: Page;
	potPath: string;
	participants: Participant[];
	error?: string;
}

export function potPage({ page, potPath, participants, error }: PotPageProps): Html {
	const names = participants.map((p) => p.name);
	return layout(
		page,
		'Mach mit beim Wichteln!',
		html`<h1>Wichteltopf</h1>
		${
			names.length === 0
				? html`<p>Noch ist niemand im Topf. Mach den Anfang!</p>`
				: html`<p>${joinNames(names)} ${names.length === 1 ? 'macht' : 'machen'} bereits mit.</p>`
		}
		<form method="post" action="${potPath}">
			${error ? html`<p class="error" role="alert">${error}</p>` : ''}
			<h2><label for="name">Dein Vor- und Nachname</label></h2>
			<input type="text" id="name" name="name" maxlength="${MAX_NAME_LENGTH}" autocomplete="name" required>
			<button type="submit">Mitmachen</button>
		</form>`,
		{ description: 'Wirf deinen Namen in den Wichteltopf und bekomme deinen geheimen Codenamen.' },
	);
}
