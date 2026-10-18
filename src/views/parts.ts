// Building blocks used on several pages.
import { html } from 'hono/html';
import type { Html } from './layout.ts';

export interface ResultRow {
	codeName: string;
	receiver: string;
}

/** "Anna", "Anna und Ben", "Anna, Ben und Carla" */
export function joinNames(names: string[]): string {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} und ${names.at(-1)}`;
}

/**
 * A paper gift tag with a punched hole and string, written by hand: the signature element.
 * Each line is a label ("Von:", "Für:") and a value.
 */
export function giftTag(lines: [string, string][]): Html {
	return html`<div class="tag">
		<div class="tag-paper">
			${lines.map(([label, value]) => html`<span class="tag-line"><span class="tag-label">${label}</span> <span class="tag-value">${value}</span></span>`)}
		</div>
	</div>`;
}

interface CopyFieldOptions {
	/** Opens the device's share sheet (only shown where there is one), with this text before the link */
	share?: { label: string; text: string };
	/** Further actions after the copy button */
	extra?: Html;
}

/** A link in a read-only field with a copy button, optionally with share and further actions. */
export function copyField(label: string, url: string, { share, extra }: CopyFieldOptions = {}): Html {
	return html`<div class="copy">
		<label>${label}<input type="text" readonly value="${url}"></label>
		<div class="copy-actions">
			${share ? html`<button type="button" data-share="${share.text}" hidden>${share.label}</button>` : ''}
			<button type="button" class="secondary" data-copy>Kopieren</button>
			${extra ?? ''}
		</div>
	</div>`;
}

/** All assignments as a handwritten note; the viewer's own row is highlighted. */
export function resultList(rows: ResultRow[], myCodeName?: string): Html {
	return html`<div class="note">
		<table>
			<thead>
				<tr><th scope="col">Von</th><th scope="col">Für</th></tr>
			</thead>
			<tbody>
				${rows.map((r) =>
					r.codeName === myCodeName
						? html`<tr><td><mark>${r.codeName}</mark></td><td><mark>${r.receiver}</mark></td></tr>`
						: html`<tr><td>${r.codeName}</td><td>${r.receiver}</td></tr>`,
				)}
			</tbody>
		</table>
	</div>`;
}
