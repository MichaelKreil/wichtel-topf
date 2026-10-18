import { createPot, expect, test } from './fixtures.ts';

test('an organiser and four participants go through a whole round', async ({ page, person }) => {
	// the organiser creates a pot
	await page.goto('/');
	await page.getByRole('radio', { name: /Waldtiere/ }).check();
	await expect(page.locator('[data-theme-filter]'), 'the list presets the photo filter').toHaveValue('waldtiere');
	const photo = page.locator('.theme:visible').nth(1);
	await photo.click();
	const theme = await photo.locator('input').inputValue();
	await expect(page.locator('body'), 'the page previews the photo').toHaveAttribute('data-theme', theme);
	await page.getByRole('button', { name: 'Wichteltopf anlegen' }).click();

	await expect(page.getByRole('heading', { name: /Wichteltopf angelegt/ })).toBeVisible();
	await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
	const potUrl = await page.getByLabel(/Teilnahme-Link/).inputValue();
	const adminUrl = page.url();

	// four people join
	const people = new Map<string, { page: typeof page; codeName: string }>();
	for (const name of ['Anna', 'Ben', 'Carla', 'Dora']) {
		const participant = await person();
		await participant.goto(potUrl);
		await participant.getByLabel('Dein Vor- und Nachname').fill(name);
		await participant.getByRole('button', { name: 'Mitmachen' }).click();
		await expect(participant.getByRole('heading', { name: 'Schön, dass du mitmachst!' })).toBeVisible();
		const codeName = (await participant.locator('.tag-value').first().textContent()) ?? '';
		expect(codeName).not.toBe('');
		people.set(name, { page: participant, codeName });
	}

	// the organiser sees them, excludes a couple and closes the pot
	await page.goto(adminUrl);
	await expect(page.getByRole('heading', { name: /Im Topf \(4 von/ })).toBeVisible();
	await page.getByLabel('Erste Person').selectOption({ label: 'Anna' });
	await page.getByLabel('Zweite Person').selectOption({ label: 'Ben' });
	await page.getByRole('button', { name: 'Hinzufügen' }).click();
	await expect(page.getByText('Anna ⟷ Ben')).toBeVisible();
	await page.getByRole('button', { name: 'Topf schließen und auslosen' }).click();
	const confirmation = page.getByRole('dialog');
	await expect(confirmation).toContainText('Topf jetzt wirklich schließen und auslosen?');
	await confirmation.getByRole('button', { name: 'Topf schließen und auslosen' }).click();
	await expect(page.getByRole('heading', { name: 'Die Ziehung ist abgeschlossen' })).toBeVisible();

	// everyone sees whom they give a present to, and the whole list with their own row marked
	const receiverOf = new Map<string, string>();
	for (const [name, { page: participant, codeName }] of people) {
		await participant.reload();
		await expect(participant.getByRole('heading', { name: 'Die Ziehung ist abgeschlossen' })).toBeVisible();
		const tag = participant.locator('.tag-value');
		await expect(tag.first()).toHaveText(codeName);
		const receiver = (await tag.nth(1).textContent()) ?? '';
		expect(receiver).not.toBe(name);
		receiverOf.set(name, receiver);
		await expect(participant.locator('.note tbody tr')).toHaveCount(4);
		await expect(participant.locator('.note mark').first()).toHaveText(codeName);
	}
	expect(receiverOf.get('Anna'), 'the exclusion is respected').not.toBe('Ben');
	expect(receiverOf.get('Ben'), 'the exclusion is respected').not.toBe('Anna');
	expect(new Set(receiverOf.values()).size, 'everyone gets a present').toBe(4);

	// anyone with the participation link sees the result, without a marked row
	const visitor = await person();
	await visitor.goto(potUrl);
	await expect(visitor.locator('.note tbody tr')).toHaveCount(4);
	await expect(visitor.locator('.note mark')).toHaveCount(0);
});

test('the photo filter shows photos by tag', async ({ page }) => {
	await page.goto('/');
	const filter = page.locator('[data-theme-filter]');
	await expect(filter, 'the filter appears with JavaScript').toBeVisible();
	const all = await page.locator('.theme').count();
	await expect(page.locator('.theme:visible')).toHaveCount(all);

	await filter.selectOption({ label: 'Weltraum' });
	const visible = page.locator('.theme:visible');
	expect(await visible.count()).toBeLessThan(all);
	for (const tags of await visible.evaluateAll((labels) => labels.map((l) => (l as HTMLElement).dataset.tags)))
		expect(tags).toContain('weltraum');
	// the chosen photo is one of the shown ones, and the page previews it
	const chosen = page.locator('input[name="theme"]:checked');
	expect(await chosen.evaluate((input) => input.closest('label')?.dataset.tags)).toContain('weltraum');
	await expect(page.locator('body')).toHaveAttribute('data-theme', await chosen.inputValue());

	await filter.selectOption({ label: 'alle Bilder' });
	await expect(page.locator('.theme:visible')).toHaveCount(all);
});

test('participants can leave before the draw, after confirming', async ({ page, person }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Wichteltopf anlegen' }).click();
	const potUrl = await page.getByLabel(/Teilnahme-Link/).inputValue();

	const anna = await person();
	await anna.goto(potUrl);
	await anna.getByLabel('Dein Vor- und Nachname').fill('Anna');
	await anna.getByRole('button', { name: 'Mitmachen' }).click();

	// the confirmation is a dialog in the page's design; cancelling (also with Escape) changes nothing
	await anna.getByRole('button', { name: 'Mich austragen' }).click();
	const confirmation = anna.getByRole('dialog');
	await expect(confirmation).toContainText('Wirklich aus dem Wichteltopf austragen?');
	await expect(confirmation.getByRole('button', { name: 'Abbrechen' }), 'the safe choice is focused').toBeFocused();
	await confirmation.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(confirmation).toBeHidden();
	await anna.getByRole('button', { name: 'Mich austragen' }).click();
	await anna.keyboard.press('Escape');
	await expect(confirmation).toBeHidden();
	await expect(anna.getByRole('heading', { name: 'Schön, dass du mitmachst!' }), 'cancelled').toBeVisible();

	await anna.getByRole('button', { name: 'Mich austragen' }).click();
	await confirmation.getByRole('button', { name: 'Mich austragen' }).click();
	await expect(anna.getByRole('heading', { name: 'Du bist ausgetragen' })).toBeVisible();
	await anna.goto(potUrl);
	await expect(anna.getByText('Noch ist niemand im Topf.')).toBeVisible();
});

test('links can be copied, and shared only where the device can share', async ({ page, person, browserName }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Wichteltopf anlegen' }).click();
	const potUrl = await page.getByLabel(/Teilnahme-Link/).inputValue();

	const anna = await person();
	if (browserName === 'chromium') await anna.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	await anna.goto(potUrl);
	await anna.getByLabel('Dein Vor- und Nachname').fill('Anna');
	await anna.getByRole('button', { name: 'Mitmachen' }).click();

	const field = anna.getByLabel(/Adresse dieser Seite/);
	const personalUrl = await field.inputValue();
	expect(personalUrl).toBe(anna.url().replace(/\?.*/, ''));

	// the save button (share sheet) is only shown where there is one
	const canShare = await anna.evaluate(() => typeof navigator.share === 'function');
	await expect(anna.getByRole('button', { name: 'Speichern' })).toBeVisible({ visible: canShare });
	await expect(anna.getByRole('link', { name: 'An mich mailen' })).toHaveAttribute(
		'href',
		new RegExp(encodeURIComponent(personalUrl).replace(/[.?]/g, '\\$&')),
	);

	// copying works, or (where the clipboard is blocked) at least selects the link for manual copying
	// found by its attribute, as its label changes after copying
	const copy = anna.locator('[data-copy]');
	await expect(copy).toHaveText('Kopieren');
	await copy.click();
	await expect
		.poll(async () =>
			(await copy.textContent()) === 'Kopiert ✓'
				? 'copied'
				: await field.evaluate((input: HTMLInputElement) =>
						input.selectionEnd === input.value.length ? 'selected' : 'nothing',
					),
		)
		.not.toBe('nothing');
	if (browserName === 'chromium') expect(await anna.evaluate(() => navigator.clipboard.readText())).toBe(personalUrl);
});

test('a shared device shows who it remembers and lets somebody else join', async ({ page, person }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Wichteltopf anlegen' }).click();
	const potUrl = await page.getByLabel(/Teilnahme-Link/).inputValue();

	const tablet = await person();
	await tablet.goto(potUrl);
	await tablet.getByLabel('Dein Vor- und Nachname').fill('Hilde');
	await tablet.getByRole('button', { name: 'Mitmachen' }).click();
	const hildesPage = tablet.url().replace(/\?.*/, '');

	// the group link doesn't bounce to Hilde's page, it offers it
	await tablet.goto(potUrl);
	await expect(tablet.getByRole('heading', { name: 'Du bist als Hilde dabei' })).toBeVisible();
	await expect(tablet.getByLabel('Dein Vor- und Nachname')).toHaveCount(0);
	await tablet.getByRole('link', { name: 'Zu deiner Seite' }).click();
	await expect(tablet.getByText('Du bist als Hilde im Topf')).toBeVisible();

	// her husband uses the same tablet
	await tablet.goto(potUrl);
	await tablet.getByRole('button', { name: 'Jemand anderen eintragen' }).click();
	await tablet.getByLabel('Dein Vor- und Nachname').fill('Walter');
	await tablet.getByRole('button', { name: 'Mitmachen' }).click();
	await expect(tablet.getByText('Du bist als Walter im Topf')).toBeVisible();

	// Hilde's personal link still works
	await tablet.goto(hildesPage);
	await expect(tablet.getByText('Du bist als Hilde im Topf')).toBeVisible();
});

test('a long result list can be filtered by code name', async ({ page, request }) => {
	const people = Array.from({ length: 12 }, (_, i) => `Person ${i + 1}`);
	const { potPath, adminPath } = await createPot(request, { people });
	await page.request.post(`${adminPath}/schliessen`, { headers: { 'Sec-Fetch-Site': 'same-origin' } });
	await page.goto(potPath);
	const rows = page.locator('.note tbody tr');
	await expect(rows).toHaveCount(12);

	const filter = page.getByLabel('Codename suchen');
	await expect(filter, 'the filter appears with JavaScript').toBeVisible();
	const first = (await rows.first().locator('td').first().textContent()) ?? '';
	await filter.fill(first.slice(0, 3).toUpperCase());
	await expect(rows.first()).toBeVisible();
	expect(await page.locator('.note tbody tr:visible').count()).toBeLessThan(12);
	await expect(page.getByText('Kein Codename passt')).toBeHidden();

	await filter.fill('zzzzzz');
	await expect(page.locator('.note tbody tr:visible')).toHaveCount(0);
	await expect(page.getByText('Kein Codename passt')).toBeVisible();

	await filter.fill('');
	await expect(page.locator('.note tbody tr:visible')).toHaveCount(12);
});
