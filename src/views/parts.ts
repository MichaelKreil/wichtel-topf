// Building blocks used on several pages.
import { html } from 'hono/html';
import type { Html } from './layout.ts';

export interface ResultRow {
	codeName: string;
	receiver: string;
}

const DAY = 24 * 60 * 60 * 1000;

/** "16.01.2027", in German time */
export function formatDate(ms: number): string {
	return new Intl.DateTimeFormat('de-DE', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		timeZone: 'Europe/Berlin',
	}).format(ms);
}

/** The day a pot last changed at `updatedAt` is deleted, if nothing changes any more */
export function deletionDate(updatedAt: number, ttlDays: number): string {
	return formatDate(updatedAt + ttlDays * DAY);
}

/** "Anna", "Anna und Ben", "Anna, Ben und Carla", each name written by hand */
export function joinNames(names: string[]): Html {
	const hand = (name: string) => html`<span class="hand">${name}</span>`;
	if (names.length <= 1) return html`${names.map(hand)}`;
	const last = names.at(-1) as string;
	return html`${names.slice(0, -1).map((name, i) => html`${i > 0 ? ', ' : ''}${hand(name)}`)} und ${hand(last)}`;
}

/**
 * A paper gift tag with a punched hole and string, written by hand: the signature element.
 * Each line is a label ("Von:", "Für:") and a value. `emphasize` is the index of a line whose value
 * is written in red ink, because it matters most (e.g. the code name to remember).
 */
export function giftTag(lines: [string, string][], { emphasize }: { emphasize?: number } = {}): Html {
	return html`<div class="tag">
		<div class="tag-paper">
			${lines.map(
				([label, value], i) =>
					html`<span class="tag-line"><span class="tag-label">${label}</span> <span class="tag-value${i === emphasize ? ' important' : ''}">${value}</span></span>`,
			)}
		</div>
	</div>`;
}

interface CopyFieldOptions {
	/** Opens the device's share sheet (only shown where there is one), with this text before the link */
	share?: { label: string; text: string };
	/** Further actions after the copy button */
	extra?: Html;
	/** A link meant for one person only: marked with a lock, so it isn't mixed up with the group link */
	secret?: boolean;
}

/** A link in a read-only field with a copy button, optionally with share and further actions. */
export function copyField(label: string, url: string, { share, extra, secret }: CopyFieldOptions = {}): Html {
	return html`<div class="copy${secret ? ' secret' : ''}">
		<label>${secret ? html`<span class="lock" aria-hidden="true">🔒</span> ` : ''}${label}<input type="text" readonly value="${url}"></label>
		<div class="copy-actions">
			${share ? html`<button type="button" data-share="${share.text}" hidden>${share.label}</button>` : ''}
			<button type="button" class="secondary" data-copy>Kopieren</button>
			${extra ?? ''}
		</div>
	</div>`;
}

/**
 * All assignments as a handwritten note; the viewer's own row is highlighted.
 * The arrow has its own column, so the "Für" heading sits above the names. Screen readers skip it.
 */
export function resultList(rows: ResultRow[], myCodeName?: string): Html {
	const arrow = html`<td class="arrow" aria-hidden="true">→</td>`;
	return html`<div class="note">
		<table>
			<thead>
				<tr><th scope="col">Von</th><td class="arrow"></td><th scope="col">Für</th></tr>
			</thead>
			<tbody>
				${rows.map((r) =>
					r.codeName === myCodeName
						? html`<tr><td><mark>${r.codeName}</mark></td>${arrow}<td><mark>${r.receiver}</mark></td></tr>`
						: html`<tr><td>${r.codeName}</td>${arrow}<td>${r.receiver}</td></tr>`,
				)}
			</tbody>
		</table>
	</div>`;
}
