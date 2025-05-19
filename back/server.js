const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { typeDefs, resolvers } = require('./schema');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_managment',
};

let connection;

async function connectToDatabase() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL');
    app.locals.db = connection;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

connectToDatabase();

const JWT_SECRET = 'YOUR_SECRET_KEY';

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    let userId = null;
    let userRole = null;

    if (token) {
      try {
        const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(tokenValue, JWT_SECRET);
        userId = decoded.userId;
        userRole = decoded.role;
      } catch (e) {
        console.error('Token verification failed:', e.message);
      }
    }

    return {
      userId,
      userRole,
      db: connection,
    };
  },
});

async function startServer() {
  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

 
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: token missing'));
    }
    try {
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.user.userId} (${socket.user.role})`);
    
   
    socket.join(`user_${socket.user.userId}`);

    socket.on('message', async (msg) => {
      try {
        console.log('🟡 Message received:', msg);
        
       
        const senderId = Number(msg.sender_id);
        const receiverId = Number(msg.receiver_id);
        const content = String(msg.content).trim();

        if (isNaN(senderId)) throw new Error('Invalid sender_id');
        if (isNaN(receiverId)) throw new Error('Invalid receiver_id');
        if (!content) throw new Error('Message content is empty');
        if (content.length > 1000) throw new Error('Message too long');

       
        if (senderId !== socket.user.userId) {
          throw new Error('Sender ID does not match authenticated user');
        }

       
        const [receiver] = await connection.execute(
          'SELECT id FROM users WHERE id = ?',
          [receiverId]
        );
        if (receiver.length === 0) {
          throw new Error('Receiver does not exist');
        }

        const createdAt = new Date();
        const [result] = await connection.execute(
          'INSERT INTO messages (content, sender_id, receiver_id, is_read, created_at) VALUES (?, ?, ?, FALSE, ?)',
          [content, senderId, receiverId, createdAt]
        );

        
        const [savedMessage] = await connection.execute(
          `SELECT m.*, 
           u1.username as sender_name,
           u2.username as receiver_name
           FROM messages m
           JOIN users u1 ON m.sender_id = u1.id
           JOIN users u2 ON m.receiver_id = u2.id
           WHERE m.id = ?`,
          [result.insertId]
        );

        const fullMessage = {
          ...savedMessage[0],
          created_at: savedMessage[0].created_at.toISOString()
        };

        console.log('📤 Broadcasting message:', fullMessage);
        
        // Emit to both sender and receiver
        io.to(`user_${senderId}`).emit('new_message', fullMessage);
        io.to(`user_${receiverId}`).emit('new_message', fullMessage);

      
        socket.emit('message_ack', { 
          status: 'success',
          messageId: result.insertId 
        });

      } catch (err) {
        console.error('❌ Message handling error:', err.message);
        socket.emit('error', { 
          status: 'error',
          message: err.message 
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔴 User disconnected: ${socket.user.userId}`);
    });
  });

  const PORT = process.env.PORT || 3002;
  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP server running on http://localhost:${PORT}`);
    console.log(`🚀 GraphQL endpoint: http://localhost:${PORT}${apolloServer.graphqlPath}`);
    console.log(`🔌 Socket.IO server running on http://localhost:${PORT}`);
  });
}

startServer();
