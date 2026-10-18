// Privacy policy and legal notice.
import { html } from 'hono/html';
import { OPERATOR } from '../operator.ts';
import { type Html, layout, type Page } from './layout.ts';

export function privacyPage(page: Page, ttlDays: number): Html {
	return layout(
		page,
		'Datenschutz',
		html`<h1>Datenschutzerklärung</h1>

		<h2>Verantwortlich</h2>
		<p>
			${OPERATOR.name}<br>
			${OPERATOR.address.map((line) => html`${line}<br>`)}
			E-Mail: <a href="mailto:${OPERATOR.email}">${OPERATOR.email}</a>
		</p>

		<h2>Welche Daten wir speichern</h2>
		<ul>
			<li><b>Wichteltopf:</b> der Titel, falls einer eingegeben wurde, das gewählte Design, Zeitpunkte von Erstellung und letzter Änderung sowie die geheimen Links.</li>
			<li><b>Teilnehmende:</b> der eingegebene Name, der zugeloste Codename und nach der Auslosung, wer wen beschenkt.</li>
			<li><b>Ausschlüsse:</b> welche Teilnehmenden sich nicht gegenseitig ziehen sollen, festgelegt von der Person, die den Topf verwaltet.</li>
		</ul>
		<p>Es gibt keine Anmeldung, kein Tracking, keine Analyse-Werkzeuge und keine eingebundenen Inhalte Dritter.</p>

		<h2>Wer die Daten sieht</h2>
		<p>Wer den Teilnahme-Link hat, sieht die Namen aller Teilnehmenden und nach der Auslosung die Liste „Codename beschenkt Name“. Wer den Admin-Link hat, sieht zusätzlich die Ausschlüsse, aber nicht, wer welchen Codenamen hat. Den eigenen Codenamen sieht nur, wer den persönlichen Link hat.</p>

		<h2>Cookie</h2>
		<p>Nach dem Eintragen speichern wir ein Cookie mit deinem persönlichen Zugangsschlüssel, damit dich der Teilnahme-Link wiedererkennt. Es ist für diese Funktion technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG) und wird nach einem Jahr oder beim Austragen gelöscht.</p>

		<h2>IP-Adressen</h2>
		<p>Zum Schutz vor Missbrauch wird die IP-Adresse beim Absenden eines Formulars für eine Minute zur Begrenzung der Anfragen verwendet. Wir speichern keine Zugriffsprotokolle mit IP-Adressen.</p>

		<h2>Zweck und Rechtsgrundlage</h2>
		<p>Die Daten werden nur verarbeitet, um das Wichteln durchzuführen (Art. 6 Abs. 1 lit. b DSGVO), und zum Schutz des Dienstes vor Missbrauch (Art. 6 Abs. 1 lit. f DSGVO).</p>

		<h2>Hosting</h2>
		<p>Die Seite läuft bei Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA, im Rahmen einer Auftragsverarbeitung (Art. 28 DSGVO). Die Datenbank liegt in der EU. Beim Ausliefern der Seite verarbeitet Cloudflare technisch bedingt auch IP-Adressen; für Übermittlungen in die USA stützt sich Cloudflare auf das EU-U.S. Data Privacy Framework und Standardvertragsklauseln.</p>

		<h2>Speicherdauer</h2>
		<p>Wichteltöpfe werden ${ttlDays} Tage nach der letzten Änderung automatisch gelöscht. Die Person mit dem Admin-Link kann den Topf jederzeit vorher löschen. Teilnehmende können sich bis zur Auslosung über ihren persönlichen Link selbst austragen. Gelöschte Daten können noch bis zu 7 Tage in Sicherungskopien enthalten sein.</p>

		<h2>Deine Rechte</h2>
		<p>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung, auf Widerspruch und auf Datenübertragbarkeit. Wende dich dafür an die oben genannte E-Mail-Adresse. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren.</p>

		<p>Stand: Oktober 2026</p>`,
		{ index: true, description: 'Welche Daten der Wichteltopf speichert und wie lange.' },
	);
}
