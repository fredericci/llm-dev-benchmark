const React = require('react');
const { render, screen, within } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
require('@testing-library/jest-dom');

const CheckoutForm = require('./checkout-form.jsx');
const FormComponent = CheckoutForm.default || CheckoutForm;

describe('Multi-step Checkout Form', () => {
  let onSubmit;

  beforeEach(() => {
    onSubmit = jest.fn();
  });

  test('renders step 1 initially with personal info fields', () => {
    render(<FormComponent onSubmit={onSubmit} />);

    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  test('Next button does not advance when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /next/i }));

    // Should still be on step 1
    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
  });

  test('advances to step 2 when all step 1 fields are filled', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText(/step 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street/i)).toBeInTheDocument();
  });

  test('Back button returns to previous step with data preserved', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    // Fill step 1
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Go back to step 1
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('1234567890');
  });

  test('step 2 has "Same as billing" checkbox that hides billing fields when checked', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    // Go to step 2
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Same as billing should be checked by default
    const checkbox = screen.getByRole('checkbox', { name: /same as billing/i });
    expect(checkbox).toBeChecked();

    // Billing fields should NOT be visible
    expect(screen.queryByLabelText(/billing street/i)).not.toBeInTheDocument();

    // Uncheck to show billing fields
    await user.click(checkbox);
    expect(screen.getByLabelText(/billing street/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/billing city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/billing zip/i)).toBeInTheDocument();
  });

  test('step 3 shows card fields by default', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    // Navigate to step 3
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Springfield');
    await user.type(screen.getByLabelText(/zip/i), '12345');
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText(/step 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expiry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/cpf/i)).not.toBeInTheDocument();
  });

  test('switching to boleto payment shows CPF field and hides card fields', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    // Navigate to step 3
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Springfield');
    await user.type(screen.getByLabelText(/zip/i), '12345');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Select boleto
    const boletoRadio = screen.getByRole('radio', { name: /boleto/i });
    await user.click(boletoRadio);

    expect(screen.getByLabelText(/cpf/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
  });

  test('submit calls onSubmit with all form data', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    // Step 1
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2
    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Springfield');
    await user.type(screen.getByLabelText(/zip/i), '12345');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3 - card payment
    await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
    await user.type(screen.getByLabelText(/expiry/i), '12/25');
    await user.type(screen.getByLabelText(/cvv/i), '123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const data = onSubmit.mock.calls[0][0];
    expect(data.name).toBe('John Doe');
    expect(data.email).toBe('john@example.com');
    expect(data.phone).toBe('1234567890');
    expect(data.street).toBe('123 Main St');
    expect(data.city).toBe('Springfield');
    expect(data.zip).toBe('12345');
    expect(data.paymentType).toBe('card');
    expect(data.cardNumber).toBe('4111111111111111');
  });

  test('submit is disabled when required step 3 fields are empty', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    // Navigate to step 3
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Springfield');
    await user.type(screen.getByLabelText(/zip/i), '12345');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Don't fill card fields — submit should be disabled
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(submitBtn).toBeDisabled();
  });
});
