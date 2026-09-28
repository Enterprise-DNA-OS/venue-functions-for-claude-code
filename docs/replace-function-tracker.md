# Bring your Function Tracker bookings

## Export from the vendor

Function Tracker's [Export Data to Excel](https://support.functiontracker.com/article/56-export-data-to-excel) describes an Excel export of event booking data. Its [Export Customers](https://support.functiontracker.com/article/121-export-customers) describes a separate customer export with filters. Both were checked on 28 September 2026. Select all needed customer types and the full booking date range. Preserve the original workbooks.

The vendor does not publish fixed headings in these help articles. The fixture files here are illustrative mapping examples, not a claimed native export format. Save each required workbook sheet as UTF-8 CSV in Excel or LibreOffice. Keep identifiers as text. Check dates, decimal separators and leading zeros. Convert monetary columns to integer cents. Convert local session times to ISO timestamps with the correct timezone offset for that date; never assume today's daylight-saving offset.

## Map once, import with one command

Copy fixtures/function-tracker/mapping.json beside the CSV files and map their actual headings. Each entity uses a file and a columns object. A source heading maps to a supported field, source_id, or null for an explicitly ignored column. The importer rejects unknown or missing headings. Choose a stable source identifier. If the vendor export omits one, assign and preserve a reviewed unique identifier before import. References use source identifiers from the parent files, never fuzzy matches.

The fixture supplies customers, rooms, events and sessions. Rooms are a prepared reference file, not a claimed vendor export. Import order follows dependencies. Other supported entities are items, receipts, staff, shifts, tasks and notes. Run npm run venue -- help for exact fields. Absent columns use defaults, which must be reviewed: an unverified allergen field stays unverified, not safe.

```bash
npm run venue -- import function-tracker ./migration --dry-run
npm run venue -- import function-tracker ./migration
```

After mapping, the import itself is one command. Preview executes the same validation and rolls back. The full batch is one transaction. Repeating an identical source row skips it. A changed source row or changed mapping stops the batch for review and rolls it back. No partial batch lands. Raw rows and the mapping are retained in import_rows. Never silently overwrite a live booking from a second export.

## Reconcile before switching

Compare customer counts, booking statuses and dates, per-currency agreed totals, receipt references, outstanding deposits and balances. Inspect room clashes, final numbers, kitchen evidence and staffing. Missing or incorrectly mapped booking statuses must be corrected before relying on the diary. Run both systems for an agreed review period and reconcile new changes before cutover.

Menus, receipt details, staffing, attachments, email histories, signed contracts, online enquiry forms, customer portals, accounting connections and card payment services do not arrive automatically with an event/customer export. Map separately supplied records where the importer supports them. Retain original files for the rest and agree the connections your business needs. The base records receipts; it does not charge cards, generate legal invoices or collect money.

For real records choose an empty DATA_DIR or empty database, run npm run migrate, and do not seed. Back up the database and documents and prove a restore before retiring the old system. The export command writes JSON and CSV for every entity plus audit/import history. It is an interchange snapshot, not an automated restore mechanism.
