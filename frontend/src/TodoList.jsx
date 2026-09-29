import { useEffect, useRef, useState } from "react";
import "./TodoList.css";

const API = "http://localhost:8000";

function isOverdue(task) {
  if (!task.due_date || task.done) return false;
  return new Date(task.due_date).getTime() < Date.now();
}

function formatDue(due_date) {
  if (!due_date) return null;
  const d = new Date(due_date);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TodoList() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const notifiedIds = useRef(new Set());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      tasks.forEach((t) => {
        if (
          !t.done &&
          t.due_date &&
          !notifiedIds.current.has(t.id) &&
          new Date(t.due_date).getTime() <= Date.now()
        ) {
          notifiedIds.current.add(t.id);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Todo reminder", { body: t.text });
          }
        }
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [tasks]);

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/tasks`);
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setError("Can't reach the backend. Is it running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function addTask(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, due_date: dueDate || null }),
      });
      const newTask = await res.json();
      setTasks((prev) => [...prev, newTask]);
      setText("");
      setDueDate("");
    } catch (e) {
      setError("Could not add task.");
    }
  }

  async function toggleDone(task) {
    const updated = { ...task, done: !task.done };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    await fetch(`${API}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: updated.done }),
    });
  }

  async function deleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
  }

  function handleDragStart(index) {
    dragItem.current = index;
  }

  function handleDragEnter(index) {
    dragOverItem.current = index;
  }

  async function handleDragEnd() {
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    if (from === null || to === null || from === to) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setTasks(reordered);

    await fetch(`${API}/tasks/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: reordered.map((t, i) => ({ id: t.id, position: i })),
      }),
    });
  }

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="panel">
      <p className="sub">Drag tasks to reorder. Overdue tasks turn red.</p>

      {error && <div className="banner">{error}</div>}

      <form className="add-form" onSubmit={addTask}>
        <input
          type="text"
          placeholder="Add a task..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          title="Optional reminder time"
        />
        <button type="submit">Add</button>
      </form>

      {loading ? (
        <p className="empty">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="empty">No tasks yet — add one above.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={[
                task.done ? "done" : "",
                isOverdue(task) ? "overdue" : "",
              ].join(" ")}
            >
              <span className="handle">⠿</span>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleDone(task)}
              />
              <div className="task-body">
                <span className="task-text">{task.text}</span>
                {task.due_date && (
                  <span className="due">{formatDue(task.due_date)}</span>
                )}
              </div>
              <button className="del" onClick={() => deleteTask(task.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="footer">{remaining} task{remaining !== 1 ? "s" : ""} left</div>
    </div>
  );
}
