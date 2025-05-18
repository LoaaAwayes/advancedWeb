import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';

// Style constants
const containerStyle = {
  margin: '40px auto',
  padding: '20px',
  background: '#353535',
  borderRadius: '10px',
  border: '1px solid #a4a3a3',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: '1000px',
  height: '60vh',
};

const headerStyle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  marginBottom: '10px',
  padding: '10px',
  borderBottom: '1px solid #555',
};

const messagesBoxStyle = {
  background: '#02c63d',
  color: 'white',
  padding: '15px',
  borderRadius: '10px',
  fontSize: '14px',
  overflowY: 'auto',
  flexGrow: 1,
  marginBottom: '15px',
};

const inputContainerStyle = {
  display: 'flex',
  gap: '15px',
};

const inputStyle = {
  flex: 1,
  padding: '12px',
  border: '1px solid #a4a3a3',
  borderRadius: '5px',
  background: '#333',
  color: 'white',
  fontSize: '14px',
  minHeight: '50px',
};

const buttonStyle = {
  padding: '0 20px',
  background: '#02c63d',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '5px',
  fontSize: '14px',
  width: '100px',
};

function Chat() {
  const { userId, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get('http://localhost:3002/api/student/messages', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data);
        scrollToBottom();
      } catch (err) {
        console.error('Error fetching old messages:', err);
      }
    };
    
    if (token) fetchMessages();
  }, [token]);

  useEffect(() => {
    if (!userId || !token) return;

    // Initialize socket connection
    socket.current = io('http://localhost:3002', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Socket event handlers
    socket.current.on('connect', () => {
      console.log('✅ Connected to chat server');
    });

    socket.current.on('new_message', (message) => {
      // Skip messages we sent (they're already in state via optimistic update)
      if (Number(message.sender_id) === Number(userId)) return;
      
      const isRelevant = (
        Number(message.sender_id) === Number(userId) || 
        Number(message.receiver_id) === Number(userId)
      );
      
      if (isRelevant) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    });

    socket.current.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.current.on('disconnect', () => {
      console.log('🔴 Disconnected from chat server');
    });

    // Cleanup on unmount
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [userId, token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket.current?.connected) return;

    const message = {
      sender_id: Number(userId),
      receiver_id: 2, // Admin ID
      content: newMessage.trim()
    };

    // Generate a temporary ID for the optimistic message
    const tempId = `temp_${Date.now()}`;
    
    setMessages(prev => [
      ...prev,
      {
        ...message,
        id: tempId,
        created_at: new Date().toISOString(),
        is_read: false
      }
    ]);

    // Send via socket
    socket.current.emit('message', message, (ack) => {
      if (ack?.error) {
        console.error('Failed to send message:', ack.error);
        // Remove optimistic update if failed
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    });

    setNewMessage('');
    scrollToBottom();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Chat with Admin</div>

      <div style={messagesBoxStyle}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#ccc' }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
       messages.map((message) => (
  <div
    key={message.id}
    style={{
      marginBottom: '15px',
      textAlign: 'left',
    }}
  >
    <div
      style={{
        display: 'inline-block',
        padding: '10px 15px',
        borderRadius: '15px',
        color: 'white',
        maxWidth: '80%',
        backgroundColor: '#02c63d',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        {Number(message.sender_id) === Number(userId) ? 'You:' : 'Admin:'}
      </div>
      {message.content}
      <div style={{ 
        fontSize: '11px', 
        marginTop: '5px', 
        opacity: 0.7,
        textAlign: 'right'
      }}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
))
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={inputContainerStyle}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          style={inputStyle}
        />
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          style={{
            ...buttonStyle,
            opacity: newMessage.trim() ? 1 : 0.5,
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;