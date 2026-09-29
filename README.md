# Todo List App

A simple todo list: FastAPI + SQLite backend, React (Vite) frontend.
Add tasks, check them off, drag to reorder, set an optional reminder
time (overdue tasks turn red, and you'll get a browser notification
if you have the tab open when it comes due).

## Requirements
- Python 3.9+
- Node.js 18+ and npm

## 1. Run the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

This starts the API at http://localhost:8000 and creates `todo.db`
automatically on first run.

## 2. Run the frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

This starts the app at **http://localhost:5173** — open that in
your browser.

## Notes
- Both servers need to be running at the same time (backend on
  8000, frontend on 5173).
- The browser notification for reminders only fires while the tab
  is open, since there's no server-side push here — it's checked
  every 20 seconds on the frontend.
- Data is stored in `backend/todo.db` (SQLite file) — it persists
  between restarts.
