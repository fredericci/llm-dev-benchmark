// Base Express app with in-memory users store
// The model must generate the POST /users endpoint implementation

const express = require('express');
const app = express();
app.use(express.json());

// In-memory users store
const users = [
  { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
  { id: 2, name: 'Bob Jones', email: 'bob@example.com' },
];

// TODO: The model must implement POST /users here

module.exports = { app, users };
