import { useEffect, useState } from "react";
import "./Notes.css";

const API = "https://hng-project-i4ur.onrender.com";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null); // note currently open for editing
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveTimer, setSaveTimer] = useState(null);

  async function loadNotes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/notes`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setNotes(data);
    } catch (e) {
      setError("Can't reach the backend. Is it running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function addNote() {
    try {
      const res = await fetch(`${API}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled note", content: "" }),
      });
      const newNote = await res.json();
      setNotes((prev) => [newNote, ...prev]);
      openNote(newNote);
    } catch (e) {
      setError("Could not create note.");
    }
  }

  function openNote(note) {
    setActiveId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
  }

  function closeEditor() {
    setActiveId(null);
  }

  // Debounced autosave while typing in the editor.
  function scheduleSave(id, title, content) {
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        const updated = await res.json();
        setNotes((prev) =>
          [updated, ...prev.filter((n) => n.id !== id)].sort(
            (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
          )
        );
      } catch (e) {
        setError("Could not save note.");
      }
    }, 500);
    setSaveTimer(t);
  }

  function handleTitleChange(e) {
    const value = e.target.value;
    setDraftTitle(value);
    scheduleSave(activeId, value, draftContent);
  }

  function handleContentChange(e) {
    const value = e.target.value;
    setDraftContent(value);
    scheduleSave(activeId, draftTitle, value);
  }

  async function deleteNote(id, e) {
    e.stopPropagation();
    if (!window.confirm("Delete this note?")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
    try {
      await fetch(`${API}/notes/${id}`, { method: "DELETE" });
    } catch (e) {
      setError("Could not delete note.");
    }
  }

  if (activeId !== null) {
    // Editor view
    return (
      <div className="panel">
        <button className="back-btn" onClick={closeEditor}>
          ← Back to notes
        </button>
        <input
          className="editor-title"
          value={draftTitle}
          onChange={handleTitleChange}
          placeholder="Note title"
        />
        <textarea
          className="editor-content"
          value={draftContent}
          onChange={handleContentChange}
          placeholder="Write your note..."
          rows={14}
        />
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="sub">Your notes, saved automatically as you type.</p>

      {error && <div className="banner">{error}</div>}

      <button className="add-note-btn" onClick={addNote}>
        + New note
      </button>

      {loading ? (
        <p className="empty">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="empty">No notes yet — create one above.</p>
      ) : (
        <ul className="note-list">
          {notes.map((note) => (
            <li key={note.id} onClick={() => openNote(note)}>
              <div className="note-body">
                <span className="note-title">
                  {note.title?.trim() || "Untitled note"}
                </span>
                <span className="note-preview">
                  {note.content?.trim() || "No content"}
                </span>
                <span className="note-time">{formatTime(note.updated_at)}</span>
              </div>
              <button className="del" onClick={(e) => deleteNote(note.id, e)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
