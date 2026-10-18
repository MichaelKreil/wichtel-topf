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
			<p>Unterschreib das Geschenk nicht mit deinem Namen, damit geheim bleibt, von wem es kommt.</p>
			<h2>Alle Ergebnisse</h2>
			${resultList(result, participant.codeName)}`,
		);
	}
	return layout(
		page,
		'Du bist dabei',
		html`<h1>${isNew ? 'Schön, dass du mitmachst!' : 'Du bist dabei'}</h1>
		<p>Du bist als <b>${participant.name}</b> im Topf. Merke dir deinen geheimen Codenamen:</p>
		${giftTag([['Von:', participant.codeName]], { emphasize: 0 })}
		<p>Mach am besten ein Foto von dieser Seite. Nach der Auslosung findest du mit dem Codenamen in der Liste, wen du beschenkst. Verrate ihn niemandem: Wer deinen Codenamen kennt, weiß nachher, von wem das Geschenk kommt.</p>
		<h2>Diese Seite merken</h2>
		<p>Diese Seite gehört nur dir, und dieser Browser merkt sie sich. Auf einem anderen Gerät kommst du mit ihrer Adresse wieder hierher. Gib sie nicht weiter.</p>
		${copyField('Adresse dieser Seite: nur für dich', personalUrl, {
			share: { label: 'Speichern', text: 'Mein persönlicher Wichtel-Link (nicht weitergeben):' },
			secret: true,
			extra: html`<a class="button secondary" href="${personalMail(personalUrl)}">An mich mailen</a>`,
		})}

		<h2>Doch nicht dabei?</h2>
		<p>Bis zur Auslosung kannst du dich wieder austragen. Dein Name wird dann gelöscht.</p>
		<form method="post" action="${personalPath}/austragen" data-confirm="Wirklich aus dem Wichteltopf austragen?">
			<button type="submit" class="secondary">Mich austragen</button>
		</form>`,
	);
}
