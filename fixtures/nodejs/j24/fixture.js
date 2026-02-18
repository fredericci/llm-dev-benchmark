// Task List with Optimistic Update
// The model must implement a React component that applies optimistic UI updates.
//
// Props:
//   - initialTasks: Array<{ id: number, title: string, completed: boolean }>
//   - onToggle: (id: number) => Promise<void>
//     Called when the user toggles a task. Resolves on success, rejects on failure.
//
// Behavior:
//   1. Render each task with its title and a checkbox reflecting completed status
//   2. When user clicks a checkbox:
//      a. IMMEDIATELY update the UI (toggle completed) — do NOT wait for the API
//      b. Call onToggle(id)
//      c. If onToggle resolves: keep the updated state (no-op)
//      d. If onToggle rejects: REVERT the UI to the previous state and show error
//   3. Error display: show the error message text when a toggle fails
//      The error can be dismissed or will be replaced by the next error
//   4. Each task should be rendered with a checkbox input and the task title as label
//
// The component must be exported as default.
// Example usage:
//   <TaskList initialTasks={tasks} onToggle={handleToggle} />

const React = require('react');
