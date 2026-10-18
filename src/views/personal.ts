// A participant's own page: the code name before the draw, whom to give a present to after it.
import { html } from 'hono/html';
import type { Participant } from '../store.ts';
import { type Html, layout, type Page } from './layout.ts';
import { copyField, giftTag, type ResultRow, resultList } from './parts.ts';

export interface PersonalPageProps {
	page: Page;
	participant: Participant;
	personalPath: string;
	personalUrl: string;
	isNew: boolean;
	/** Set once the pot is closed. */
	result?: ResultRow[];
}

/** mailto: link with the personal link, to keep it in the participant's own mailbox */
function personalMail(personalUrl: string): string {
	const subject = 'Mein Wichtel-Link';
	const body = `Mein persönlicher Wichtel-Link (nicht weitergeben):\n${personalUrl}\n`;
	return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A participant's own page, reachable via their personal link from any device. */
export function personalPage({ page, participant, personalPath, personalUrl, isNew, result }: PersonalPageProps): Html {
	if (result) {
		const mine = result.find((r) => r.codeName === participant.codeName);
		return layout(
			page,
			'Ergebnis',
			html`<h1>Die Ziehung ist abgeschlossen</h1>
			<p>Hallo ${participant.name}! Du beschenkst:</p>
			${
				mine
					? giftTag([
							['Von:', participant.codeName],
							['Für:', mine.receiver],
						])
					: ''
			}
			<h2>Alle Ergebnisse</h2>
			${resultList(result, participant.codeName)}`,
		);
	}
	return layout(
		page,
		'Du bist dabei',
		html`<h1>${isNew ? 'Schön, dass du mitmachst!' : 'Du bist dabei'}</h1>
		<p>Du bist als <b>${participant.name}</b> im Topf. Dein geheimer Codename lautet:</p>
		${giftTag([['Von:', participant.codeName]])}
		<p>Verrate ihn niemandem! Nach der Auslosung steht hier, für wen dein Geschenk ist.</p>
		<h2>Dein persönlicher Link</h2>
		<p>Mit diesem Link siehst du jederzeit deinen Codenamen und nach der Auslosung, wen du beschenkst, auch auf einem anderen Gerät. Setz dir am besten ein Lesezeichen oder schick ihn dir selbst. Gib ihn nicht weiter.</p>
		${copyField('Persönlicher Link: nur für dich', personalUrl, {
			share: { label: 'Speichern', text: 'Mein persönlicher Wichtel-Link (nicht weitergeben):' },
			extra: html`<a class="button secondary" href="${personalMail(personalUrl)}">An mich mailen</a>`,
		})}

		<h2>Doch nicht dabei?</h2>
		<p>Bis zur Auslosung kannst du dich wieder austragen. Dein Name wird dann gelöscht.</p>
		<form method="post" action="${personalPath}/austragen" data-confirm="Wirklich aus dem Wichteltopf austragen?">
			<button type="submit" class="secondary">Mich austragen</button>
		</form>`,
	);
}
