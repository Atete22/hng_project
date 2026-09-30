"""
Todo List backend — FastAPI + SQLite.

Endpoints:
  GET    /tasks              -> list all tasks, ordered
  POST   /tasks               -> create a task
  PUT    /tasks/{id}          -> update a task (text, done, due_date)
  DELETE /tasks/{id}          -> delete a task
  PUT    /tasks/reorder       -> save new order after drag-and-drop
"""

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = "todo.db"

app = FastAPI(title="Todo API")

# Allow the React dev server (Vite default port) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # simple shared-list app, no auth -> wide open is fine
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_db():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                due_date TEXT,
                position INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


class TaskCreate(BaseModel):
    text: str
    due_date: Optional[str] = None  # ISO string, e.g. "2026-10-01T14:00"


class TaskUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    due_date: Optional[str] = None


class ReorderItem(BaseModel):
    id: int
    position: int


class ReorderPayload(BaseModel):
    order: List[ReorderItem]


class NoteCreate(BaseModel):
    title: Optional[str] = ""
    content: Optional[str] = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


def row_to_task(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "text": row["text"],
        "done": bool(row["done"]),
        "due_date": row["due_date"],
        "position": row["position"],
    }


def row_to_note(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "updated_at": row["updated_at"],
    }


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/tasks")
def list_tasks():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY position ASC").fetchall()
        return [row_to_task(r) for r in rows]


@app.post("/tasks")
def create_task(task: TaskCreate):
    with get_conn() as conn:
        max_pos = conn.execute("SELECT COALESCE(MAX(position), -1) AS m FROM tasks").fetchone()["m"]
        cur = conn.execute(
            "INSERT INTO tasks (text, done, due_date, position) VALUES (?, 0, ?, ?)",
            (task.text, task.due_date, max_pos + 1),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (cur.lastrowid,)).fetchone()
        return row_to_task(row)


@app.put("/tasks/reorder")
def reorder_tasks(payload: ReorderPayload):
    with get_conn() as conn:
        for item in payload.order:
            conn.execute("UPDATE tasks SET position = ? WHERE id = ?", (item.position, item.id))
        conn.commit()
    return {"ok": True}


@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    with get_conn() as conn:
        existing = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")

        new_text = task.text if task.text is not None else existing["text"]
        new_done = int(task.done) if task.done is not None else existing["done"]
        new_due = task.due_date if task.due_date is not None else existing["due_date"]

        conn.execute(
            "UPDATE tasks SET text = ?, done = ?, due_date = ? WHERE id = ?",
            (new_text, new_done, new_due, task_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return row_to_task(row)


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    with get_conn() as conn:
        existing = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
    return {"ok": True}


@app.delete("/tasks")
def clear_tasks():
    """Delete ALL tasks. Used by the 'Clear sample data' button."""
    with get_conn() as conn:
        conn.execute("DELETE FROM tasks")
        conn.commit()
    return {"ok": True}


@app.get("/notes")
def list_notes():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
        return [row_to_note(r) for r in rows]


@app.post("/notes")
def create_note(note: NoteCreate):
    with get_conn() as conn:
        now = datetime.utcnow().isoformat()
        cur = conn.execute(
            "INSERT INTO notes (title, content, updated_at) VALUES (?, ?, ?)",
            (note.title or "", note.content or "", now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (cur.lastrowid,)).fetchone()
        return row_to_note(row)


@app.put("/notes/{note_id}")
def update_note(note_id: int, note: NoteUpdate):
    with get_conn() as conn:
        existing = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Note not found")

        new_title = note.title if note.title is not None else existing["title"]
        new_content = note.content if note.content is not None else existing["content"]
        now = datetime.utcnow().isoformat()

        conn.execute(
            "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
            (new_title, new_content, now, note_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        return row_to_note(row)


@app.delete("/notes/{note_id}")
def delete_note(note_id: int):
    with get_conn() as conn:
        existing = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Note not found")
        conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
    return {"ok": True}


@app.delete("/notes")
def clear_notes():
    """Delete ALL notes. Used by the 'Clear sample data' button."""
    with get_conn() as conn:
        conn.execute("DELETE FROM notes")
        conn.commit()
    return {"ok": True}


@app.get("/")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}
