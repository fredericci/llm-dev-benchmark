// User List Component with Full Async State Management
// The model must implement a React component that handles ALL async states.
//
// Props:
//   - fetchUsers: () => Promise<Array<{ id: number, name: string, email: string }>>
//     A function that fetches users. It may resolve with data, resolve with an
//     empty array, or reject with an Error.
//
// Required states to handle:
//   1. Loading: show a loading indicator with text "Loading..." while fetching
//   2. Success: show a list of users (each user's name and email visible)
//   3. Empty: show "No users found" when fetchUsers resolves with []
//   4. Error: show the error message and a "Retry" button
//   5. After retry: show loading again, then the appropriate result state
//
// Rules:
//   - fetchUsers must be called on mount (useEffect)
//   - Loading and data/error must never be shown simultaneously
//   - Each user should be rendered in an element with the user's name and email visible
//   - The retry button must have accessible text "Retry"
//   - The component must be exported as default
//
// Example usage:
//   <UserList fetchUsers={myFetchFn} />

const React = require('react');
