import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { useAuth } from './AuthContext';
import {
  GET_STUDENTS,
  GET_ALL_PROJECTS,
  GET_MY_PROJECTS,
  GET_PROJECT_TASKS,
  CREATE_PROJECT,
  ASSIGN_PROJECT,
  UPDATE_PROJECT_COMPLETION,
  CREATE_TASK,
  ASSIGN_TASK,
  UPDATE_TASK_STATUS,
  SEND_MESSAGE,
  GET_MY_MESSAGES,
  GET_MESSAGE_THREADS,
  MARK_MESSAGE_AS_READ,
  GET_STUDENT_DASHBOARD
} from '../graphql/queries';

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const { currentUser, userId, isAdmin, isStudent } = useAuth();
  const client = useApolloClient();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentDashboard, setStudentDashboard] = useState(null);

  const { data: studentsData, refetch: refetchStudents } = useQuery(GET_STUDENTS, {
    skip: !isAdmin,
    fetchPolicy: 'network-only'
  });

  const { data: projectsData, refetch: refetchProjects } = useQuery(
    isAdmin ? GET_ALL_PROJECTS : GET_MY_PROJECTS,
    { fetchPolicy: 'network-only' }
  );

  const { data: dashboardData, refetch: refetchDashboard } = useQuery(GET_STUDENT_DASHBOARD, {
    skip: !isStudent,
    fetchPolicy: 'network-only'
  });

  const [createProjectMutation] = useMutation(CREATE_PROJECT);
  const [assignProjectMutation] = useMutation(ASSIGN_PROJECT);
  const [updateProjectCompletionMutation] = useMutation(UPDATE_PROJECT_COMPLETION);
  const [createTaskMutation] = useMutation(CREATE_TASK);
  const [assignTaskMutation] = useMutation(ASSIGN_TASK);
  const [updateTaskStatusMutation] = useMutation(UPDATE_TASK_STATUS);
  const [sendMessageMutation] = useMutation(SEND_MESSAGE);
  const [markMessageAsReadMutation] = useMutation(MARK_MESSAGE_AS_READ);

  useEffect(() => {
    if (currentUser) {
      loadData();
    } else {
      setProjects([]);
      setTasks([]);
      setStudents([]);
      setMessages([]);
      setStudentDashboard(null);
    }
  }, [currentUser, studentsData, projectsData, dashboardData]);

  const loadData = async () => {
    setLoading(true);

    try {
      if (isAdmin && studentsData && studentsData.getUsers) {
        setStudents(studentsData.getUsers);
      }

      if (projectsData) {
        if (isAdmin && projectsData.getAllProjects) {
          setProjects(projectsData.getAllProjects);
        } else if (isStudent && projectsData.getMyProjects) {
          setProjects(projectsData.getMyProjects);
        }
      }

      if (isStudent && dashboardData && dashboardData.getStudentDashboard) {
        setStudentDashboard(dashboardData.getStudentDashboard);

        setTasks(dashboardData.getStudentDashboard.recentTasks || []);
        setMessages(dashboardData.getStudentDashboard.recentMessages || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      if (isAdmin) {
        await refetchStudents();
        await refetchProjects();
      } else if (isStudent) {
        await refetchProjects();
        await refetchDashboard();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const addProject = async (projectData) => {
    try {
      const { data } = await createProjectMutation({
        variables: {
          name: projectData.name,
          description: projectData.description
        }
      });

      if (data && data.createProject) {
        if (projectData.students) {
          const studentIds = projectData.students.split(', ');
          for (const studentId of studentIds) {
            await assignProjectMutation({
              variables: {
                projectId: data.createProject.id,
                studentId
              }
            });
          }
        }

        await refetchProjects();
        return data.createProject;
      }
      return null;
    } catch (error) {
      console.error('Error adding project:', error);
      return null;
    }
  };

  const updateProjectProgress = async (projectId, newProgress) => {
    try {
      const { data } = await updateProjectCompletionMutation({
        variables: {
          id: projectId,
          completionPercentage: parseInt(newProgress)
        }
      });

      if (data && data.updateProjectCompletion) {
        await refetchProjects();
        if (isStudent) {
          await refetchDashboard();
        }
        return data.updateProjectCompletion;
      }
      return null;
    } catch (error) {
      console.error('Error updating project progress:', error);
      return null;
    }
  };

  const addTask = async (taskData) => {
    try {
      const { data } = await createTaskMutation({
        variables: {
          projectId: taskData.projectId,
          title: taskData.title,
          description: taskData.description,
          dueDate: taskData.dueDate
        }
      });

      if (data && data.createTask) {
        if (taskData.studentId) {
          await assignTaskMutation({
            variables: {
              taskId: data.createTask.id,
              studentId: taskData.studentId
            }
          });
        }

        await refreshData();
        return data.createTask;
      }
      return null;
    } catch (error) {
      console.error('Error adding task:', error);
      return null;
    }
  };

  const updateTask = async (taskData) => {
    try {
      const { data } = await updateTaskStatusMutation({
        variables: {
          id: taskData.id,
          status: taskData.status
        }
      });

      if (data && data.updateTaskStatus) {
        await refreshData();
        return data.updateTaskStatus;
      }
      return null;
    } catch (error) {
      console.error('Error updating task:', error);
      return null;
    }
  };

  const addMessage = async (receiverId, content) => {
    try {
      const { data } = await sendMessageMutation({
        variables: {
          receiverId,
          content
        }
      });

      if (data && data.sendMessage) {
        await refreshData();
        return data.sendMessage;
      }
      return null;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  const getMessagesForUser = async (userId) => {
    try {
      const { data } = await client.query({
        query: GET_MY_MESSAGES,
        variables: { userId },
        fetchPolicy: 'network-only'
      });

      if (data && data.getMyMessages) {
        return data.getMyMessages;
      }
      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      const { data } = await markMessageAsReadMutation({
        variables: { messageId }
      });

      if (data && data.markMessageAsRead) {
        await refreshData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  };

  const value = {
    projects,
    tasks,
    students,
    messages,
    studentDashboard,
    loading,
    refreshData,
    addProject,
    updateProjectProgress,
    addTask,
    updateTask,
    addMessage,
    getMessagesForUser,
    markMessageAsRead
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
