const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const { checkAuth } = require('../utils/auth');

// Message resolvers
const messageResolvers = {
  Query: {
    // Get messages between current user and specified user
    getMyMessages: async (_, { userId }, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }
      
      try {
        // Get messages where current user is either sender or receiver and the other user is the specified user
        const [rows] = await context.db.execute(
          `SELECT * FROM messages 
           WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
           ORDER BY created_at ASC`,
          [context.userId, userId, userId, context.userId]
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching messages:', error);
        throw new Error('Failed to fetch messages: ' + error.message);
      }
    },
    
    // Get all message threads for the current user
    getMessageThreads: async (_, __, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }
      
      try {
        // Get all users that the current user has exchanged messages with
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
        
        // For each user, get the last message and unread count
        const threads = [];
        
        for (const row of userRows) {
          const userId = row.user_id;
          
          // Skip if user_id is null (could happen if a user was deleted)
          if (!userId) continue;
          
          // Get user details
          const [userDetails] = await context.db.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
          );
          
          if (userDetails.length === 0) continue;
          
          // Get the last message
          const [lastMessageRows] = await context.db.execute(
            `SELECT * FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at DESC LIMIT 1`,
            [context.userId, userId, userId, context.userId]
          );
          
          // Get unread count
          const [unreadCountRows] = await context.db.execute(
            `SELECT COUNT(*) as count FROM messages 
             WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
            [userId, context.userId]
          );
          
          threads.push({
            user: userDetails[0],
            lastMessage: lastMessageRows.length > 0 ? lastMessageRows[0] : null,
            unreadCount: unreadCountRows[0].count
          });
        }
        
        // Sort threads by last message date (most recent first)
        threads.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
        });
        
        return threads;
      } catch (error) {
        console.error('Error fetching message threads:', error);
        throw new Error('Failed to fetch message threads: ' + error.message);
      }
    },
    
    // Get count of unread messages for the current user
    getUnreadMessagesCount: async (_, __, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }
      
      try {
        // Get count of unread messages
        const [rows] = await context.db.execute(
          'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
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
    // Send a message to another user
    sendMessage: async (_, { receiverId, content }, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }
      
      try {
        // Check if receiver exists
        const [receiverRows] = await context.db.execute(
          'SELECT * FROM users WHERE id = ?',
          [receiverId]
        );
        
        if (receiverRows.length === 0) {
          throw new Error(`User with ID ${receiverId} not found`);
        }
        
        // Check if sender is admin or student and receiver is admin or student
        // Admin can message any student, student can only message admins
        const [senderRows] = await context.db.execute(
          'SELECT role FROM users WHERE id = ?',
          [context.userId]
        );
        
        const senderRole = senderRows[0].role;
        const receiverRole = receiverRows[0].role;
        
        if (senderRole === 'student' && receiverRole === 'student') {
          throw new ForbiddenError('Students can only message admins');
        }
        
        // Create the message
        const [result] = await context.db.execute(
          'INSERT INTO messages (content, sender_id, receiver_id, is_read) VALUES (?, ?, ?, FALSE)',
          [content, context.userId, receiverId]
        );
        
        const messageId = result.insertId;
        
        // Fetch and return the created message
        const [messageRows] = await context.db.execute(
          'SELECT * FROM messages WHERE id = ?',
          [messageId]
        );
        
        return messageRows[0];
      } catch (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message: ' + error.message);
      }
    },
    
    // Mark a message as read
    markMessageAsRead: async (_, { messageId }, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }
      
      try {
        // Check if message exists and belongs to the current user
        const [messageRows] = await context.db.execute(
          'SELECT * FROM messages WHERE id = ?',
          [messageId]
        );
        
        if (messageRows.length === 0) {
          throw new Error(`Message with ID ${messageId} not found`);
        }
        
        const message = messageRows[0];
        
        // Check if the current user is the receiver of the message
        if (message.receiver_id !== context.userId) {
          throw new ForbiddenError('You can only mark messages sent to you as read');
        }
        
        // Mark the message as read
        await context.db.execute(
          'UPDATE messages SET is_read = TRUE WHERE id = ?',
          [messageId]
        );
        
        // Fetch and return the updated message
        const [updatedMessageRows] = await context.db.execute(
          'SELECT * FROM messages WHERE id = ?',
          [messageId]
        );
        
        return updatedMessageRows[0];
      } catch (error) {
        console.error('Error marking message as read:', error);
        throw new Error('Failed to mark message as read: ' + error.message);
      }
    },
    
    // Mark all messages from a specific user as read
    markAllMessagesAsRead: async (_, { senderId }, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }
      
      try {
        // Mark all messages from the sender to the current user as read
        await context.db.execute(
          'UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ?',
          [senderId, context.userId]
        );
        
        // Fetch and return the updated messages
        const [updatedMessageRows] = await context.db.execute(
          'SELECT * FROM messages WHERE sender_id = ? AND receiver_id = ?',
          [senderId, context.userId]
        );
        
        return updatedMessageRows;
      } catch (error) {
        console.error('Error marking all messages as read:', error);
        throw new Error('Failed to mark all messages as read: ' + error.message);
      }
    }
  },
  
  // Field resolvers
  Message: {
    // Resolve the sender field to return the user who sent the message
    sender: async (message, _, context) => {
      if (!message.sender_id) return null;
      
      try {
        const [rows] = await context.db.execute(
          'SELECT * FROM users WHERE id = ?',
          [message.sender_id]
        );
        
        return rows[0] || null;
      } catch (error) {
        console.error('Error resolving message sender:', error);
        return null;
      }
    },
    
    // Resolve the receiver field to return the user who received the message
    receiver: async (message, _, context) => {
      if (!message.receiver_id) return null;
      
      try {
        const [rows] = await context.db.execute(
          'SELECT * FROM users WHERE id = ?',
          [message.receiver_id]
        );
        
        return rows[0] || null;
      } catch (error) {
        console.error('Error resolving message receiver:', error);
        return null;
      }
    },
    
    // Map database fields to GraphQL fields
    id: (message) => message.id,
    content: (message) => message.content,
    isRead: (message) => message.is_read === 1, // Convert MySQL boolean (0/1) to JS boolean
    createdAt: (message) => message.created_at ? new Date(message.created_at).toISOString() : null
  }
};

module.exports = messageResolvers;
