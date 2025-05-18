const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'YOUR_SECRET_KEY';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

router.get('/tasks', authenticateToken, async (req, res) => {
  if (req.userRole !== 'student') {
    return res.status(403).json({ error: 'Access denied. Only students can access this endpoint.' });
  }

  try {
    const db = req.app.locals.db;

    const [rows] = await db.execute(
      `SELECT t.*, p.name as project_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.assigned_to = ?`,
      [req.userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching student tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/test', (req, res) => {
  res.json({ message: 'Student API is working!' });
});

router.get('/messages', authenticateToken, async (req, res) => {
  if (req.userRole !== 'student') {
    return res.status(403).json({ error: 'Access denied. Only students can access this endpoint.' });
  }

  try {
    const db = req.app.locals.db;

    const [rows] = await db.execute(
      `SELECT m.*,
              s.username as sender_username,
              r.username as receiver_username
       FROM messages m
       LEFT JOIN users s ON m.sender_id = s.id
       LEFT JOIN users r ON m.receiver_id = r.id
       WHERE (m.sender_id = ? AND m.receiver_id = 1) OR (m.sender_id = 1 AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [req.userId, req.userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching student messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', authenticateToken, async (req, res) => {
  if (req.userRole !== 'student') {
    return res.status(403).json({ error: 'Access denied. Only students can access this endpoint.' });
  }

  if (!req.body || !req.body.content) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const { content } = req.body;

  try {
    const db = req.app.locals.db;

    const [result] = await db.execute(
      `INSERT INTO messages (sender_id, receiver_id, content, is_read)
       VALUES (?, ?, ?, ?)`,
      [req.userId, 1, content, 0] 
    );

    const [messages] = await db.execute(
      `SELECT m.*,
              s.username as sender_username,
              r.username as receiver_username
       FROM messages m
       LEFT JOIN users s ON m.sender_id = s.id
       LEFT JOIN users r ON m.receiver_id = r.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    if (messages.length === 0) {
      return res.status(201).json({
        id: result.insertId,
        content: content,
        sender_id: req.userId,
        receiver_id: 1,
        is_read: 0,
        created_at: new Date().toISOString()
      });
    }
router.get('/messages', authenticateStudent, async (req, res) => {
  const userId = req.user.id;
  const [rows] = await req.app.locals.db.execute(
    'SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at ASC',
    [userId, userId]
  );
  res.json(rows);
});

    res.status(201).json(messages[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message: ' + error.message });
  }
});

module.exports = router;
