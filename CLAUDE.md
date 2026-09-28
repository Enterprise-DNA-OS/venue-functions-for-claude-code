# Venue Functions for Claude Code: operating instructions

A working desk for venue owners and function coordinators. Bookings, room sessions, menus, deposits and handovers live in one database. The demo is fictional. Set the business identity in brand.json before real use.

## How to work

Read data before answering. Read the full event before writing a draft. Names and partial IDs are supported. If a match is ambiguous, list the candidates. Never guess. Drafts stay in drafts and documents stay in docs-out. A person checks and shares them.

## Routing

| Job | Command |
| --- | --- |
| Customer list | `/customers` |
| Room register | `/rooms` |
| Booking register | `/events` |
| Function diary | `/diary` |
| Check room holds | `/room-clashes` |
| Check staff overlaps | `/staff-clashes` |
| Enquiry follow-up | `/enquiries` |
| Deposit chase | `/deposits-due` |
| Booking balances | `/balances-due` |
| Kitchen handover | `/kitchen` |
| Final guest numbers | `/final-numbers` |
| Function run sheet | `/run-sheet` |
| Function staffing | `/staffing` |
| Actions due | `/tasks` |
| Event contribution | `/margin-review` |
| Customer booking history | `/customer-review` |
| Booking pipeline counts | `/conversion` |
| What needs attention | `/attention` |
| Review venue evidence | `/compliance` |
| Monday function review | `/weekly-review` |
| Read a full record | `/record` |
| Add a venue record | `/add` |
| Update a venue record | `/update` |
| Log a client contact | `/log` |
| Bring Function Tracker records | `/import` |
| Export venue records | `/export` |
| Draft a booking follow-up | `/draft-follow-up` |
| Draft a function brief | `/draft-function` |
| Change fields, stages or rules | `/customise` |
| Add a read-only report | `/new-view` |

## Rules

- Never send email, process a payment or change a booking in another service.
- Do not delete records. Mark events cancelled or tasks done when instructed.
- Money is integer cents in the event currency. Never total AUD and NZD. All amounts must share the venue's chosen tax basis. No tax calculation or legal invoice generation is provided.
- Receipts are append-only through the CLI. Correct errors through a reviewed migration with the original evidence retained. Never edit a receipt to force a balance to match.
- Event sessions use explicit timestamp offsets. Display each room's timezone. Deposit and final-number due dates use UTC date comparisons. Configure local policy before relying on same-day cutoffs.
- A room clash includes setup and clearance. Tentative bookings hold rooms. The desk reports clashes; it does not promise to prevent concurrent double booking.
- Compliance output lists missing evidence. Read docs/compliance.md. Never state that a venue, menu or event is legally compliant.
- Import mappings must match the real export. Keep raw source rows and test a dry run. Exact repeats skip. Changed rows fail for review.
- One venue business per database. Configure least-privilege access and tested backups before sharing. No tenant isolation is supplied.

## Files

scripts/venue.mjs owns record operations. supabase/migrations owns the schema. views.json and documents.json own read-only HTML. DATABASE_URL selects Postgres; otherwise DATA_DIR selects embedded PGlite. AGENTS.md directs other coding agents here.

Built by Enterprise DNA. Managed service: Omni by Enterprise DNA, https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=function-tracker&utm_medium=instructions
