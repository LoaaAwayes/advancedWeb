import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

function Chat() {
  const { currentUser, userId, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newMessage, setNewMessage] = useState('');
  const [studentMessages, setStudentMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch messages from API
  useEffect(() => {
    if (!token || !userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMessages = async () => {
      // Only set loading to true on initial load, not during refreshes
      if (messages.length === 0 && isMounted) {
        setLoading(true);
      }

      try {
        // Make a direct API call to get messages
        const response = await axios.get('http://localhost:3002/api/student/messages', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Only update state if component is still mounted
        if (!isMounted) return;

        // Transform the messages to match the expected format
        const formattedMessages = response.data.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender_id === userId ? currentUser : 'admin',
          receiver: msg.sender_id === userId ? 'admin' : currentUser,
          isRead: msg.is_read === 1,
          createdAt: msg.created_at
        }));

        setMessages(formattedMessages);

        // Only set loading to false if we were loading
        if (loading && isMounted) {
          setLoading(false);
        }
      } catch (err) {
        // Only update state if component is still mounted
        if (!isMounted) return;

        console.error('Error fetching messages:', err);

        // Only set loading to false if we were loading
        if (loading && isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchMessages();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchMessages, 5000);

    // Clean up on unmount
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token, userId, currentUser, loading, messages.length]);

  // Filter messages for the current student
  useEffect(() => {
    if (!loading) {
      const filteredMessages = messages.filter(
        (msg) =>
          (msg.sender === currentUser && msg.receiver === 'admin') ||
          (msg.sender === 'admin' && msg.receiver === currentUser)
      );

      setStudentMessages(filteredMessages);
      scrollToBottom();
    }
  }, [currentUser, messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Store the message content before clearing the input
      const messageContent = newMessage.trim();

      // Create a temporary message object with a unique ID
      const tempMsg = {
        id: 'temp_' + Date.now(), // Temporary ID with prefix to avoid conflicts
        content: messageContent,
        sender: currentUser,
        receiver: 'admin',
        isRead: false,
        createdAt: new Date().toISOString()
      };

      // Add to messages immediately for better UX
      setMessages(prev => [...prev, tempMsg]);

      // Clear input immediately
      setNewMessage('');

      // Send to server in background without affecting loading state
      setTimeout(() => {
        sendMessageToServer(messageContent);
      }, 100);
    }
  };

  // Function to send message to server
  const sendMessageToServer = async (content) => {
    if (!token || !content) return;

    try {
      // Create the message data
      const messageData = { content: content };

      // Send message to API
      await axios({
        method: 'post',
        url: 'http://localhost:3002/api/student/messages',
        data: messageData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Message sent successfully
    } catch (err) {
      console.error('Error sending message:', err.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  if (loading) return <div style={{ color: 'white' }}>Loading...</div>;

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
    height: '40vh',
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
    background: '#4CAF50',
    color: 'white',
    padding: '8px',
    borderRadius: '10px',
    fontSize: '14px',
    overflowY: 'auto',
    flexGrow: 1,
  };

  const inputContainerStyle = {
    display: 'flex',
    gap: '15px',
    marginTop: '10px',
  };

  const inputStyle = {
    flex: 1,
    padding: '10px',
    border: '1px solid #a4a3a3',
    borderRadius: '5px',
    background: '#333',
    color: 'white',
    fontSize: '12px',
    height: '40px',
  };

  const buttonStyle = {
    padding: '10px 15px',
    background: '#02c63d',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '12px',
    height: '40px',
    width: '70px',
    opacity: newMessage.trim() ? 1 : 0.5,
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Chat with Admin</div>

      <div style={messagesBoxStyle}>
        {studentMessages.length === 0 ? (
          <div>No messages yet. Start the conversation!</div>
        ) : (
          studentMessages.map((message) => (
            <div
              key={message.id}
              style={{
                marginBottom: '10px',
                textAlign: message.sender === currentUser ? 'right' : 'left',
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  padding: '10px',
                  borderRadius: '10px',
                  //background: message.sender === currentUser ? '#1e1e1e' : '#3a3a3a',
                  color: 'white',
                  maxWidth: '80%',
                }}
              >
                {message.content}
              </div>

            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={inputContainerStyle}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          style={inputStyle}
        />
        <button onClick={handleSendMessage} disabled={!newMessage.trim()} style={buttonStyle}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
