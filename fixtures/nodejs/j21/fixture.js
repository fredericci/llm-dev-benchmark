// Accessible Dropdown Menu Component
// The model must implement a fully accessible dropdown menu using React.
//
// Props:
//   - items: Array<{ id: number, label: string }> — menu items to render
//   - onSelect: (item: { id: number, label: string }) => void — called when an item is selected
//   - label: string — text for the trigger button
//
// Accessibility requirements:
//   - Trigger button has aria-haspopup="true" and aria-expanded (true/false)
//   - Menu container has role="menu"
//   - Each item has role="menuitem"
//   - Arrow Down / Arrow Up navigates between items
//   - Enter or Space selects the focused item
//   - Escape closes the menu and returns focus to the trigger button
//   - Clicking outside the menu closes it
//   - When menu opens, first item receives focus
//   - Tab should close the menu (prevent focus from moving into menu via Tab)
//
// The component must be exported as default.
// Example usage:
//   <Dropdown items={items} onSelect={handleSelect} label="Actions" />

const React = require('react');
