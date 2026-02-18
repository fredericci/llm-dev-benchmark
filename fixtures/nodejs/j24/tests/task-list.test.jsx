const React = require('react');
const { render, screen, waitFor, act } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
require('@testing-library/jest-dom');

const TaskList = require('./task-list.jsx');
const TaskListComponent = TaskList.default || TaskList;

const initialTasks = [
  { id: 1, title: 'Buy groceries', completed: false },
  { id: 2, title: 'Clean house', completed: true },
  { id: 3, title: 'Write tests', completed: false },
];

describe('TaskList - Optimistic Update', () => {
  test('renders all tasks with correct initial state', () => {
    const onToggle = jest.fn(() => Promise.resolve());
    render(<TaskListComponent initialTasks={initialTasks} onToggle={onToggle} />);

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('Clean house')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeChecked(); // Buy groceries
    expect(checkboxes[1]).toBeChecked();     // Clean house
    expect(checkboxes[2]).not.toBeChecked(); // Write tests
  });

  test('clicking checkbox updates UI immediately (optimistic)', async () => {
    const user = userEvent.setup();
    // onToggle never resolves — we want to verify UI updates BEFORE promise settles
    const onToggle = jest.fn(() => new Promise(() => {}));
    render(<TaskListComponent initialTasks={initialTasks} onToggle={onToggle} />);

    const checkboxes = screen.getAllByRole('checkbox');

    // Click first checkbox (Buy groceries: false -> true)
    await user.click(checkboxes[0]);

    // UI should update immediately even though onToggle hasn't resolved
    expect(checkboxes[0]).toBeChecked();
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  test('UI stays updated after successful onToggle', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn(() => Promise.resolve());
    render(<TaskListComponent initialTasks={initialTasks} onToggle={onToggle} />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Toggle "Buy groceries"

    // Wait for promise to resolve
    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(1);
    });

    // UI should remain toggled
    expect(checkboxes[0]).toBeChecked();
  });

  test('UI reverts after failed onToggle', async () => {
    const user = userEvent.setup();
    let rejectFn;
    const onToggle = jest.fn(() => new Promise((_, reject) => { rejectFn = reject; }));
    render(<TaskListComponent initialTasks={initialTasks} onToggle={onToggle} />);

    const checkboxes = screen.getAllByRole('checkbox');

    // Initially unchecked
    expect(checkboxes[0]).not.toBeChecked();

    // Click to toggle
    await user.click(checkboxes[0]);

    // Optimistically checked (promise still pending)
    expect(checkboxes[0]).toBeChecked();

    // Now reject the promise
    await act(async () => {
      rejectFn(new Error('Server error'));
    });

    // After rejection, should revert
    await waitFor(() => {
      expect(checkboxes[0]).not.toBeChecked();
    });
  });

  test('shows error message after failed toggle', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn(() => Promise.reject(new Error('Server error')));
    render(<TaskListComponent initialTasks={initialTasks} onToggle={onToggle} />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  test('toggling a completed task unchecks it optimistically', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn(() => new Promise(() => {}));
    render(<TaskListComponent initialTasks={initialTasks} onToggle={onToggle} />);

    const checkboxes = screen.getAllByRole('checkbox');

    // "Clean house" is initially checked
    expect(checkboxes[1]).toBeChecked();

    await user.click(checkboxes[1]);

    // Should be unchecked optimistically
    expect(checkboxes[1]).not.toBeChecked();
    expect(onToggle).toHaveBeenCalledWith(2);
  });

  test('reverting a completed->uncompleted toggle restores checked state', async () => {
    const user = userEvent.setup();
    let rejectFn;
    const onToggle = jest.fn(() => new Promise((_, reject) => { rejectFn = reject; }));
    render(<TaskListComponent initialTasks={initialTasks} onToggle={onToggle} />);

    const checkboxes = screen.getAllByRole('checkbox');

    // "Clean house" is initially checked
    expect(checkboxes[1]).toBeChecked();

    await user.click(checkboxes[1]);

    // Optimistically unchecked (promise still pending)
    expect(checkboxes[1]).not.toBeChecked();

    // Now reject the promise
    await act(async () => {
      rejectFn(new Error('Failed'));
    });

    // After failure, should revert to checked
    await waitFor(() => {
      expect(checkboxes[1]).toBeChecked();
    });
  });
});
