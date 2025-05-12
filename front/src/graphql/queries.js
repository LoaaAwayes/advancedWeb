import { gql } from '@apollo/client';

// Authentication Queries
export const SIGNIN_MUTATION = gql`
  mutation SignIn($username: String!, $password: String!) {
    signin(username: $username, password: $password) {
      token
      user {
        id
        username
        role
        universityId
      }
    }
  }
`;

export const SIGNUP_MUTATION = gql`
  mutation SignUp($username: String!, $password: String!, $universityId: String!) {
    signup(username: $username, password: $password, universityId: $universityId) {
      id
      username
      role
      universityId
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      role
      universityId
    }
  }
`;

// Admin Queries
export const GET_STUDENTS = gql`
  query GetStudents {
    getUsers {
      id
      username
      role
      universityId
      createdAt
    }
  }
`;

export const GET_ADMIN_STATS = gql`
  query GetAdminStats {
    getAdminStats {
      totalUsers
      totalStudents
      totalAdmins
      totalProjects
      activeProjects
      completedProjects
      totalTasks
      pendingTasks
      inProgressTasks
      completedTasks
    }
  }
`;

// Project Queries
export const GET_ALL_PROJECTS = gql`
  query GetAllProjects {
    getAllProjects {
      id
      name
      description
      status
      completionPercentage
      createdBy {
        username
      }
      assignedTo {
        id
        username
      }
      tasks {
        id
        title
        description
        status
        dueDate
        assignedTo {
          id
          username
        }
      }
      createdAt
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    getProject(id: $id) {
      id
      name
      description
      status
      completionPercentage
      createdBy {
        username
      }
      assignedTo {
        id
        username
      }
      tasks {
        id
        title
        status
        assignedTo {
          username
        }
      }
      createdAt
    }
  }
`;

export const GET_MY_PROJECTS = gql`
  query GetMyProjects {
    getMyProjects {
      id
      name
      description
      status
      completionPercentage
      tasks {
        id
        title
        status
      }
    }
  }
`;

// Project Mutations
export const CREATE_PROJECT = gql`
  mutation CreateProject($name: String!, $description: String) {
    createProject(name: $name, description: $description) {
      id
      name
      description
      status
      completionPercentage
    }
  }
`;

export const ASSIGN_PROJECT = gql`
  mutation AssignProjectToStudent($projectId: ID!, $studentId: ID!) {
    assignProjectToStudent(projectId: $projectId, studentId: $studentId) {
      id
      name
      assignedTo {
        id
        username
      }
    }
  }
`;

export const UPDATE_PROJECT_COMPLETION = gql`
  mutation UpdateProjectCompletion($id: ID!, $completionPercentage: Int!) {
    updateProjectCompletion(id: $id, completionPercentage: $completionPercentage) {
      id
      name
      status
      completionPercentage
    }
  }
`;

// Task Queries
export const GET_PROJECT_TASKS = gql`
  query GetProjectTasks($projectId: ID!) {
    getProjectTasks(projectId: $projectId) {
      id
      title
      description
      status
      assignedTo {
        username
      }
      dueDate
    }
  }
`;

// Task Mutations
export const CREATE_TASK = gql`
  mutation CreateTask($projectId: ID!, $title: String!, $description: String, $dueDate: String) {
    createTask(projectId: $projectId, title: $title, description: $description, dueDate: $dueDate) {
      id
      title
      description
      status
      dueDate
    }
  }
`;

export const ASSIGN_TASK = gql`
  mutation AssignTaskToStudent($taskId: ID!, $studentId: ID!) {
    assignTaskToStudent(taskId: $taskId, studentId: $studentId) {
      id
      title
      assignedTo {
        id
        username
      }
    }
  }
`;

export const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($id: ID!, $status: String!) {
    updateTaskStatus(id: $id, status: $status) {
      id
      title
      status
    }
  }
`;

// Message Queries
export const GET_MY_MESSAGES = gql`
  query GetMyMessages($userId: ID!) {
    getMyMessages(userId: $userId) {
      id
      content
      sender {
        id
        username
        role
      }
      receiver {
        id
        username
        role
      }
      isRead
      createdAt
    }
  }
`;

export const GET_MESSAGE_THREADS = gql`
  query GetMessageThreads {
    getMessageThreads {
      user {
        id
        username
        role
      }
      lastMessage {
        id
        content
        createdAt
        isRead
      }
      unreadCount
    }
  }
`;

// Message Mutations
export const SEND_MESSAGE = gql`
  mutation SendMessage($receiverId: ID!, $content: String!) {
    sendMessage(receiverId: $receiverId, content: $content) {
      id
      content
      sender {
        username
      }
      receiver {
        username
      }
      isRead
      createdAt
    }
  }
`;

export const MARK_MESSAGE_AS_READ = gql`
  mutation MarkMessageAsRead($messageId: ID!) {
    markMessageAsRead(messageId: $messageId) {
      id
      isRead
    }
  }
`;

// Student Dashboard
export const GET_STUDENT_DASHBOARD = gql`
  query GetStudentDashboard {
    getStudentDashboard {
      student {
        id
        username
        role
        universityId
      }
      stats {
        assignedProjects
        completedProjects
        inProgressProjects
        assignedTasks
        completedTasks
        pendingTasks
        inProgressTasks
      }
      assignedProjects {
        id
        name
        description
        status
        completionPercentage
      }
      recentTasks {
        id
        title
        status
        dueDate
      }
      unreadMessages
      recentMessages {
        id
        content
        sender {
          username
        }
        isRead
        createdAt
      }
      messageThreads {
        user {
          id
          username
          role
        }
        lastMessage {
          content
          createdAt
        }
        unreadCount
      }
    }
  }
`;

export const GET_STUDENT_STATS = gql`
  query GetStudentStats {
    getStudentStats {
      assignedProjects
      completedProjects
      inProgressProjects
      assignedTasks
      completedTasks
      pendingTasks
      inProgressTasks
    }
  }
`;

// Student Tasks
export const GET_MY_TASKS = gql`
  query GetMyTasks {
    getMyTasks {
      id
      title
      description
      status
      dueDate
      project {
        id
        name
      }
      assignedTo {
        id
        username
      }
    }
  }
`;
