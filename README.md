# Camp Days

A local summer camp planner for two kids, built with Vue 3, TypeScript, and Vite.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To check types and create a production build, run `npm run build`.

## Features

- Shared monthly calendar with camper filters
- Add, edit, and delete camps; track confirmed, pending, and wishlist bookings
- Same-camper date overlap warnings
- Eleven-week summer coverage overview (June 15–August 28, 2026)
- Amount paid tracking, editable camper names, and JSON backup export
- Browser-local saving; no account or backend

The current plan contains Owen’s and Kayleigh’s supplied summer 2026 schedules. Week entries run Monday–Friday. Supplied drop-off and pickup times are stored as 24-hour `HH:mm` values; family care and no-camp entries use `null` for N/A. Locations remain blank because they were not supplied. Family care counts as covered; “No Camp” does not. Missing prices are stored as `null`, displayed as “Cost not provided,” and excluded from known-cost totals. Explicit zeroes are preserved. Kayleigh’s July 20 YMCA cost is linked to Owen’s $669.80 entry and counted once. Owen’s total is $2,959.80; Kayleigh’s separately listed total is $1,767.00; the combined total is $4,726.80. The italicized $215 entries are retained as supplied.

Saved data belongs to this browser and origin; export a backup before clearing browser storage or changing the local server port. Font loading is optional; the app uses system fallbacks when offline.

## Data files

- `src/data/owen.json`: Owen’s name and camps.
- `src/data/kayleigh.json`: Kayleigh’s name and camps.
- `src/data/general.json`: summer year, coverage start date, number of weeks, days per camp week, and defaults for new camps.

The app combines each camper’s camps and assigns their camper index automatically. Keep camp IDs unique across both files. Season dates use `YYYY-MM-DD` format; set the year and coverage start consistently.

These files provide the initial data. Existing browser-saved camps and names take precedence. To load revised JSON defaults, export any browser edits you want to keep, then remove the `camp-days-2026` localStorage entry in browser developer tools and reload. Changes made in the app continue to save in the browser; they do not rewrite the source JSON files.

Browser saves are separated by season (`camp-days-<year>`), preserving the earlier sample plan under its original key.

The Owen schedule import is applied once to existing 2026 browser saves, adding missing Owen entries and linking Kayleigh’s blank July 20 cost without replacing existing camp edits.

## Weekly handoffs

Open **Schedule → Week** to see Monday–Friday bookings and times for both kids. Navigate with the arrows or choose a date (it snaps to that week’s Monday). Use **Month** to return to the monthly calendar. Click a booking to edit its drop-off and pickup times; blank times mean N/A or unspecified. Times apply to each weekday of the booking.

Handoff alerts compare events across kids, including pickup-to-drop-off pairs, and flag simultaneous events or gaps up to the configured threshold (30 minutes by default, configurable in `general.json`, the weekly view, or Family settings). Alerts always compare both kids regardless of the camper filter. Equal YMCA times may be a shared stop; locations and driving times are not yet available, so alerts are planning prompts rather than verified travel conflicts. Family care and No Camp entries have no timed handoffs.

The supplied times are imported once into existing browser saves for matching camp IDs, preserving any structured times already edited there. Run `npm test` for the handoff checks and `npm run build` for type checking and production compilation.

## Payment status

Each cost has a Paid/Unpaid toggle in Payments and a payment status field in the camp editor. Existing supplied 2026 entries start as paid to preserve the previously displayed paid total; new camps start unpaid. The total paid includes only paid, non-wishlist entries. Unpaid costs are shown separately, and zero-cost entries show “No payment due.” Kayleigh’s shared YMCA entry uses the payment status of Owen’s linked entry, so toggling either updates the same payment without duplicating its cost. Payment status is saved in browser storage and included in JSON backups.

## Planning another summer

Use the **Summer** year picker in the header. The supplied 2026 schedule stays in `camp-days-2026`; 2027 and later years start empty and save independently under `camp-days-<year>`. The selected year is remembered between visits. Camp additions, edits, deletions, payment status, camper names, and the handoff threshold save immediately. The source JSON files are not rewritten.

New seasons use 11 weeks starting on the Monday on or before June 15 (June 14 for 2027). Calendar, missing weeks, weekly handoffs, payments, and new-camp date defaults use the selected season. Camp dates must fall in that year. JSON backups are named for the year and include its plan and handoff threshold.

`App.vue` manages year selection; `Planner.vue` connects the active year’s components. Storage failures show a warning; saving is specific to the browser and local server origin. `npm test` checks both handoffs and persistence across season switches, including deletions and payment edits.

## Automated checks

Run `npm test` for the Node.js test suite and `npm run build` for TypeScript validation and the Vite production build. Tests cover handoff conflicts, season-specific persistence, payment totals and shared payment toggles, missing care, multiweek payment rows, camp editing and deletion, validation, and storage failures. Planner tests exercise the shared composable and reactive state. Component tests exercise rendering and emitted actions in a lightweight Vue host; they do not check browser layout.

GitHub Actions runs both commands on every push and pull request, using Node.js 22 and a clean `npm ci` install. See `.github/workflows/ci.yml` and the repository’s **Actions** tab for results.

## Formatting

Run `npm run format` to format the repository with Prettier’s default settings, or `npm run format:check` to check without making changes. Generated output and dependencies are excluded. GitHub Actions also checks formatting on pushes and pull requests.

## Component structure

- `src/Planner.vue`: page layout and component wiring.
- `src/composables/usePlanner.ts`: season data, localStorage, care and payment calculations, and editing actions.
- `src/components/PlannerSidebar.vue` and `PlannerSummary.vue`: navigation and summary cards.
- `src/components/MonthCalendar.vue`, `WeeklySchedule.vue`, and `CampList.vue`: calendar and camp views.
- `src/components/CareOverview.vue` and `PaymentsTable.vue`: care grid and payments.
- `src/components/MissingWeeksDialog.vue` and `PlannerDialogs.vue`: missing weeks, camp editor, and family settings.
- `src/types.ts`: shared data types.

The parent owns shared state; components receive typed props, emit actions, and use named models for editable values. Existing global CSS classes are retained.

Camp types are Dance, Theater, Soccer, Sports, YMCA, Grandparent, and Other. Existing saved categories migrate automatically. “No care this week” is a separate field, so no-camp entries stay excluded from care coverage and handoff alerts.
