// Building blocks used on several pages.
import { html, raw } from 'hono/html';
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

/** Line icons (24px grid), drawn inline so they take the text color; decorative, hidden from screen readers. */
const ICON_PATHS = {
	lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
	pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
	eyeOff:
		'<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10 10 0 0 1 21 12a10.5 10.5 0 0 1-2.1 3"/><path d="M6.6 6.6A10.6 10.6 0 0 0 3 12c1.7 3.7 5 6 9 6a9 9 0 0 0 3.4-.7"/>',
	list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
	person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
};

export function icon(name: keyof typeof ICON_PATHS, size = 20, className = ''): Html {
	return html`<svg${className ? html` class="${className}"` : ''} aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentcolor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${raw(ICON_PATHS[name])}</svg>`;
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
	/** A sentence below the address, e.g. what to do with it */
	hint?: string;
}

/** A link to hand on: a small card with the address, a copy button, and optionally share and further actions. */
export function copyField(label: string, url: string, { share, extra, secret, hint }: CopyFieldOptions = {}): Html {
	return html`<div class="copy${secret ? ' secret' : ''}">
		<label><span class="label">${secret ? icon('lock', 18, 'lock') : ''}${label}</span><input type="text" readonly value="${url}"></label>
		${hint ? html`<p class="aside">${hint}</p>` : ''}
		<div class="actions">
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
