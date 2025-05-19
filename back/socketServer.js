import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_managment',
});

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async (socket, request) => {
  
  const params = new URLSearchParams(request.url.replace('/?', ''));
  const token = params.get('token');

  if (!token) {
    socket.close(4001, 'Unauthorized: No token provided');
    return;
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    
    socket.user = {
      id: decoded.id,
      role: decoded.role,
    };
  } catch (err) {
    socket.close(4002, 'Unauthorized: Invalid token');
    return;
  }

  console.log(`User ${socket.user.id} connected`);

  socket.on('message', async (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      socket.send(JSON.stringify({ error: 'Invalid JSON format' }));
      return;
    }

   
    const senderId = Number(msg.sender_id);
    const receiverId = Number(msg.receiver_id);
    const content = msg.content;

    if (
      !msg ||
      Number.isNaN(senderId) ||
      Number.isNaN(receiverId) ||
      typeof content !== 'string' ||
      !content.trim()
    ) {
      console.warn('Invalid message structure:', msg);
      socket.send(JSON.stringify({ error: 'Invalid message format' }));
      return;
    }

   
    if (senderId !== socket.user.id) {
      console.warn('Sender ID mismatch:', senderId, 'authenticated:', socket.user.id);
      socket.send(JSON.stringify({ error: 'Sender ID mismatch' }));
      return;
    }

    try {
     
      const now = new Date();
      const [result] = await pool.query(
        'INSERT INTO messages (content, sender_id, receiver_id, is_read, created_at) VALUES (?, ?, ?, ?, ?)',
        [content, senderId, receiverId, false, now]
      );

      const messageId = result.insertId;

      const fullMessage = {
        id: messageId,
        content,
        sender_id: senderId,
        receiver_id: receiverId,
        is_read: false,
        created_at: now,
      };

      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          if (
            client.user &&
            (client.user.id === senderId || client.user.id === receiverId)
          ) {
            client.send(JSON.stringify({ type: 'new_message', message: fullMessage }));
          }
        }
      });
    } catch (dbError) {
      console.error('DB error:', dbError);
      socket.send(JSON.stringify({ error: 'Failed to save message' }));
    }
  });

  socket.on('close', () => {
    console.log(`User ${socket.user.id} disconnected`);
  });
});
