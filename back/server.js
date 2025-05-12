const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt'); // Import bcrypt
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const cors = require('cors'); // Import cors for cross-origin requests
const { typeDefs, resolvers } = require('./schema');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const studentRoutes = require('./studentRoutes');

// Use routes
app.use('/api/student', studentRoutes);

// Replace with your MySQL credentials
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'task_managment',
};

let connection;

async function connectToDatabase() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to the MySQL database.');

    // Make the database connection available to routes
    app.locals.db = connection;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    // Exit the process or handle the error appropriately
    process.exit(1);
  }
}

connectToDatabase();

// Define a secret key for JWT - in production, use environment variables
const JWT_SECRET = 'YOUR_SECRET_KEY'; // Make sure this matches the key in schema.js

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Get the user token from the headers
    const token = req.headers.authorization || '';

    // Try to retrieve a user with the token
    let userId = null;
    let userRole = null;

    if (token) {
      try {
        // Verify the token and extract the user ID
        const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
        console.log('Token received:', token);
        console.log('Token to verify:', tokenValue);

        const decoded = jwt.verify(tokenValue, JWT_SECRET);
        console.log('Decoded token:', decoded);

        userId = decoded.userId;
        userRole = decoded.role;

        console.log('User authenticated:', { userId, userRole });
      } catch (e) {
        console.error('Error verifying token:', e.message);
        // Invalid token - don't set userId
      }
    } else {
      console.log('No token provided in request');
    }

    // Add the user ID and database connection to the context
    return {
      userId,
      userRole,
      db: connection
    };
  }
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 3002; // Using a different port like 3002 for backend
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GraphQL endpoint at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();