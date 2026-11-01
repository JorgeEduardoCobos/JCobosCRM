# Project memory

## Product intent & audience

- **JC CRM**: CRM for sales/client management. Built with Vite + React + TypeScript.
- Used for tracking clients, quotes (cotizaciones), catalog, finances, PWA, backups.
- Step-based feature implementation plan (currently at PASO 6.2).

## Brand personality & voice

- Spanish-language UI and code comments.
- Clear, functional tone; user-facing messages are direct and action-oriented.

## Visual design & UX direction

- Single-page app in `src/App.tsx`; sections include Clientes, Cotizador, Catálogo, Finanzas.
- Client list with selectable cards; form-based client creation.
- Duplicate detection shows a modal/inline warning with two actions: cancel + highlight existing client, or confirm new record.
- Highlighting existing client in the list after cancel (visual focus cue).

## Decisions, constraints & rationale

- **Duplicate detection** (`src/lib/clientDuplicates.ts`): phone normalized by stripping non-digits; name normalized by lowercasing, removing accents, trimming extra spaces. Phone skipped when empty.
- Never auto-merge, delete, or modify existing client records.
- Preserve optional commercial-tracking fields; don't touch quoteDraft, cotizador, IndexedDB structure, catalog, photos, importers, Finanzas, backups, or PWA.
- No general refactors.
- Fixed two pre-existing type errors to make `npm run build` and `typecheck` pass:
  - `src/App.tsx`: removed string-vs-number comparison in vehicle card (PDF text unaffected).
  - `src/lib/importers.ts`: removed incorrect type annotation in a filter (import behavior unchanged).

## Open questions & assumptions

- IndexedDB stores clients as a list; current structure assumed sufficient for duplicate lookups.
- Pending manual tests in Preview: duplicate phone with different format, duplicate name with case/accent variations, both warning actions, existing clients unchanged.
- No automated tests mentioned; verification is manual in Preview.