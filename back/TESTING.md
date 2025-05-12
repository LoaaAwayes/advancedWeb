# Testing Guide for Task Management System

###  Admin Authentication (log in ) 
mutation AdminLogin {
  signin(username: "ali", password: "2003") {
    token
    user {
      id
      username
      role
    }
  }
}

###  View All Students
query GetAllStudents {
  getUsers {
    id
    username
    role
    universityId
  }
}

###  Admin Views Dashboard Statistics
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
###  Create a Project
mutation CreateProject {
  createProject(
    name: "Student Registration System",
    description: "Build a web-based student registration system for the university"
  ) {
    id
    name
    description
    status
    completionPercentage
  }
}
###  Assign Project to Student
mutation AssignProjectToStudent {
  assignProjectToStudent(
    projectId: "1",
    studentId: "2"
  ) {
    id
    name
    assignedTo {
      id
      username
    }
  }
}
### View All Projects
query GetAllProjects {
  getAllProjects {
    id
    name
    description
    status
    completionPercentage
  }
}
###  View Project with Tasks
query GetProject {
  getProject(id: "1") {
    id
    name
    description
    status
    completionPercentage
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
  }
}
### search Project 
query GetProjectTasks {
  getProjectTasks(projectId: "1") {
    id
    title
    description
    status
    assignedTo {
      username
    }
  }
}

###  Create a Task
mutation CreateTask {
  createTask(
    projectId: "1",
    title: "Design Database Schema",
    description: "Create the database schema for the student registration system",
    dueDate: "2023-12-31"
  ) {
    id
    title
    description
    status
  }
}

### Assign Task to Student
mutation AssignTaskToStudent {
  assignTaskToStudent(
    taskId: "1",
    studentId: "2"
  ) {
    id
    title
    assignedTo {
      id
      username
    }
  }
}

### Admin Sends Message to Student
mutation AdminSendMessage {
  sendMessage(
    receiverId: "2", 
    content: "Hello student, how is your project going?"
  ) {
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

### Admin Views Messages with Student
query AdminViewMessages {
  getMyMessages(userId: "2") {
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
### Admin Marks Message as Read
mutation AdminMarkMessageAsRead {
  markMessageAsRead(messageId: "1") {
    id
    content
    isRead
  }
}

### Student Signup
mutation StudentSignup {
  signup(
    username: "student1",
    password: "password123",
    universityId: "STU12345"
  ) {
    id
    username
    role
    universityId
    createdAt
  }
}
###  Student Login
mutation StudentLogin {
  signin(username: "student1", password: "password123") {
    token
    user {
      id
      username
      role
    }
  }
}
## Viewing Your Statistics
query GetMyStats {
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

###  View a Specific Project
query GetProject {
  getProject(id: "1") {
    id
    name
    description
    status
    completionPercentage
    tasks {
      id
      title
      status
      dueDate
    }
  }
}
###  Student Views Assigned Projects
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


###  Student Updates Project Completion

mutation UpdateProjectCompletion {
  updateProjectCompletion(
    id: "1",
    completionPercentage: 50
  ) {
    id
    name
    status
    completionPercentage
  }
}
###  View Tasks for a Project
query GetProjectTasks {
  getProjectTasks(projectId: "1") {
    id
    title
    description
    status
    dueDate
  }
}
##  Send Message to Admin
mutation SendMessageToAdmin {
  sendMessage(
    receiverId: "1", 
    content: "Hello admin, I have a question about my project."
  ) {
    id
    content
    createdAt
  }
}
###  View Messages with Admin
query ViewMessagesWithAdmin {
  getMyMessages(userId: "1") {
    id
    content
    sender {
      username
      role
    }
    receiver {
      username
      role
    }
    isRead
    createdAt
  }
}
###  View All Message Threads
query ViewMessageThreads {
  getMessageThreads {
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

###  Mark Message as Read
mutation MarkMessageAsRead {
  markMessageAsRead(messageId: "1") {
    id
    content
    isRead
  }
}
