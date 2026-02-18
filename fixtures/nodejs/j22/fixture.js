// Debounced Search Component
// The model must implement a search-as-you-type component with debounce.
//
// Props:
//   - onSearch: (query: string) => Promise<string[]>
//     Called with the search query after debounce. Returns matching results.
//     May reject with an Error on failure.
//   - debounceMs: number (default 300) — debounce delay in milliseconds
//
// Requirements:
//   - An input field with placeholder "Search..."
//   - Debounce: onSearch is NOT called on every keystroke; only after the user
//     stops typing for debounceMs milliseconds
//   - While waiting for results, show "Searching..." text
//   - On success with results: render each result as a list item
//   - On success with empty array: show "No results found"
//   - On error: show the error message
//   - A clear button (text "Clear") that:
//     * Clears the input
//     * Clears any displayed results/errors
//     * Cancels any pending search
//   - If the user types again before the previous search completes,
//     the previous search result should be discarded (only latest matters)
//
// The component must be exported as default.
// Example usage:
//   <SearchInput onSearch={mySearchFn} debounceMs={300} />

const React = require('react');
