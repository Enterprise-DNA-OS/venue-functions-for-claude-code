# Venue Functions for Claude Code

A venue owner's working desk: enquiries, room bookings, menu items, deposits, kitchen handovers and staff shifts in a database you own. Built by Enterprise DNA. MIT licence.

| Do it yourself | We customise it | We run it for you |
| --- | --- | --- |
| Free source. Follow the quick start. | Your booking rules, fields, Function Tracker mapping, screens and connections. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Talk to Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=function-tracker&utm_medium=readme) · [Instead of Function Tracker](https://enterprisedna.co/omni/instead-of/function-tracker?utm_source=github&utm_medium=readme&utm_campaign=function-tracker)

Works with Claude Code, Codex, OpenCode or Cursor. Read AGENTS.md and CLAUDE.md. This is an operator desk with printable reports, not an online booking service.

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/venue-functions-for-claude-code.git
cd venue-functions-for-claude-code
npm install
npm run demo
npm run venue -- weekly-review
npm run view
npm run docs
```

Node 20 or newer. Embedded PGlite needs no database installation. Set DATABASE_URL for Postgres using the same migrations. DATA_DIR selects the local database folder. The fictional NZ and AU demo includes an overdue deposit, a room clash involving setup time, a staff clash, an over-capacity dinner and unverified dietary information. Seed is idempotent and never overwrites edits. For real records start with an empty database, run npm run migrate and do not seed.

Source is free. Agent subscriptions, hosting and ongoing support have separate costs. Function Tracker's [own pricing FAQ](https://support.functiontracker.com/article/137-how-much-is-function-tracker), checked 28 September 2026, describes room-based billing without per-user or per-event charges. Its current pricing page blocked automated access in this run, so no subscription figure is presented here. This build is a choice about ownership and venue-specific workflows, not a verified savings claim.

## The function coordinator's week

- `/diary` and `/run-sheet`: room-local dates, event times, guests and sessions. Generate branded run sheets with npm run docs.
- `/room-clashes`: overlapping tentative and confirmed sessions, including setup and clearance. Adjacent bookings without buffer overlap are allowed.
- `/enquiries` and `/attention`: contacts older than seven days, overdue tasks, deposits, final numbers and clashes.
- `/deposits-due` and `/balances-due`: agreed booking amount, recorded receipts, deposit shortfall and full balance, kept in the event currency.
- `/kitchen` and `/final-numbers`: menu quantities, dietary notes, confirmation status and allergen evidence for the kitchen handover.
- `/staffing` and `/staff-clashes`: entered shifts and double-booked people.
- `/margin-review`: agreed value less entered item costs, with a separate difference between item sales and agreed value. This is contribution before unentered labour, tax and overhead, not net profit.
- `/customer-review` and `/conversion`: booking totals grouped by customer, status and currency, plus current pipeline counts.
- `/compliance`: missing evidence against the sourced prompts in docs/compliance.md. A person reviews licence conditions and food safety arrangements.
- `/weekly-review`: a Monday plan from attention, deposits, final numbers and compliance, checked against the diary.

Run npm run venue -- help for every route and allowed field. Reads print aligned text, or --json for machines. Relationships accept full IDs, ID prefixes and case-insensitive names. An ambiguous name lists candidates and exits 1. Add and update accept one JSON object quoted for your shell. Log records a contact and updates the event's last-contact time. Notes added with a historical timestamp do not change last-contact time automatically. Changes write audit history.

## Booking and money rules

Tentative sessions hold rooms. Overlaps are reported, not prohibited, so an operator can assess alternative holds. The base has no shared booking lock or customer portal. Capacity is the configured limit for a room, not a legal occupancy calculation. Each event's guest count applies to every session; split sessions with different capacities need an agreed extension.

Booking amounts and receipts use integer cents in NZD or AUD. All entered amounts must use the same tax basis for a given event. Receipts are recorded evidence, not a bank feed or payment processor. All receipts reduce the deposit shortfall first and the full booking balance. Overpayments remain visible as negative balances. The program does not calculate tax, create legally formatted invoices or reconcile accounting ledgers. Confirm figures against the signed booking and accounting records.

Currency cannot change after an event has item or receipt records. Receipts are append-only through the CLI. Incorrect receipts require a reviewed migration that retains the original evidence. Parent relationships cannot be reassigned through update. No record deletion route is provided. Mark cancelled events and completed tasks explicitly.

Session times require ISO timestamps with explicit timezone offsets and render in the room's named timezone. Shift times retain explicit offsets in structured output and show UTC in text. Date-only deposit and final-number comparisons use the current UTC date. Confirm local cutoff policy before using it for same-day chasing. Dietary and licence fields are evidence prompts, not assurances of compliance.

## Documents and read-only views

npm run docs generates function run sheets, kitchen sheets and booking/deposit summaries. All are for review, not tax invoices. npm run view generates the function week, money and kitchen dashboards. Change business name, logo and colours in brand.json. Use /new-view to add a report. /draft-follow-up and /draft-function write internal drafts with source records; remove internal evidence before a person shares them. Nothing sends.

Read [why there is no front end](docs/why-no-front-end.md). A phone app, drag-and-drop calendar, online enquiry form and accounting connection can be scoped into a custom version.

## Ten questions across your venue

Function Tracker documents its own reports. These are questions the free version answers today, not claims that the vendor cannot build a similar report.

1. Which room holds overlap once setup and clearance are included? (`room-clashes`)
2. Which deposits still have an unpaid amount? (`deposits-due`)
3. Which enquiries have gone quiet for more than a week? (`attention`)
4. Which events still need final headcounts or a dietary review? (`final-numbers`)
5. Which menus need verified allergen information? (`compliance`)
6. Who has overlapping function shifts? (`staff-clashes`)
7. Which booking totals do not match their entered sales items? (`margin-review`)
8. What contribution remains after the item costs we have entered? (`margin-review`)
9. Which customers have outstanding booking balances, separated by currency? (`customer-review`)
10. Which alcohol events lack the recorded host plan or licence review? (`compliance`)

## Your first hour: ten things to ask for

1. Put our name and logo on the run sheet.
2. Add our function rooms and their configured capacities.
3. Set each room's timezone and country.
4. Map our actual Function Tracker export headings.
5. Add our deposit and final-number dates.
6. Record our standard setup and clearance times.
7. Add our menu items and reviewed ingredient information.
8. Record the current licence and host responsibility plan.
9. Add our coordinators and the coming week's shifts.
10. Make a report of bookings needing a commercial discussion.

Use /customise to change fields or rules with a migration and tests. Keep existing workflows running until the revised version has been reconciled.

## Bring your Function Tracker records

The [replacement guide](docs/replace-function-tracker.md) explains the vendor's booking and customer Excel exports, conversion to CSV, explicit column mapping and a one-command import after mapping. Fixture headings are illustrative because the public documentation does not specify them. Unknown columns, invalid references and changed source rows stop the whole import. Preview rolls back. Exact repeats skip. Raw rows and mappings are preserved.

Attachments, signed documents, mail histories, payment services and connections do not move automatically. Separately map supported data and retain original files. Export writes all ten business entities plus audit and import history as JSON and CSV. It is an interchange snapshot, not an automated restore.

## Verification and operations

npm test uses a disposable database, applies and repeats migrations and seed, exercises every CLI route, checks room buffers and staff overlap, checks deposit and contribution arithmetic, validates missing evidence, tests import preview and atomic rollback, and renders documents. It checks JSON output, ambiguity and process exit codes. CI covers Windows and Linux with PGlite and Linux with Postgres. A local Linux pass does not establish that hosted CI has run.

One business per database. Before shared use configure least-privilege roles, access review and backups, and test recovery of the database plus documents. No tenant isolation is provided. Audit records can be altered by database administrators and are not tamper proof. Protect dietary details, exports and printed handovers under the venue's retention policy.
