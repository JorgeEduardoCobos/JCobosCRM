# Project memory

## Product intent & audience

- **JC CRM**: CRM for sales/client management. Built with Vite + React + TypeScript.
- Used for tracking clients, quotes (cotizaciones), catalog, finances, PWA, backups.
- Step-based feature implementation plan (currently at PASO 6.3 — completed).

## Brand personality & voice

- Spanish-language UI and code comments.
- Clear, functional tone; user-facing messages are direct and action-oriented.

## Visual design & UX direction

- Single-page app in `src/App.tsx`; sections include Clientes, Cotizador, Catálogo, Finanzas.
- Client list with selectable cards; form-based client creation.
- Duplicate detection shows a modal/inline warning with two actions: cancel + highlight existing client, or confirm new record.
- Highlighting existing client in the list after cancel (visual focus cue).
- Client profile view (`src/ClientProfile.tsx`): "Ver ficha" shows full client data; "Editar ficha" enters edit mode.
- Vehicle interest picker (`src/VehicleInterestPicker.tsx`): searchable by brand/model, supports motorcycles/quadrons/utilities, allows change or removal.
- Edit form differentiates "Guardar cambios" vs "Cancelar" clearly; mobile/tablet-friendly layout.

## Decisions, constraints & rationale

- **Duplicate detection** (`src/lib/clientDuplicates.ts`): phone normalized by stripping non-digits; name normalized by lowercasing, removing accents, trimming extra spaces. Phone skipped when empty.
- Never auto-merge, delete, or modify existing client records.
- Preserve optional commercial-tracking fields; don't touch quoteDraft, cotizador, IndexedDB structure, catalog, photos, importers, Finanzas, backups, or PWA.
- No general refactors.
- **Client editing (PASO 6.3):** preserves ID, createdAt, contactHistory, lastContactAt, nextFollowUpAt, and any unmodified fields. Empty form fields don't reset optional fields. Related cotizaciones untouched.
- **Phone change on edit:** blocks save if phone belongs to another client; shows which client conflicts.
- **vehicleInterest:** stores reference + description from catalog without modifying catalog. Distinct from historical quote vehicles — represents current client interest only.
- Fixed two pre-existing type errors earlier to make `npm run build` and `typecheck` pass.

## Open questions & assumptions

- IndexedDB stores clients as a list; current structure assumed sufficient for duplicate lookups and edits.
- Pending manual tests in Preview: edit/save existing client, verify dates/observations unchanged, change/remove vehicle, phone conflict with another client, responsive layout on phone/tablet.
- No automated tests mentioned; verification is manual in Preview.