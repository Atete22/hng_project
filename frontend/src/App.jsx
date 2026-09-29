import { useState } from "react";
import "./App.css";
import TodoList from "./TodoList.jsx";
import Notes from "./Notes.jsx";

export default function App() {
  const [tab, setTab] = useState("todo"); // "todo" | "notes"

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

      {tab === "todo" ? <TodoList /> : <Notes />}
    </div>
  );
}
