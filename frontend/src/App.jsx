import { useState } from "react";
import "./App.css";
import TodoList from "./TodoList.jsx";
import Notes from "./Notes.jsx";

const API = "https://hng-project-i4ur.onrender.com";

const SAMPLE_TASKS = [
  { text: "Submit HNG Stage 1", due_date: pastISO(2) }, // overdue on purpose
  { text: "Buy groceries", due_date: futureISO(4) },
  { text: "Walk the dog", due_date: null },
  { text: "Read a chapter of a book", due_date: null, done: true },
];

const SAMPLE_NOTES = [
  { title: "Grocery list", content: "Milk, eggs, bread, coffee, rice." },
  { title: "Project ideas", content: "A recipe app. A budget tracker. A habit tracker." },
  { title: "Meeting notes", content: "Follow up with the team about the deploy on Friday." },
];

function pastISO(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString().slice(0, 16);
}
function futureISO(hoursAhead) {
  return new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString().slice(0, 16);
}

export default function App() {
  const [tab, setTab] = useState("todo"); // "todo" | "notes"
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadSampleData() {
    setBusy(true);
    setMessage(null);
    try {
      for (const task of SAMPLE_TASKS) {
        const res = await fetch(`${API}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: task.text, due_date: task.due_date }),
        });
        const created = await res.json();
        if (task.done) {
          await fetch(`${API}/tasks/${created.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done: true }),
          });
        }
      }
      for (const note of SAMPLE_NOTES) {
        await fetch(`${API}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(note),
        });
      }
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setMessage("Could not load sample data. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  async function clearData() {
    setBusy(true);
    setMessage(null);
    try {
      await fetch(`${API}/tasks`, { method: "DELETE" });
      await fetch(`${API}/notes`, { method: "DELETE" });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setMessage("Could not clear data. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <h1>{tab === "todo" ? "Todo List" : "Notes"}</h1>

      <div className="tabs">
        <button
          className={tab === "todo" ? "active" : ""}
          onClick={() => setTab("todo")}
        >
          Todo List
        </button>
        <button
          className={tab === "notes" ? "active" : ""}
          onClick={() => setTab("notes")}
        >
          Notes
        </button>
      </div>

      <div className="sample-data-row">
        <button disabled={busy} onClick={loadSampleData}>
          {busy ? "Working..." : "Load sample data"}
        </button>
        <button disabled={busy} onClick={clearData} className="secondary">
          Clear all data
        </button>
      </div>
      {message && <div className="banner">{message}</div>}

      {tab === "todo" ? (
        <TodoList refreshKey={refreshKey} />
      ) : (
        <Notes refreshKey={refreshKey} />
      )}
    </div>
  );
}
