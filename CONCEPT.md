# Concept

What the Wichteltopf is, who uses it, and the rules behind its design. Read this before changing
how people identify themselves, what is shown to whom, or what the organiser can do. `README.md`
covers how to run and deploy the code.

Status: this document describes the target concept. The section "Gap to the current code" at the end
lists what is not implemented yet.

## Promise

A Secret Santa draw for a family, a class or an office, with:

- no accounts, no e-mail addresses, no phone numbers, nothing to install;
- a single link shared in a group chat is all a participant ever needs;
- nobody, not even the organiser, learns who gives to whom;
- all data is deleted automatically after the season.

Everything else follows from these four points. A feature that needs a contact channel to the
participants, or that lets the organiser see the assignments, is out of scope.

## Roles

| Role        | Has                       | Can                                                                 |
| ----------- | ------------------------- | ------------------------------------------------------------------- |
| Organiser   | Admin link                | Share the pot, remove people, add exclusions, re-issue personal links before the draw, close, delete |
| Participant | Group link, personal link, code name | Join, leave before the draw, see their own code name and receiver |
| Anyone with the group link | Group link        | See the title, who has joined, and after the draw the result list   |

The organiser usually also takes part. They join through the group link like everybody else and
get their own personal link and code name. The admin page tells them so and offers the group link
to open.

## The pot

A pot has an **optional title**, for example "Familie Müller Weihnachten 2026" or "Team Backend".
The title appears on every page of the pot, in the chat preview when the link is shared, and in the
browser tab. It is the only way to tell two pots apart, so the admin page recommends setting one.
Besides the title a pot has a background photo and a code name list, both chosen at creation.

A pot is **open** until the organiser closes it. Closing performs the draw. After that no one can
join or leave, and no assignment ever changes. If the group changes after the draw, the organiser
deletes the pot and starts a new one.

The size of a pot is limited by its code name list, one code name per person. The limit is shown
when the list is chosen.

## How a participant is identified

There is exactly one secret per participant: the **personal link**. It contains a random token.
Whoever opens it is that participant. It is what the server checks when someone leaves the pot,
and what shows a participant their own row after the draw.

Two further things exist, and the concept is only consistent if their roles stay as described here:

- The **code name** is a public pseudonym, drawn at random from the pot's list. It is not a
  credential: anyone can type any code name. Its jobs are (1) to let the result list be public
  without revealing givers, (2) to sign the present, so the receiver can see "Von: Wildschwein"
  on the gift tag, and (3) to serve as the participant's backup: whoever remembers their code
  name can read their result from the public list, on any device, without the personal link.
- The **cookie** is the browser's copy of the personal link, nothing more. It lets the group link
  recognise a returning participant on the same device. It is never the only place a participant
  can be found again.

Participants are told this in plain words on their page: "Dein Codename ist dein Schlüssel. Merk
ihn dir oder mach ein Foto. Nach der Auslosung findest du damit in der Liste, wen du beschenkst."
The personal link is presented as a convenience for other devices and for leaving the pot, not as
something whose loss is fatal.

## What each page shows

**Start page** explains the three steps and creates a pot: title, code name list, background photo.

**Admin page** (admin link). Shows the title, the group link with a share button, the admin link,
and a short explanation of what each link is for. The two links are visually distinct so they
cannot be mixed up. Then the list of participants, the exclusions, the close button, and the delete
button. After the draw it shows the result list and tells the organiser to send the group link
around again so everyone can look up their result.

**Group page** (group link, pot open). Shows the title and who has joined, and asks for a name. If
the browser already knows a participant of this pot, the page says so ("Du bist als Anna dabei")
with a button to their personal page and a link to join as somebody else. It never redirects
silently, so a shared tablet does not trap the second person on the first person's page.

**Personal page** (personal link). Before the draw: the name, the code name on a gift tag, the
explanation above, the personal link with copy and save options, and the option to leave. After
the draw: the gift tag with code name and receiver, then the full result list with the own row
highlighted.

**Result page** (group link, pot closed). Title, one sentence telling people to look for their
code name, and the alphabetical list "code name gives to name". It is designed for exactly that
search: large, sorted, and with a filter field for big pots.

## What the organiser can do about problems

All of these keep the organiser blind to the assignments.

| Problem                                      | Before the draw                                   | After the draw                                |
| -------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Somebody typed their name wrong              | Remove them, they join again                      | Nothing, the name is only cosmetic            |
| Somebody lost their personal link            | Re-issue the link; the old one stops working      | They use their code name and the group link   |
| Somebody forgot their code name and lost the link | Re-issue the link, the new page shows the code name | Nothing. This is the one accepted dead end |
| Somebody joined who should not have          | Remove them                                       | Delete the pot and start again                |
| Somebody dropped out                         | Remove them                                       | Delete the pot and start again                |
| Couples must not draw each other             | Add an exclusion                                  | Too late                                      |

Re-issuing a link before the draw reveals nothing to the organiser, because the personal page
shows no receiver yet. Re-issuing after the draw would let the organiser read the receiver, which
breaks the promise, so it is not offered. The result list plus the code name is the backup instead.

## What the draw guarantees

Nobody draws themselves, exclusions are respected in both directions, and the assignment prefers
one big circle, so two people never simply gift each other. Exclusions are symmetric pairs; there
are no one-directional exclusions and no groups, families are entered pair by pair. If the
exclusions make a draw impossible, the admin page says so before the organiser tries to close.

## Data and retention

Stored per pot: title, theme, code name list, the admin token, timestamps. Stored per participant:
name, code name, token, and after the draw the receiver. Exclusions are pairs of participant ids.
No e-mail addresses, no IP logs, no analytics.

Pots are deleted 90 days after the last change. The organiser can delete a pot at any time, a
participant can remove themselves until the draw. The privacy page states all of this in German
and must be kept in line with this document.

## Deliberately not in scope

- **Notifications.** There is no channel to the participants. The organiser announces the draw by
  sending the group link again.
- **Wish lists, budgets, dates.** The title can carry a short hint. Anything more belongs in the
  group chat.
- **Changing a closed pot.** No late joiners, no re-draws for one person. Simplicity and the
  guarantee that an assignment never changes outweigh the convenience.
- **Organiser-entered participants.** Everyone enters their own name. Organisers who want to help
  somebody without a phone may join on their behalf, knowing that they will then see that person's
  code name and receiver.
- **Accounts and e-mail recovery.** They would solve the lost-link problem at the cost of the
  promise in the first section.

## Gap to the current code

As of October 2026 the code differs from this concept in these points:

1. Pots have no title. Needs a migration, a field on the start page, and the title on every page
   and in the Open Graph tags.
2. The group link redirects silently to the personal page when the cookie matches. It should show
   the "Du bist als … dabei" state with a way to join as somebody else.
3. The personal page presents the personal link as the main thing to keep. It should present the
   code name as the key and the link as a convenience, with the wording above.
4. The organiser cannot re-issue a personal link. Needs an admin action that replaces the token
   while the pot is open.
5. The two links on the admin page look identical when truncated. They need a visible distinction.
6. The admin page does not mention that the organiser joins through the group link, and after the
   draw it does not tell them to send the group link around again.
7. The result page has no filter field for large pots.
