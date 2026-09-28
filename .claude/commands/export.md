---
description: "Export venue records"
---

# Export venue records

Exports all entities, audit and raw import rows to JSON and CSV. The folder must not exist. Protect it as customer data. It is an interchange snapshot, not a database backup.

Run `npm run venue -- export <new-folder>`. Use `--json` for structured results. Replace angle-bracket placeholders with supplied values and quote them for the current shell. Never infer missing records.
