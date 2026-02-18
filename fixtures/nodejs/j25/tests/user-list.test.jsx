const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
require('@testing-library/jest-dom');

const UserList = require('./user-list.jsx');
const UserListComponent = UserList.default || UserList;

const mockUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
  { id: 3, name: 'Carol White', email: 'carol@example.com' },
];

describe('UserList - Async State Management', () => {
  test('shows loading indicator while fetching', async () => {
    const fetchUsers = () => new Promise(() => {}); // never resolves
    render(<UserListComponent fetchUsers={fetchUsers} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('shows user list after successful fetch', async () => {
    const fetchUsers = () => Promise.resolve(mockUsers);
    render(<UserListComponent fetchUsers={fetchUsers} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  test('shows empty state when fetch returns empty array', async () => {
    const fetchUsers = () => Promise.resolve([]);
    render(<UserListComponent fetchUsers={fetchUsers} />);

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  test('shows error message when fetch fails', async () => {
    const fetchUsers = () => Promise.reject(new Error('Network error'));
    render(<UserListComponent fetchUsers={fetchUsers} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  test('shows retry button when fetch fails', async () => {
    const fetchUsers = () => Promise.reject(new Error('Server error'));
    render(<UserListComponent fetchUsers={fetchUsers} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  test('retry button triggers a new fetch and shows loading', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    const fetchUsers = () => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('First attempt failed'));
      }
      return new Promise(() => {}); // second call never resolves (to check loading)
    };

    render(<UserListComponent fetchUsers={fetchUsers} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/first attempt failed/i)).toBeInTheDocument();
    });

    // Click retry
    await user.click(screen.getByRole('button', { name: /retry/i }));

    // Should show loading again
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    expect(callCount).toBe(2);
  });

  test('retry with success shows users', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    const fetchUsers = () => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Temporary failure'));
      }
      return Promise.resolve(mockUsers);
    };

    render(<UserListComponent fetchUsers={fetchUsers} />);

    // Wait for error
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    // Click retry
    await user.click(screen.getByRole('button', { name: /retry/i }));

    // Should eventually show users
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  test('loading and data are never shown simultaneously', async () => {
    const fetchUsers = () => Promise.resolve(mockUsers);
    render(<UserListComponent fetchUsers={fetchUsers} />);

    // Initially should show loading
    if (screen.queryByText(/loading/i)) {
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    }

    // After load, should show data without loading
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
