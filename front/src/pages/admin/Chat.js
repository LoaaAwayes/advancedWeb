import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useQuery } from '@apollo/client';
import { GET_STUDENTS, GET_MY_MESSAGES } from '../../graphql/queries';
import { io } from 'socket.io-client';

function Chat() {
  const { userId, token } = useAuth();
  const { refreshData, loading } = useData();

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [studentMessages, setStudentMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);
  const pendingMessages = useRef({}); 

  const { data: studentsData } = useQuery(GET_STUDENTS, { fetchPolicy: 'network-only' });
  const { data: messagesData, refetch: refetchMessages } = useQuery(GET_MY_MESSAGES, {
    variables: { otherUserId: selectedStudentId },
    skip: !selectedStudentId,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (selectedStudentId && messagesData?.getMyMessages) {
      setStudentMessages(messagesData.getMyMessages);
      scrollToBottom();
    }
  }, [selectedStudentId, messagesData]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!userId || !token) return;

    socket.current = io('http://localhost:3002', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.current.on('connect', () => {
      console.log('✅ Connected to chat server');
    });

    socket.current.on('new_message', (serverMessage) => {
      // Check if this is one of our pending messages
      const isPending = Object.values(pendingMessages.current).some(
        msg => msg.content === serverMessage.content && 
               new Date(msg.created_at).getTime() - new Date(serverMessage.created_at).getTime() < 1000
      );

      if (!isPending) {
        // Only add if it's relevant to current conversation
        if (
          Number(serverMessage.sender_id) === Number(selectedStudentId) ||
          Number(serverMessage.receiver_id) === Number(selectedStudentId)
        ) {
          setStudentMessages(prev => [...prev, serverMessage]);
          scrollToBottom();
        }
      }
    });

    socket.current.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.current.on('disconnect', () => {
      console.log('🔴 Disconnected from chat server');
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [userId, token, selectedStudentId, scrollToBottom]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student.username);
    setSelectedStudentId(student.id);
    refetchMessages({ otherUserId: student.id });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedStudentId || !socket.current?.connected) return;

    const tempId = `temp_${Date.now()}`;
    const message = {
      sender_id: Number(userId),
      receiver_id: Number(selectedStudentId),
      content: newMessage.trim(),
      id: tempId,
      created_at: new Date().toISOString(),
      is_read: false
    };

  
    pendingMessages.current[tempId] = message;
    
    setStudentMessages(prev => [...prev, message]);

    socket.current.emit('message', {
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content
    }, (ack) => {
      delete pendingMessages.current[tempId];

      if (ack?.error) {
        console.error('Failed to send message:', ack.error);
        // Remove optimistic update if failed
        setStudentMessages(prev => prev.filter(m => m.id !== tempId));
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

  if (loading) return <div style={{ color: 'white' }}>Loading...</div>;

  const studentsList = studentsData?.getUsers?.filter((u) => u.role === 'student') || [];
const containerStyle = {
    display: 'flex',
    gap: '20px',
    marginTop: '20px',
    flexWrap: 'wrap',
    padding: '20px',
    width: '100%',
    maxWidth: '1000px',
    height: '40vh',
  };

  const studentListStyle = {
    width: '250px',
    background: '#222',
    padding: '15px',
    borderRadius: '10px',
    overflowY: 'auto',
    color: 'white',
  };

  const chatBoxStyle = {
    flex: 1,
    minWidth: '600px',
    background: '#353535',
    padding: '15px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #a4a3a3',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  };

  const chatHeaderStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '10px',
    padding: '10px',
  };

  const messagesBoxStyle = {
    background: '#4CAF50',
    color: 'white',
    padding: '8px',
    borderRadius: '10px',
    width: '100%',
    fontSize: '14px',
    minHeight: '30px',
    maxHeight: '120px',
    overflowY: 'auto',
    flexGrow: 0,
  };

  const chatInputStyle = {
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
    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
    borderRadius: '5px',
    fontSize: '12px',
    height: '40px',
    width: '70px',
    opacity: newMessage.trim() ? 1 : 0.5,
  };

  const studentStyle = (isActive) => ({
    padding: '10px',
    background: isActive ? '#007bff' : '#444',
    borderRadius: '5px',
    marginBottom: '5px',
    color: 'white',
    cursor: 'pointer',
    transition: '0.3s',
  });


  return (
    <div style={containerStyle}>
      <div style={studentListStyle}>
        <h2 style={{ marginBottom: '10px', fontSize: '18px' }}>List of Students</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {studentsList.map((student) => (
            <li
              key={student.id}
              style={studentStyle(selectedStudentId === student.id)}
              onClick={() => handleSelectStudent(student)}
            >
              {student.username}
            </li>
          ))}
        </ul>
      </div>

      <div style={chatBoxStyle}>
        <div style={chatHeaderStyle}>
          {selectedStudent ? `Chatting with ${selectedStudent}` : 'Select a student'}
        </div>

        <div style={messagesBoxStyle}>
          {selectedStudent ? (
            studentMessages.length === 0 ? (
              <div>No messages yet. Start the conversation!</div>
            ) : (
              studentMessages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    marginBottom: '10px',
                    textAlign: message.sender_id === Number(userId) ? 'left' : 'left',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '10px',
                      borderRadius: '10px',
                      color: 'white',
                      maxWidth: '80%',
                      backgroundColor: message.sender_id === Number(userId) ? '#02c63d' : '#02c63d',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        {Number(message.sender_id) === Number(userId) ? 'You:' : 'selectedStudent:'}
      </div>
                    {message.content}
                    <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7 }}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            <div>Select a student to start chatting</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {selectedStudent && (
          <div style={chatInputStyle}>
            <textarea
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              style={{ ...inputStyle, resize: 'none' }}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              style={buttonStyle}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
