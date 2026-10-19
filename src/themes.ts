import { pick } from './random.ts';

/** A background photo: assets/backgrounds/<id>.jpg, served as WebP from public/static/img (`npm run images`). */
export interface Theme {
	id: string;
	/** Shown as alternative text in the picker */
	label: string;
	/** Average color of the photo: shown while it loads, and as the browser bar color */
	color: string;
	/** Light tint of the photo's main color for the content card, so dark text stays readable */
	card: string;
	/** Where the card sits on wide screens, so the photo's motif stays visible */
	align: 'left' | 'center';
	/** What the photo fits, for the filter in the picker */
	tags: readonly TagId[];
}

/** Background tags in the order of the picker's filter */
export const TAGS = [
	{ id: 'weihnachten', label: 'Weihnachten' },
	{ id: 'winter', label: 'Winter' },
	{ id: 'fruehling', label: 'Frühling' },
	{ id: 'sommer', label: 'Sommer' },
	{ id: 'herbst', label: 'Herbst' },
	{ id: 'feier', label: 'Feier' },
	{ id: 'waldtiere', label: 'Waldtiere' },
	{ id: 'maerchen', label: 'Märchen & Fantasy' },
	{ id: 'forschung', label: 'Forschung' },
	{ id: 'musik', label: 'Musik' },
	{ id: 'weltraum', label: 'Weltraum' },
] as const;

export type TagId = (typeof TAGS)[number]['id'];

export const THEMES: readonly Theme[] = [
	{
		id: 'bag',
		label: 'Geschenksack',
		color: '#dab8b9',
		card: '#fddedb',
		align: 'left',
		tags: ['weihnachten', 'winter'],
	},
	{ id: 'ball', label: 'Christbaumkugel', color: '#8f5d43', card: '#fbe0d3', align: 'left', tags: ['weihnachten'] },
	{ id: 'candle', label: 'Kerzenschein', color: '#53260c', card: '#fbe0d2', align: 'left', tags: ['weihnachten'] },
	{
		id: 'christmas1',
		label: 'Rote Kugeln im Schnee',
		color: '#92b0bd',
		card: '#dfe8ed',
		align: 'left',
		tags: ['weihnachten', 'winter'],
	},
	{
		id: 'christmas2',
		label: 'Hängende Kugeln',
		color: '#a9c5dc',
		card: '#d7e8fe',
		align: 'left',
		tags: ['weihnachten', 'winter'],
	},
	{
		id: 'christmas3',
		label: 'Roter Sternenbaum',
		color: '#8a1b14',
		card: '#fdded9',
		align: 'left',
		tags: ['weihnachten'],
	},
	{ id: 'decoration', label: 'Strohsterne', color: '#c2bfbb', card: '#ebe5de', align: 'left', tags: ['weihnachten'] },
	{ id: 'gift1', label: 'Kleine Päckchen', color: '#cdced0', card: '#ece5de', align: 'left', tags: ['weihnachten'] },
	{ id: 'gift2', label: 'Blaues Geschenk', color: '#c7ddf4', card: '#d6e8fe', align: 'left', tags: ['feier'] },
	{
		id: 'gift3',
		label: 'Schwarzes Geschenk',
		color: '#c2b9b3',
		card: '#ece5de',
		align: 'left',
		tags: ['weihnachten', 'winter'],
	},
	{ id: 'santa', label: 'Weihnachtsmann', color: '#e9b970', card: '#f5e3cd', align: 'left', tags: ['weihnachten'] },
	{ id: 'silver', label: 'Silberglanz', color: '#d1d1d1', card: '#ebe4eb', align: 'center', tags: ['winter'] },
	{ id: 'snow1', label: 'Glitzerschnee', color: '#dad4d2', card: '#eee4e1', align: 'center', tags: ['winter'] },
	{ id: 'snow2', label: 'Schneedünen', color: '#e8e7e6', card: '#e8e6dd', align: 'center', tags: ['winter'] },
	{ id: 'snow3', label: 'Pulverschnee', color: '#e8e9ee', card: '#e2e6ef', align: 'center', tags: ['winter'] },
	{ id: 'snowfall', label: 'Schneegestöber', color: '#b09aaa', card: '#f2dff4', align: 'center', tags: ['winter'] },
	{ id: 'snowflake', label: 'Schneeflocke', color: '#7d8d9e', card: '#e0e7ee', align: 'left', tags: ['winter'] },
	{
		id: 'snowman',
		label: 'Schneemann',
		color: '#7e98af',
		card: '#d5e9fd',
		align: 'left',
		tags: ['winter', 'weihnachten'],
	},
	{ id: 'tree1', label: 'Weihnachtsbaum', color: '#751f17', card: '#fdded8', align: 'left', tags: ['weihnachten'] },
	{ id: 'tree2', label: 'Verschneite Tanne', color: '#9da0a4', card: '#e2e6ee', align: 'left', tags: ['winter'] },
	{ id: 'tree3', label: 'Lichterbaum', color: '#ae1c15', card: '#fdded8', align: 'left', tags: ['weihnachten'] },
	{ id: 'tree4', label: 'Winterwald', color: '#c5bfb0', card: '#e9e6dd', align: 'left', tags: ['winter'] },
	{ id: 'tree5', label: 'Sternennacht', color: '#bccbd8', card: '#d5e9fd', align: 'left', tags: ['winter'] },
	{ id: 'tree6', label: 'Tannenzweig', color: '#99866d', card: '#f5e3cd', align: 'left', tags: ['weihnachten'] },
	{ id: 'tree7', label: 'Einsamer Baum', color: '#d3deeb', card: '#e1e7ee', align: 'left', tags: ['winter'] },
	{ id: 'tree8', label: 'Raureif', color: '#dee0e5', card: '#e2e6ee', align: 'left', tags: ['winter'] },
	{ id: 'tree9', label: 'Funkelbaum', color: '#cb5556', card: '#fddedb', align: 'left', tags: ['weihnachten'] },
	{ id: 'wood1', label: 'Dunkles Holz', color: '#59412e', card: '#f9e1d0', align: 'left', tags: ['weihnachten'] },
	{ id: 'wood2', label: 'Helles Holz', color: '#997c64', card: '#f8e1cf', align: 'left', tags: ['weihnachten'] },
	{ id: 'hare', label: 'Schneehase', color: '#a5acc0', card: '#e3e6ee', align: 'left', tags: ['waldtiere', 'winter'] },
	{
		id: 'hare-art',
		label: 'Schneehase, gemalt',
		color: '#b6b9cf',
		card: '#e4e5ee',
		align: 'left',
		tags: ['waldtiere', 'winter'],
	},
	{
		id: 'bunny-art',
		label: 'Häschen im Schnee, gemalt',
		color: '#b3bdd3',
		card: '#dbe7fe',
		align: 'left',
		tags: ['waldtiere', 'winter', 'weihnachten'],
	},
	{
		id: 'deer',
		label: 'Reh im Morgennebel',
		color: '#988c72',
		card: '#efe6cc',
		align: 'left',
		tags: ['waldtiere', 'fruehling'],
	},
	{
		id: 'deer-art',
		label: 'Reh im Morgennebel, gemalt',
		color: '#a79e8c',
		card: '#eae6dd',
		align: 'left',
		tags: ['waldtiere', 'fruehling'],
	},
	{
		id: 'fox',
		label: 'Schlafender Fuchs',
		color: '#715d28',
		card: '#f0e5cc',
		align: 'left',
		tags: ['waldtiere', 'herbst'],
	},
	{
		id: 'fox-art',
		label: 'Schlafender Fuchs, gemalt',
		color: '#a5905c',
		card: '#f1e5cc',
		align: 'left',
		tags: ['waldtiere', 'herbst'],
	},
	{ id: 'fairytale-forest', label: 'Zauberwald', color: '#35402e', card: '#deebd3', align: 'left', tags: ['maerchen'] },
	{
		id: 'fairytale-forest-art',
		label: 'Zauberwald, gemalt',
		color: '#75776c',
		card: '#e7e7de',
		align: 'left',
		tags: ['maerchen'],
	},
	{ id: 'castle', label: 'Märchenschloss', color: '#4b4a43', card: '#e8e6dd', align: 'left', tags: ['maerchen'] },
	{
		id: 'castle-art',
		label: 'Märchenschloss, gemalt',
		color: '#94978e',
		card: '#e6e7de',
		align: 'left',
		tags: ['maerchen', 'sommer'],
	},
	{ id: 'earth', label: 'Erde aus dem All', color: '#2a353f', card: '#e0e7ee', align: 'left', tags: ['weltraum'] },
	{
		id: 'earth-art',
		label: 'Erde aus dem All, gemalt',
		color: '#525860',
		card: '#e1e7ee',
		align: 'left',
		tags: ['weltraum'],
	},
	{
		id: 'nebula',
		label: 'Sternennebel mit Ringplanet',
		color: '#292d42',
		card: '#e0e5fe',
		align: 'left',
		tags: ['weltraum'],
	},
	{
		id: 'nebula-art',
		label: 'Sternennebel mit Ringplanet, gemalt',
		color: '#605f75',
		card: '#e6e5ee',
		align: 'left',
		tags: ['weltraum'],
	},
	{
		id: 'telescope',
		label: 'Teleskop unter Sternen',
		color: '#525865',
		card: '#e2e6ef',
		align: 'left',
		tags: ['forschung', 'weltraum', 'winter', 'weihnachten'],
	},
	{
		id: 'telescope-art',
		label: 'Teleskop unter Sternen, gemalt',
		color: '#6a7079',
		card: '#e1e7ee',
		align: 'left',
		tags: ['forschung', 'weltraum', 'winter'],
	},
	{
		id: 'lab',
		label: 'Labor',
		color: '#39332a',
		card: '#ece5de',
		align: 'left',
		tags: ['forschung', 'weihnachten'],
	},
	{
		id: 'lab-art',
		label: 'Labor, gemalt',
		color: '#7b6d64',
		card: '#ece5de',
		align: 'left',
		tags: ['forschung', 'winter', 'weihnachten'],
	},
	{
		id: 'violin',
		label: 'Geige auf dem Klavier',
		color: '#67513f',
		card: '#f9e1d0',
		align: 'left',
		tags: ['musik', 'weihnachten'],
	},
	{
		id: 'violin-art',
		label: 'Geige auf dem Klavier, gemalt',
		color: '#64533e',
		card: '#f6e3ce',
		align: 'left',
		tags: ['musik', 'winter', 'weihnachten'],
	},
	{ id: 'blossoms', label: 'Frühlingsblüten', color: '#9a9373', card: '#e8e8ce', align: 'left', tags: ['fruehling'] },
	{ id: 'summer-garden', label: 'Sommergarten', color: '#6b6938', card: '#e8e8ce', align: 'left', tags: ['sommer'] },
	{ id: 'autumn-table', label: 'Herbsttisch', color: '#8d795d', card: '#f4e4cd', align: 'left', tags: ['herbst'] },
	{ id: 'confetti', label: 'Konfetti', color: '#decbbe', card: '#ece5de', align: 'left', tags: ['feier'] },
	{ id: 'balloons', label: 'Luftballons', color: '#baceca', card: '#e1e9e2', align: 'left', tags: ['feier', 'sommer'] },
];

const byId = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id: unknown): Theme | undefined {
	return typeof id === 'string' ? byId.get(id) : undefined;
}

export function randomTheme(): Theme {
	return pick(THEMES);
}

/** A theme by id; unknown ids (e.g. of retired designs) get the first one. */
export function themeOrDefault(id: string): Theme {
	return byId.get(id) ?? (THEMES[0] as Theme);
}

/** Per-theme CSS variables. Written to public/static/themes.css by `npm run assets`. */
export function themesCss(): string {
	return THEMES.map(
		({ id, color, card, align }) =>
			`[data-theme="${id}"]{--paper-color:${color};--card:${card};--bg-sm:url(/static/img/bg/${id}-sm.webp);--bg-lg:url(/static/img/bg/${id}-lg.webp)${align === 'center' ? ';--card-start:auto' : ''}}`,
	).join('\n');
}
