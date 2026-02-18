const React = require('react');
const { render, screen, waitFor, act } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
require('@testing-library/jest-dom');

const SearchInput = require('./search.jsx');
const SearchComponent = SearchInput.default || SearchInput;

describe('Debounced Search Input', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders an input with placeholder "Search..."', () => {
    const onSearch = jest.fn(() => Promise.resolve([]));
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  test('does not call onSearch before debounce delay', async () => {
    const onSearch = jest.fn(() => Promise.resolve([]));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'hel');

    // Advance only 200ms — should NOT have called onSearch yet
    act(() => { jest.advanceTimersByTime(200); });
    expect(onSearch).not.toHaveBeenCalled();
  });

  test('calls onSearch after debounce delay', async () => {
    const onSearch = jest.fn(() => Promise.resolve(['Hello World']));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'hello');

    // Advance past debounce
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('hello');
    });
  });

  test('shows "Searching..." while waiting for results', async () => {
    const onSearch = jest.fn(() => new Promise(() => {})); // never resolves
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'test');
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });
  });

  test('shows results after successful search', async () => {
    const onSearch = jest.fn(() => Promise.resolve(['React', 'Redux', 'Router']));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'rea');
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });
    expect(screen.getByText('Redux')).toBeInTheDocument();
    expect(screen.getByText('Router')).toBeInTheDocument();
    expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
  });

  test('shows "No results found" when search returns empty array', async () => {
    const onSearch = jest.fn(() => Promise.resolve([]));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'xyz');
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  test('shows error message when search fails', async () => {
    const onSearch = jest.fn(() => Promise.reject(new Error('Network error')));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'fail');
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  test('clear button resets input and results', async () => {
    const onSearch = jest.fn(() => Promise.resolve(['Result 1']));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'test');
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText('Result 1')).toBeInTheDocument();
    });

    // Click clear
    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(input).toHaveValue('');
    expect(screen.queryByText('Result 1')).not.toBeInTheDocument();
  });

  test('only the latest search result is displayed when typing rapidly', async () => {
    let resolvers = [];
    const onSearch = jest.fn((query) => {
      return new Promise((resolve) => {
        resolvers.push({ query, resolve });
      });
    });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SearchComponent onSearch={onSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText(/search/i);

    // Type "ab" and wait for debounce
    await user.type(input, 'ab');
    act(() => { jest.advanceTimersByTime(300); });

    // Type more — "abc" — before first search completes
    await user.clear(input);
    await user.type(input, 'abc');
    act(() => { jest.advanceTimersByTime(300); });

    // Resolve the FIRST search (stale) with "Old Result"
    await act(async () => {
      resolvers[0].resolve(['Old Result']);
    });

    // Resolve the SECOND search with "New Result"
    await act(async () => {
      resolvers[1].resolve(['New Result']);
    });

    // Only the latest result should be shown
    await waitFor(() => {
      expect(screen.getByText('New Result')).toBeInTheDocument();
    });
    expect(screen.queryByText('Old Result')).not.toBeInTheDocument();
  });
});
