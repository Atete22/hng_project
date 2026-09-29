# AGENTS.md

## Project
A todo list + notes app for the HNG assignment: FastAPI + SQLite
backend, React (Vite) frontend, two tabs. Single shared data, no
authentication.

## Structure
```
todo-app/
  backend/
    main.py           # FastAPI app: all routes + SQLite access (tasks + notes)
    requirements.txt
    todo.db           # created automatically on first run (not committed)
  frontend/
    src/
      App.jsx          # tab shell: switches between TodoList and Notes
      App.css          # shared/page-level styles (layout, tabs, banners)
      TodoList.jsx      # todo list tab: add/check/reorder/reminders
      TodoList.css
      Notes.jsx         # notes tab: list + editor, add/edit/delete
      Notes.css
      main.jsx          # Vite/React entry point (scaffold default, untouched)
    package.json
  README.md            # human setup instructions
  AGENTS.md            # this file
```

## Data model
Table `tasks` in SQLite:
- `id` INTEGER PRIMARY KEY
- `text` TEXT
- `done` INTEGER (0/1)
- `due_date` TEXT (ISO datetime string, nullable)
- `position` INTEGER (drag-and-drop order)

Table `notes` in SQLite:
- `id` INTEGER PRIMARY KEY
- `title` TEXT
- `content` TEXT
- `updated_at` TEXT (ISO datetime string, set on every save)

## API (backend/main.py)
Tasks:
- `GET /tasks` — list all, ordered by `position`
- `POST /tasks` — create `{ text, due_date? }`
- `PUT /tasks/{id}` — partial update `{ text?, done?, due_date? }`
- `DELETE /tasks/{id}` — remove
- `PUT /tasks/reorder` — bulk-set `{ order: [{id, position}, ...] }`

Notes:
- `GET /notes` — list all, newest-updated first
- `POST /notes` — create `{ title?, content? }`
- `PUT /notes/{id}` — partial update `{ title?, content? }`
- `DELETE /notes/{id}` — remove

## Frontend behavior
- `App.jsx` holds the active-tab state ("todo" | "notes") and
  renders `TodoList` or `Notes`. No routing library — plain
  `useState`.
- Both `TodoList.jsx` and `Notes.jsx` fetch from
  `http://localhost:8000` (hardcoded — update the `API` constant
  in each file if the backend moves).
- TodoList: drag-and-drop reordering uses native HTML5 drag events
  (no external library), persisted via `PUT /tasks/reorder` on
  drop. Reminders: requests `Notification` permission on load,
  polls every 20s, fires a browser notification once per task when
  its `due_date` has passed and it isn't done. Overdue tasks (past
  due, not done) get the `.overdue` class (red highlight).
- Notes: clicking a note opens a full editor (title + content).
  Typing autosaves after a 500ms debounce (`PUT /notes/{id}`).
  "+ New note" creates an empty note and opens it immediately.
  Delete asks for confirmation first.

## Conventions for AI agents working on this repo
- Keep the backend a single `main.py` unless the project grows
  enough to justify splitting into routers/models files.
- Any new task field must be added in: the SQLite `CREATE TABLE`,
  `TaskCreate`/`TaskUpdate` Pydantic models, `row_to_task()`, and
  `TodoList.jsx` state/UI together — don't update just one. Same
  pattern for note fields, in the `notes` table + `Note*` models +
  `row_to_note()` + `Notes.jsx`.
- No auth yet — CORS is wide open (`allow_origins=["*"]`). If
  accounts are added later, lock this down.
- Don't introduce a state management library (Redux, etc.) or a
  router for an app this size — plain `useState`/`useEffect` and
  manual tab-switching is intentional.
- Keep each tab's component + its own CSS file self-contained;
  only truly shared styles (layout, tabs, banners) belong in
  `App.css`.
- **Whenever a new endpoint is created (or an existing one is
  changed), add a task for it in the "Endpoint tasks" list below
  and validate it before checking it off** — see "Endpoint testing
  policy".

## Endpoint testing policy
Every endpoint in `backend/main.py` must have a corresponding task
in the "Endpoint tasks" checklist below, and that task is only
checked off once the endpoint has actually been run and confirmed
working — not just written. "Validated" means, at minimum:
- The server starts with no errors (`uvicorn main:app`).
- The endpoint was actually called (e.g. with `curl`) covering its
  main success path, and — where relevant — a not-found/invalid
  case (e.g. updating or deleting an id that doesn't exist).
- The response status and body match what the endpoint promises.
- Existing endpoints were re-checked too, to confirm the change
  didn't break them.

When adding a new endpoint, add its task to the list in the same
change that adds the code — don't leave it undocumented.

## Endpoint tasks
Tasks:
- [x] `GET /tasks` — validated: returns list ordered by `position`
- [x] `POST /tasks` — validated: creates task, appends at end of order
- [x] `PUT /tasks/{id}` — validated: partial update; 404 on unknown id
- [x] `DELETE /tasks/{id}` — validated: removes task; 404 on unknown id
- [x] `PUT /tasks/reorder` — validated: bulk-updates `position` for given ids

Notes:
- [x] `GET /notes` — validated: returns list, newest `updated_at` first
- [x] `POST /notes` — validated: creates note with timestamp
- [x] `PUT /notes/{id}` — validated: partial update, refreshes `updated_at`; 404 on unknown id
- [x] `DELETE /notes/{id}` — validated: removes note; 404 on unknown id

## Known limitations (deliberate, for this stage of the project)
- No authentication — anyone with the URL can read/write everything.
- CORS is wide open (`allow_origins=["*"]`) to match "no auth" — tighten this if accounts are ever added.
- Frontend's `API` constant is hardcoded to `http://localhost:8000` in both `TodoList.jsx` and `Notes.jsx` — must be updated in both places if the backend is deployed elsewhere.
- Reminder notifications only fire while the browser tab is open (checked client-side every 20s) — there's no server-side push, so a closed tab means no notification even if the due time passes.
- Single shared list/notes — there's no per-user separation.
These aren't bugs; don't "fix" them without checking with the project owner first, since some may be intentional for the assignment's scope.

## Definition of done
Before considering any change finished:
- Backend starts clean: `uvicorn main:app --reload` with no errors in the log.
- Frontend builds clean: `npm run build` with no errors or new warnings.
- No errors in the browser console when using the changed feature.
- Any new or changed endpoint is validated per "Endpoint testing policy" above and its task is checked off.
- `AGENTS.md` is updated in the same change if it now describes something outdated (new files, new endpoints, new limitations).

## Tasks log
- [x] Backend API (FastAPI + SQLite): tasks CRUD + reorder
- [x] Frontend (React): add, check off, drag-reorder, due dates
- [x] Reminders: browser notification + overdue red highlight
- [x] Notes tab: backend CRUD + frontend list/editor with autosave
- [x] Tested locally (backend + frontend both run and talk to each other)
- [ ] Push to private GitHub repo
- [ ] Deploy backend + frontend somewhere publicly reachable (optional, for "advanced" credit if required)
