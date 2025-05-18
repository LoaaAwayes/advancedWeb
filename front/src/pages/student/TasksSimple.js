import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

function TasksSimple() {
  const { token, userId } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get('http://localhost:3002/api/student/tasks', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Tasks API response:', response.data);
        setTasks(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError(err.message || 'Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
    
    const interval = setInterval(fetchTasks, 10000);
    
    return () => clearInterval(interval);
  }, [token, userId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'text-gray-500';
    
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'text-green-500';
      case 'in_progress':
      case 'in progress':
        return 'text-blue-500';
      case 'pending':
      case 'todo':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    
    switch (status.toLowerCase()) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'todo':
        return 'To Do';
      case 'done':
        return 'Completed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-8 text-white">
        <p className="text-xl mb-4">Authentication Required</p>
        <p>Please log in to view your tasks.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8 text-white">Loading tasks from database...</div>;
  }

  return (
    <div className="flex flex-col p-6 text-white">
      {error && (
        <div className="bg-red-600 text-white p-4 mb-6 rounded">
          <h3 className="font-bold">Error fetching tasks:</h3>
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Tasks</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-gray-800 rounded-lg">
            <p className="text-xl">No tasks assigned to you yet.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-[#1f1f1f] rounded-lg shadow-md overflow-hidden border border-gray-700 hover:border-blue-500 transition-all duration-300"
            >
              <div className={`h-2 ${
                task.status === 'completed' || task.status === 'done' ? 'bg-green-500' : 
                task.status === 'in_progress' ? 'bg-blue-500' : 
                'bg-yellow-500'
              }`}></div>
              
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">{task.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    task.status === 'completed' || task.status === 'done' ? 'bg-green-600' : 
                    task.status === 'in_progress' ? 'bg-blue-600' : 
                    'bg-yellow-600'
                  }`}>
                    {formatStatus(task.status)}
                  </span>
                </div>
                
                <p className="text-gray-300 mb-4">{task.description || 'No description provided'}</p>
                
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Project:</span>
                    <span className="text-white font-medium">{task.project_name || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Due Date:</span>
                    <span className="text-white">{formatDate(task.due_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TasksSimple;
