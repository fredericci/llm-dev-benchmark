const express = require('express');
const app = express();
app.use(express.json());

// In-memory users store
const users = [
  { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
  { id: 2, name: 'Bob Jones', email: 'bob@example.com' },
];

// POST /users endpoint
app.post('/users', (req, res) => {
  const { name, email, password } = req.body;
  const errors = [];

  // Validate name
  if (!name || name.length < 2) {
    errors.push('Name is required and must be at least 2 characters long.');
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Email is required and must be a valid email address.');
  } else if (users.some(user => user.email === email)) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  // Validate password
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    errors.push('Password is required and must be at least 8 characters long, contain at least 1 uppercase letter and 1 number.');
  }

  // Return errors if any
  if (errors.length > 0) {
    return res.status(400).json(errors);
  }

  // Create new user
  const newUser = {
    id: users.length + 1,
    name,
    email
  };
  users.push(newUser);

  // Return created user
  res.status(201).json(newUser);
});

module.exports = { app, users };