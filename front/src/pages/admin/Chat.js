import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useQuery, useMutation } from '@apollo/client';
import { GET_STUDENTS, GET_MY_MESSAGES, SEND_MESSAGE } from '../../graphql/queries';

function Chat() {
  const { currentUser, userId } = useAuth();
  const { students, refreshData, loading } = useData();

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [studentMessages, setStudentMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Query to get students
  const { data: studentsData } = useQuery(GET_STUDENTS, {
    fetchPolicy: 'network-only'
  });

  // Query to get messages with selected student
  const { data: messagesData, refetch: refetchMessages } = useQuery(GET_MY_MESSAGES, {
    variables: { userId: selectedStudentId },
    skip: !selectedStudentId,
    fetchPolicy: 'network-only'
  });

  // Mutation to send message
  const [sendMessageMutation] = useMutation(SEND_MESSAGE);

  // Load students when component mounts
  useEffect(() => {
    refreshData();
  }, []);

  // Update messages when selected student changes or new messages arrive
  useEffect(() => {
    if (selectedStudentId && messagesData && messagesData.getMyMessages) {
      setStudentMessages(messagesData.getMyMessages);
      scrollToBottom();
    }
  }, [selectedStudentId, messagesData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student.username);
    setSelectedStudentId(student.id);
    refetchMessages();
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedStudentId) {
      try {
        await sendMessageMutation({
          variables: {
            receiverId: selectedStudentId,
            content: newMessage.trim()
          }
        });
        setNewMessage('');
        refetchMessages();
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  if (loading || loadingMessages) return <div style={{ color: 'white' }}>Loading...</div>;

  // Get students from GraphQL query
  const studentsList = studentsData?.getUsers?.filter(user => user.role === 'student') || [];

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
    width: '100%',         // Full width of chat box
    fontSize: '14px',
    minHeight: '30px',     // Smaller height
    maxHeight: '120px',
    overflowY: 'auto',
    flexGrow: 0,           // Prevent stretching
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
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '12px',
    height: '40px',
    width: '70px',
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
              style={studentStyle(selectedStudent === student.username)}
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
                    textAlign: message.sender?.role === 'admin' ? 'right' : 'left',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '10px',
                      borderRadius: '10px',
                      color: 'white',
                      maxWidth: '80%',
                    }}
                  >
                    {message.content}
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
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={inputStyle}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              style={{
                ...buttonStyle,
                opacity: newMessage.trim() ? 1 : 0.5,
              }}
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
