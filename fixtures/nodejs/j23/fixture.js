// Multi-step Checkout Form Component
// The model must implement a 3-step checkout form with conditional validation.
//
// Props:
//   - onSubmit: (data: FormData) => void — called with all form data when submitted
//
// FormData shape:
//   {
//     name: string,
//     email: string,
//     phone: string,
//     street: string,
//     city: string,
//     zip: string,
//     sameAsBilling: boolean,
//     billingStreet: string,    // only required if sameAsBilling is false
//     billingCity: string,      // only required if sameAsBilling is false
//     billingZip: string,       // only required if sameAsBilling is false
//     paymentType: 'card' | 'boleto',
//     cardNumber: string,       // only required if paymentType is 'card'
//     cardExpiry: string,       // only required if paymentType is 'card'
//     cardCvv: string,          // only required if paymentType is 'card'
//     cpf: string,              // only required if paymentType is 'boleto'
//   }
//
// Step 1 - Personal Info:
//   Fields: name, email, phone (all required, non-empty)
//   "Next" button advances to step 2 only if all fields are filled
//
// Step 2 - Address:
//   Fields: street, city, zip (all required)
//   Checkbox "Same as billing" (default checked) — when unchecked, show
//   billingStreet, billingCity, billingZip fields (all required when visible)
//   "Back" returns to step 1; "Next" advances to step 3
//
// Step 3 - Payment:
//   Radio/select: paymentType ('card' default, or 'boleto')
//   If card: show cardNumber, cardExpiry, cardCvv (all required)
//   If boleto: show cpf (required)
//   "Back" returns to step 2; "Submit" button calls onSubmit with all data
//   Submit is disabled until current step's required fields are valid
//
// Navigation:
//   - "Back" and "Next" buttons for navigation
//   - Going back and forward preserves all entered data
//   - Step indicator showing current step (e.g., "Step 1 of 3")
//
// The component must be exported as default.
// Example usage:
//   <CheckoutForm onSubmit={handleSubmit} />

const React = require('react');
