const React = require('react');
const { render, screen, within } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
require('@testing-library/jest-dom');

const Dropdown = require('./dropdown.jsx');
const DropdownComponent = Dropdown.default || Dropdown;

const items = [
  { id: 1, label: 'Edit' },
  { id: 2, label: 'Duplicate' },
  { id: 3, label: 'Delete' },
  { id: 4, label: 'Archive' },
];

describe('Accessible Dropdown', () => {
  let onSelect;

  beforeEach(() => {
    onSelect = jest.fn();
  });

  test('renders a trigger button with the provided label', () => {
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    expect(screen.getByRole('button', { name: /actions/i })).toBeInTheDocument();
  });

  test('menu is closed by default and trigger has aria-expanded="false"', () => {
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    const trigger = screen.getByRole('button', { name: /actions/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('trigger has aria-haspopup="true"', () => {
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    const trigger = screen.getByRole('button', { name: /actions/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
  });

  test('clicking trigger opens the menu with aria-expanded="true"', async () => {
    const user = userEvent.setup();
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    const trigger = screen.getByRole('button', { name: /actions/i });

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  test('menu items have role="menuitem" and correct labels', async () => {
    const user = userEvent.setup();
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    await user.click(screen.getByRole('button', { name: /actions/i }));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(4);
    expect(menuItems[0]).toHaveTextContent('Edit');
    expect(menuItems[1]).toHaveTextContent('Duplicate');
    expect(menuItems[2]).toHaveTextContent('Delete');
    expect(menuItems[3]).toHaveTextContent('Archive');
  });

  test('clicking trigger again closes the menu', async () => {
    const user = userEvent.setup();
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    const trigger = screen.getByRole('button', { name: /actions/i });

    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('pressing Escape closes the menu and focuses the trigger', async () => {
    const user = userEvent.setup();
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    const trigger = screen.getByRole('button', { name: /actions/i });

    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('Arrow Down moves focus to the next menu item', async () => {
    const user = userEvent.setup();
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    await user.click(screen.getByRole('button', { name: /actions/i }));

    const menuItems = screen.getAllByRole('menuitem');

    // First item should be focused after opening
    expect(menuItems[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(menuItems[1]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(menuItems[2]).toHaveFocus();
  });

  test('Arrow Up moves focus to the previous menu item', async () => {
    const user = userEvent.setup();
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    await user.click(screen.getByRole('button', { name: /actions/i }));

    const menuItems = screen.getAllByRole('menuitem');

    // Move to second item first
    await user.keyboard('{ArrowDown}');
    expect(menuItems[1]).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(menuItems[0]).toHaveFocus();
  });

  test('Enter on a focused item selects it and closes the menu', async () => {
    const user = userEvent.setup();
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    await user.click(screen.getByRole('button', { name: /actions/i }));

    await user.keyboard('{ArrowDown}'); // Focus on "Duplicate"
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(items[1]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('clicking a menu item selects it and closes the menu', async () => {
    const user = userEvent.setup();
    render(<DropdownComponent items={items} onSelect={onSelect} label="Actions" />);
    await user.click(screen.getByRole('button', { name: /actions/i }));

    const menuItems = screen.getAllByRole('menuitem');
    await user.click(menuItems[2]); // Click "Delete"

    expect(onSelect).toHaveBeenCalledWith(items[2]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
