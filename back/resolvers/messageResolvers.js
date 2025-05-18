const { AuthenticationError, ForbiddenError } = require('apollo-server-express');

const messageResolvers = {
  Query: {
    getMessageThreads: async (_, __, context) => {
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }

      try {
        // Start transaction for consistent data
        await context.db.execute('START TRANSACTION');

        const [userRows] = await context.db.execute(
          `SELECT DISTINCT
            CASE
              WHEN sender_id = ? THEN receiver_id
              ELSE sender_id
            END AS user_id
           FROM messages
           WHERE sender_id = ? OR receiver_id = ?`,
          [context.userId, context.userId, context.userId]
        );

        const threads = [];

        for (const row of userRows) {
          const userId = row.user_id;
          if (!userId) continue;

          // Get user details
          const [userDetails] = await context.db.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
          );
          if (userDetails.length === 0) continue;

          // Get last message
          const [lastMessageRows] = await context.db.execute(
            `SELECT * FROM messages
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at DESC LIMIT 1`,
            [context.userId, userId, userId, context.userId]
          );

          // Get unread count
          const [unreadCountRows] = await context.db.execute(
            `SELECT COUNT(*) AS count FROM messages
             WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
            [userId, context.userId]
          );

          threads.push({
            user: userDetails[0],
            lastMessage: lastMessageRows.length > 0 ? lastMessageRows[0] : null,
            unreadCount: unreadCountRows[0].count
          });
        }

        // Commit transaction
        await context.db.execute('COMMIT');

        // Sort by most recent message
        threads.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
        });

        return threads;
      } catch (error) {
        // Rollback on error
        await context.db.execute('ROLLBACK');
        console.error('Error fetching message threads:', error);
        throw new Error('Failed to fetch message threads: ' + error.message);
      }
    },

    getUnreadMessagesCount: async (_, __, context) => {
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }

      try {
        const [rows] = await context.db.execute(
          'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
          [context.userId]
        );
        return rows[0].count;
      } catch (error) {
        console.error('Error fetching unread messages count:', error);
        throw new Error('Failed to fetch unread messages count: ' + error.message);
      }
    }
  },

  Mutation: {
    sendMessage: async (_, { receiverId, content }, context) => {
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }

      // Validate input
      if (!content || !content.trim()) {
        throw new Error('Message content cannot be empty');
      }
      if (content.length > 2000) {
        throw new Error('Message too long (max 2000 characters)');
      }

      try {
        // Start transaction
        await context.db.execute('START TRANSACTION');

        // Verify receiver exists
        const [receiverRows] = await context.db.execute(
          'SELECT * FROM users WHERE id = ?',
          [receiverId]
        );

        if (receiverRows.length === 0) {
          throw new Error(`User with ID ${receiverId} not found`);
        }

        // Check roles (students can only message admins)
        const [senderRows] = await context.db.execute(
          'SELECT role FROM users WHERE id = ?',
          [context.userId]
        );

        const senderRole = senderRows[0].role;
        const receiverRole = receiverRows[0].role;

        if (senderRole === 'student' && receiverRole === 'student') {
          throw new ForbiddenError('Students can only message admins');
        }

        // Insert message with explicit timestamp
        const [result] = await context.db.execute(
          'INSERT INTO messages (content, sender_id, receiver_id, is_read, created_at) VALUES (?, ?, ?, FALSE, NOW())',
          [content.trim(), context.userId, receiverId]
        );

        if (!result.insertId) {
          throw new Error('Failed to insert message');
        }

        // Get the full message with joins
        const [messageRows] = await context.db.execute(
          `SELECT m.*, 
           u1.username as sender_name,
           u2.username as receiver_name
           FROM messages m
           JOIN users u1 ON m.sender_id = u1.id
           JOIN users u2 ON m.receiver_id = u2.id
           WHERE m.id = ?`,
          [result.insertId]
        );

        if (messageRows.length === 0) {
          throw new Error('Failed to retrieve created message');
        }

        // Commit transaction
        await context.db.execute('COMMIT');

        // Format the response
        const message = messageRows[0];
        return {
          ...message,
          id: message.id.toString(),
          isRead: Boolean(message.is_read),
          createdAt: message.created_at.toISOString(),
          sender: {
            id: message.sender_id,
            username: message.sender_name
          },
          receiver: {
            id: message.receiver_id,
            username: message.receiver_name
          }
        };

      } catch (error) {
        // Rollback on error
        await context.db.execute('ROLLBACK');
        console.error('Error sending message:', error);
        throw new Error('Failed to send message: ' + error.message);
      }
    },

    markMessageAsRead: async (_, { messageId }, context) => {
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }

      try {
        // Start transaction
        await context.db.execute('START TRANSACTION');

        const [messageRows] = await context.db.execute(
          'SELECT * FROM messages WHERE id = ?',
          [messageId]
        );

        if (messageRows.length === 0) {
          throw new Error(`Message with ID ${messageId} not found`);
        }

        const message = messageRows[0];

        if (message.receiver_id !== context.userId) {
          throw new ForbiddenError('You can only mark messages sent to you as read');
        }

        await context.db.execute(
          'UPDATE messages SET is_read = TRUE WHERE id = ?',
          [messageId]
        );

        const [updatedMessageRows] = await context.db.execute(
          'SELECT * FROM messages WHERE id = ?',
          [messageId]
        );

        // Commit transaction
        await context.db.execute('COMMIT');

        return updatedMessageRows[0];
      } catch (error) {
        // Rollback on error
        await context.db.execute('ROLLBACK');
        console.error('Error marking message as read:', error);
        throw new Error('Failed to mark message as read: ' + error.message);
      }
    },

    markAllMessagesAsRead: async (_, { senderId }, context) => {
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }

      try {
        // Start transaction
        await context.db.execute('START TRANSACTION');

        await context.db.execute(
          'UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ?',
          [senderId, context.userId]
        );

        const [updatedMessageRows] = await context.db.execute(
          'SELECT * FROM messages WHERE sender_id = ? AND receiver_id = ?',
          [senderId, context.userId]
        );

        // Commit transaction
        await context.db.execute('COMMIT');

        return updatedMessageRows;
      } catch (error) {
        // Rollback on error
        await context.db.execute('ROLLBACK');
        console.error('Error marking all messages as read:', error);
        throw new Error('Failed to mark all messages as read: ' + error.message);
      }
    }
  },

  Message: {
    sender: async (message, _, context) => {
      if (!message.sender_id) return null;

      try {
        const [rows] = await context.db.execute(
          'SELECT id, username, role FROM users WHERE id = ?',
          [message.sender_id]
        );
        return rows[0] || null;
      } catch (error) {
        console.error('Error resolving message sender:', error);
        return null;
      }
    },

    receiver: async (message, _, context) => {
      if (!message.receiver_id) return null;

      try {
        const [rows] = await context.db.execute(
          'SELECT id, username, role FROM users WHERE id = ?',
          [message.receiver_id]
        );
        return rows[0] || null;
      } catch (error) {
        console.error('Error resolving message receiver:', error);
        return null;
      }
    },

    id: (message) => message.id.toString(),
    content: (message) => message.content,
    isRead: (message) => Boolean(message.is_read),
    createdAt: (message) => 
      message.created_at ? new Date(message.created_at).toISOString() : null
  }
};

module.exports = messageResolvers;