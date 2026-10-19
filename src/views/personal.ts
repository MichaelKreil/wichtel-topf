// A participant's own page: the code name before the draw, whom to give a present to after it.
import { html } from 'hono/html';
import type { Participant } from '../store.ts';
import { type Html, layout, type Page } from './layout.ts';
import { copyField, giftTag, icon, type ResultRow, resultList } from './parts.ts';

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
			'Meine Seite',
			html`<h1>Die Ziehung ist abgeschlossen</h1>
			<p>Hallo ${participant.name}! Du beschenkst:</p>
			<div class="showcase">
				${
					mine
						? giftTag(
								[
									['Von:', participant.codeName],
									['Für:', mine.receiver],
								],
								{ emphasize: 1 },
							)
						: ''
				}
				<p class="aside center">Unterschreib das Geschenk nicht mit deinem Namen, damit geheim bleibt, von wem es kommt.</p>
			</div>
			<h2>Alle Ergebnisse</h2>
			${resultList(result, participant.codeName)}`,
		);
	}
	return layout(
		page,
		'Meine Seite',
		html`<h1>${isNew ? 'Schön, dass du mitmachst!' : 'Du bist dabei'}</h1>
		<p>Du bist als <b>${participant.name}</b> im Topf. Das ist dein geheimer Codename:</p>
		<div class="showcase">
			${giftTag([['Von:', participant.codeName]], { emphasize: 0 })}
			<p class="eyebrow">Mach am besten ein Foto davon</p>
		</div>
		<ul class="rules">
			<li>${icon('eyeOff', 22)}<span><b>Verrate ihn niemandem.</b> Wer deinen Codenamen kennt, weiß nachher, von wem das Geschenk kommt.</span></li>
			<li>${icon('list', 22)}<span><b>Nach der Auslosung</b> findest du mit dem Codenamen in der Liste, wen du beschenkst.</span></li>
		</ul>
		${copyField('Nur für dich: die Adresse dieser Seite', personalUrl, {
			secret: true,
			hint: 'Setz dir ein Lesezeichen oder mail dir die Adresse, dann findest du sie auch auf einem anderen Gerät wieder. Gib sie nicht weiter.',
			extra: html`<a class="button secondary" href="${personalMail(personalUrl)}">An mich mailen</a>`,
		})}
		<form method="post" action="${personalPath}/austragen" class="center" data-confirm="Wirklich aus dem Wichteltopf austragen?">
			<span class="aside">Doch nicht dabei?</span>
			<button type="submit" class="link">Mich austragen</button>
		</form>`,
	);
}
