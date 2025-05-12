const { gql, AuthenticationError, ForbiddenError } = require('apollo-server-express');
const bcrypt = require('bcrypt'); // Import bcrypt
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const { checkAuth, checkAdmin, checkStudent } = require('./utils/auth');
const projectResolvers = require('./resolvers/projectResolvers');
const taskResolvers = require('./resolvers/taskResolvers');
const messageResolvers = require('./resolvers/messageResolvers');
const studentResolvers = require('./resolvers/studentResolvers');

// Define your GraphQL schema based on potential frontend needs
const typeDefs = gql`
  # --- Types ---

  type User {
    id: ID!
    username: String!
    role: String! # 'admin' or 'student'
    universityId: String # University ID for students (NULL for admin)
    createdAt: String! # Using String for simplicity, can use a Date type
    assignedProjects: [Project] # Projects assigned to this user (for students)
  }

  # Admin dashboard statistics
  type AdminStats {
    totalUsers: Int!
    totalStudents: Int!
    totalAdmins: Int!
    newUsersToday: Int!
    activeUsers: Int!
    totalProjects: Int!
    activeProjects: Int!
    completedProjects: Int!
    totalTasks: Int!
    pendingTasks: Int!
    inProgressTasks: Int!
    completedTasks: Int!
  }

  # Student dashboard statistics
  type StudentStats {
    assignedProjects: Int!
    completedProjects: Int!
    inProgressProjects: Int!
    assignedTasks: Int!
    completedTasks: Int!
    pendingTasks: Int!
    inProgressTasks: Int!
  }

  # Comprehensive student dashboard
  type StudentDashboard {
    student: User!
    stats: StudentStats!
    assignedProjects: [Project]!
    recentTasks: [Task]!
    unreadMessages: Int!
    recentMessages: [Message]!
    messageThreads: [MessageThread]!
  }

  # Project type
  type Project {
    id: ID!
    name: String!
    description: String
    status: String! # 'open', 'in_progress', 'completed', 'cancelled'
    completionPercentage: Int!
    createdBy: User
    assignedTo: [User]
    tasks: [Task]
    createdAt: String!
    updatedAt: String!
  }

  # Task type for project tasks
  type Task {
    id: ID!
    projectId: ID!
    title: String!
    description: String
    status: String! # 'pending', 'in_progress', 'completed'
    assignedTo: User
    dueDate: String
    createdAt: String!
    updatedAt: String!
  }

  # Message type for chat system
  type Message {
    id: ID!
    content: String!
    sender: User
    receiver: User
    isRead: Boolean!
    createdAt: String!
  }

  # Message thread summary
  type MessageThread {
    user: User!
    lastMessage: Message
    unreadCount: Int!
  }

  # --- Queries ---

  type Query {
    # User Queries
    me: User # Get the currently logged-in user

    # Admin Queries
    getUsers: [User] # Get all users (admin only)
    getStudents: [User] # Get all students (admin only)
    getUser(id: ID!): User # Get a specific user by ID (admin only)
    searchUsers(query: String!): [User] # Search users by username or university ID (admin only)
    getAdminStats: AdminStats # Get admin dashboard statistics (admin only)

    # Student Queries
    getStudentStats: StudentStats # Get student dashboard statistics (student only)
    getStudentDashboard: StudentDashboard # Get comprehensive student dashboard data (student only)

    # Project Queries
    getAllProjects: [Project] # Get all projects (admin only)
    getProject(id: ID!): Project # Get a specific project by ID
    getProjectsByStatus(status: String!): [Project] # Get projects by status
    getMyProjects: [Project] # Get projects assigned to the current user (student) or created by (admin)
    getProjectTasks(projectId: ID!): [Task] # Get tasks for a specific project

    # Task Queries
    getMyTasks: [Task] # Get tasks assigned to the current user (student)

    # Message Queries
    getMyMessages(userId: ID!): [Message] # Get messages between current user and specified user
    getMessageThreads: [MessageThread] # Get all message threads for the current user
    getUnreadMessagesCount: Int! # Get count of unread messages for the current user
  }

  # --- Mutations ---

  type Mutation {
    # Authentication Mutations
    signup(username: String!, password: String!, universityId: String!): User # Sign up a new student
    signin(username: String!, password: String!): AuthPayload # Sign in a user and return token

    # Admin Mutations
    createStudent(username: String!, password: String!, universityId: String!): User # Admin creates a student
    updateUser(id: ID!, username: String, universityId: String): User # Admin updates a user
    deleteUser(id: ID!): DeleteUserResponse # Admin deletes a user
    resetUserPassword(id: ID!, newPassword: String!): User # Admin resets a user's password

    # Project Mutations - Admin Only
    createProject(name: String!, description: String): Project # Create a new project
    updateProject(id: ID!, name: String, description: String, status: String): Project # Update project details
    deleteProject(id: ID!): DeleteProjectResponse # Delete a project
    assignProjectToStudent(projectId: ID!, studentId: ID!): Project # Assign a project to a student
    removeStudentFromProject(projectId: ID!, studentId: ID!): Project # Remove a student from a project

    # Project Mutations - Admin & Student
    updateProjectStatus(id: ID!, status: String!): Project # Update project status
    updateProjectCompletion(id: ID!, completionPercentage: Int!): Project # Update project completion percentage

    # Task Mutations - Admin Only
    createTask(projectId: ID!, title: String!, description: String, dueDate: String): Task # Create a new task
    assignTaskToStudent(taskId: ID!, studentId: ID!): Task # Assign a task to a student

    # Task Mutations - Admin & Student
    updateTaskStatus(id: ID!, status: String!): Task # Update task status
    updateTaskDetails(id: ID!, title: String, description: String, dueDate: String): Task # Update task details
    deleteTask(id: ID!): DeleteTaskResponse # Delete a task

    # Message Mutations
    sendMessage(receiverId: ID!, content: String!): Message # Send a message to another user
    markMessageAsRead(messageId: ID!): Message # Mark a message as read
    markAllMessagesAsRead(senderId: ID!): [Message] # Mark all messages from a specific user as read
  }

  # --- Payloads ---
  # Define payloads for mutations that return more than just the created/updated object
  type AuthPayload {
    token: String!
    user: User!
  }

  type DeleteUserResponse {
    success: Boolean!
    message: String
    id: ID
  }

  type DeleteProjectResponse {
    success: Boolean!
    message: String
    id: ID
  }

  type DeleteTaskResponse {
    success: Boolean!
    message: String
    id: ID
  }
`;

// Define your resolvers to fetch data from the database
const resolvers = {
  Query: {
    me: async (_, __, context) => {
      // Logic to get the logged-in user based on context (e.g., from a JWT token)
      if (!context.userId) {
        return null; // Not authenticated
      }
      try {
        const [rows] = await context.db.execute('SELECT * FROM users WHERE id = ?', [context.userId]);
        return rows[0];
      } catch (error) {
        console.error('Error fetching user:', error);
        throw new Error('Failed to fetch user.');
      }
    },

    getUsers: async (_, __, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        // Fetch only student users (filter out admin users)
        const [rows] = await context.db.execute('SELECT * FROM users WHERE role = ?', ['student']);
        return rows;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw new Error('Failed to fetch users: ' + error.message);
      }
    },

    getStudents: async (_, __, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        // Fetch only student users
        const [rows] = await context.db.execute('SELECT * FROM users WHERE role = ?', ['student']);
        return rows;
      } catch (error) {
        console.error('Error fetching students:', error);
        throw new Error('Failed to fetch students: ' + error.message);
      }
    },

    getUser: async (_, { id }, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        const [rows] = await context.db.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (rows.length === 0) {
          throw new Error(`User with ID ${id} not found`);
        }
        return rows[0];
      } catch (error) {
        console.error('Error fetching user:', error);
        throw new Error('Failed to fetch user: ' + error.message);
      }
    },

    searchUsers: async (_, { query }, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        // Search by username or university ID
        const searchQuery = `%${query}%`;
        const [rows] = await context.db.execute(
          'SELECT * FROM users WHERE username LIKE ? OR university_id LIKE ?',
          [searchQuery, searchQuery]
        );
        return rows;
      } catch (error) {
        console.error('Error searching users:', error);
        throw new Error('Failed to search users: ' + error.message);
      }
    },

    getAdminStats: async (_, __, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        // Get total users count (both students and admins)
        const [totalUsersResult] = await context.db.execute('SELECT COUNT(*) as count FROM users');
        const totalUsers = totalUsersResult[0].count;

        // Get total students count
        const [totalStudentsResult] = await context.db.execute(
          'SELECT COUNT(*) as count FROM users WHERE role = ?',
          ['student']
        );
        const totalStudents = totalStudentsResult[0].count;

        // Get total admins count
        const [totalAdminsResult] = await context.db.execute(
          'SELECT COUNT(*) as count FROM users WHERE role = ?',
          ['admin']
        );
        const totalAdmins = totalAdminsResult[0].count;

        // Get new students registered today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISOString = today.toISOString().split('T')[0];

        const [newUsersTodayResult] = await context.db.execute(
          'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ? AND role = ?',
          [todayISOString, 'student']
        );
        const newUsersToday = newUsersTodayResult[0].count;

        // For active users, we'll just count students for now
        // In a real app, you might track login activity in a separate table
        const activeUsers = totalStudents;

        // Get project statistics
        // Total projects
        const [totalProjectsResult] = await context.db.execute('SELECT COUNT(*) as count FROM projects');
        const totalProjects = totalProjectsResult[0].count;

        // Active projects (open or in_progress)
        const [activeProjectsResult] = await context.db.execute(
          "SELECT COUNT(*) as count FROM projects WHERE status IN ('open', 'in_progress')"
        );
        const activeProjects = activeProjectsResult[0].count;

        // Completed projects
        const [completedProjectsResult] = await context.db.execute(
          "SELECT COUNT(*) as count FROM projects WHERE status = 'completed'"
        );
        const completedProjects = completedProjectsResult[0].count;

        // Get task statistics
        // Total tasks
        const [totalTasksResult] = await context.db.execute('SELECT COUNT(*) as count FROM tasks');
        const totalTasks = totalTasksResult[0].count;

        // Pending tasks
        const [pendingTasksResult] = await context.db.execute(
          "SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'"
        );
        const pendingTasks = pendingTasksResult[0].count;

        // In progress tasks
        const [inProgressTasksResult] = await context.db.execute(
          "SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'"
        );
        const inProgressTasks = inProgressTasksResult[0].count;

        // Completed tasks
        const [completedTasksResult] = await context.db.execute(
          "SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'"
        );
        const completedTasks = completedTasksResult[0].count;

        return {
          totalUsers,
          totalStudents,
          totalAdmins,
          newUsersToday,
          activeUsers,
          totalProjects,
          activeProjects,
          completedProjects,
          totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks
        };
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        throw new Error('Failed to fetch admin statistics: ' + error.message);
      }
    },

    getStudentStats: async (_, __, context) => {
      // Check if user is authenticated and is a student
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }

      try {
        // Check if the user is a student
        const [userCheck] = await context.db.execute(
          'SELECT role FROM users WHERE id = ?',
          [context.userId]
        );

        if (!userCheck[0] || userCheck[0].role !== 'student') {
          throw new ForbiddenError('Not authorized. Student access only.');
        }

        // Get assigned projects count
        const [assignedProjectsResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM project_assignments
           WHERE student_id = ?`,
          [context.userId]
        );
        const assignedProjects = assignedProjectsResult[0].count;

        // Get completed projects count
        const [completedProjectsResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM projects p
           JOIN project_assignments pa ON p.id = pa.project_id
           WHERE pa.student_id = ? AND p.status = 'completed'`,
          [context.userId]
        );
        const completedProjects = completedProjectsResult[0].count;

        // Get in-progress projects count
        const [inProgressProjectsResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM projects p
           JOIN project_assignments pa ON p.id = pa.project_id
           WHERE pa.student_id = ? AND p.status = 'in_progress'`,
          [context.userId]
        );
        const inProgressProjects = inProgressProjectsResult[0].count;

        // Get assigned tasks count
        const [assignedTasksResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM tasks
           WHERE assigned_to = ?`,
          [context.userId]
        );
        const assignedTasks = assignedTasksResult[0].count;

        // Get completed tasks count
        const [completedTasksResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM tasks
           WHERE assigned_to = ? AND status = 'completed'`,
          [context.userId]
        );
        const completedTasks = completedTasksResult[0].count;

        // Get pending tasks count
        const [pendingTasksResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM tasks
           WHERE assigned_to = ? AND status = 'pending'`,
          [context.userId]
        );
        const pendingTasks = pendingTasksResult[0].count;

        // Get in-progress tasks count
        const [inProgressTasksResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM tasks
           WHERE assigned_to = ? AND status = 'in_progress'`,
          [context.userId]
        );
        const inProgressTasks = inProgressTasksResult[0].count;

        return {
          assignedProjects,
          completedProjects,
          inProgressProjects,
          assignedTasks,
          completedTasks,
          pendingTasks,
          inProgressTasks
        };
      } catch (error) {
        console.error('Error fetching student stats:', error);
        throw new Error('Failed to fetch student statistics: ' + error.message);
      }
    }
  },

  Mutation: {
    signup: async (_, { username, password, universityId }, context) => {
      // Check if username already exists
      const [existingUsers] = await context.db.execute('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUsers.length > 0) {
        throw new Error('User with this username already exists.');
      }

      // Check if university ID is provided
      if (!universityId) {
        throw new Error('University ID is required for student registration.');
      }

      // Check if university ID is already in use
      const [existingUnivIds] = await context.db.execute('SELECT id FROM users WHERE university_id = ?', [universityId]);
      if (existingUnivIds.length > 0) {
        throw new Error('This University ID is already registered.');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

      try {
        // For signup, we always create a student role
        const [result] = await context.db.execute(
          'INSERT INTO users (username, password_hash, role, university_id) VALUES (?, ?, ?, ?)',
          [username, hashedPassword, 'student', universityId]
        );
        const userId = result.insertId;
        const [rows] = await context.db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        return rows[0];
      } catch (error) {
        console.error('Error signing up user:', error);
        throw new Error('Failed to create user: ' + error.message);
      }
    },

    signin: async (_, { username, password }, context) => {
      // Find the user by username
      const [rows] = await context.db.execute('SELECT * FROM users WHERE username = ?', [username]);
      const user = rows[0];
      if (!user) {
        throw new Error('Invalid credentials.');
      }

      // Compare the provided password with the hashed password in the database
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        throw new Error('Invalid credentials.');
      }

      // Generate a JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        'YOUR_SECRET_KEY', // This matches the JWT_SECRET in server.js
        { expiresIn: '24h' }
      );

      console.log('Generated token for user:', user.username);
      console.log('User ID:', user.id);
      console.log('User role:', user.role);

      return {
        token,
        user,
      };
    },

    createStudent: async (_, { username, password, universityId }, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        // Check if username already exists
        const [existingUsers] = await context.db.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
          throw new Error('User with this username already exists.');
        }

        // Check if university ID is already in use
        const [existingUnivIds] = await context.db.execute('SELECT id FROM users WHERE university_id = ?', [universityId]);
        if (existingUnivIds.length > 0) {
          throw new Error('This University ID is already registered.');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the student user
        const [result] = await context.db.execute(
          'INSERT INTO users (username, password_hash, role, university_id) VALUES (?, ?, ?, ?)',
          [username, hashedPassword, 'student', universityId]
        );

        const userId = result.insertId;
        const [rows] = await context.db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        return rows[0];
      } catch (error) {
        console.error('Error creating student:', error);
        throw new Error('Failed to create student: ' + error.message);
      }
    },

    updateUser: async (_, { id, username, universityId }, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        // Check if user exists
        const [userCheck] = await context.db.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (userCheck.length === 0) {
          throw new Error(`User with ID ${id} not found`);
        }

        const user = userCheck[0];

        // Check if username is being changed and if it's already taken
        if (username && username !== user.username) {
          const [existingUsers] = await context.db.execute(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [username, id]
          );
          if (existingUsers.length > 0) {
            throw new Error('Username is already taken');
          }
        }

        // Check if university ID is being changed and if it's already taken
        if (universityId && universityId !== user.university_id) {
          const [existingUnivIds] = await context.db.execute(
            'SELECT id FROM users WHERE university_id = ? AND id != ?',
            [universityId, id]
          );
          if (existingUnivIds.length > 0) {
            throw new Error('University ID is already registered');
          }
        }

        // Build the update query dynamically based on provided fields
        let updateQuery = 'UPDATE users SET ';
        const updateValues = [];
        const updateFields = [];

        if (username) {
          updateFields.push('username = ?');
          updateValues.push(username);
        }

        if (universityId) {
          updateFields.push('university_id = ?');
          updateValues.push(universityId);
        }

        // If no fields to update, return the user as is
        if (updateFields.length === 0) {
          return user;
        }

        updateQuery += updateFields.join(', ') + ' WHERE id = ?';
        updateValues.push(id);

        // Execute the update
        await context.db.execute(updateQuery, updateValues);

        // Fetch and return the updated user
        const [rows] = await context.db.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error updating user:', error);
        throw new Error('Failed to update user: ' + error.message);
      }
    },

    deleteUser: async (_, { id }, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        // Check if user exists
        const [userCheck] = await context.db.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (userCheck.length === 0) {
          throw new Error(`User with ID ${id} not found`);
        }

        // Check if trying to delete an admin
        if (userCheck[0].role === 'admin') {
          throw new Error('Cannot delete admin users');
        }

        // Delete the user
        await context.db.execute('DELETE FROM users WHERE id = ?', [id]);

        return {
          success: true,
          message: `User with ID ${id} successfully deleted`,
          id
        };
      } catch (error) {
        console.error('Error deleting user:', error);
        return {
          success: false,
          message: 'Failed to delete user: ' + error.message,
          id
        };
      }
    },

    resetUserPassword: async (_, { id, newPassword }, context) => {
      // Use the checkAdmin utility function
      await checkAdmin(context);

      try {
        // Check if user exists
        const [userCheck] = await context.db.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (userCheck.length === 0) {
          throw new Error(`User with ID ${id} not found`);
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        await context.db.execute(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [hashedPassword, id]
        );

        // Fetch and return the updated user
        const [rows] = await context.db.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error resetting password:', error);
        throw new Error('Failed to reset password: ' + error.message);
      }
    }
  },

  // Field resolvers to handle database field to GraphQL field mapping
  User: {
    id: (user) => user.id,
    username: (user) => user.username,
    role: (user) => user.role,
    universityId: (user) => user.university_id,
    createdAt: (user) => user.created_at ? new Date(user.created_at).toISOString() : null
  }
};

// Merge all resolvers
const mergedResolvers = {
  Query: {
    ...resolvers.Query,
    ...projectResolvers.Query,
    ...messageResolvers.Query,
    ...studentResolvers.Query
  },
  Mutation: {
    ...resolvers.Mutation,
    ...projectResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...messageResolvers.Mutation
  },
  User: resolvers.User,
  Project: projectResolvers.Project,
  Task: taskResolvers.Task,
  Message: messageResolvers.Message,
  MessageThread: {
    user: async (thread, _) => thread.user
  },
  StudentDashboard: {
    student: (dashboard) => dashboard.student,
    stats: (dashboard) => dashboard.stats,
    assignedProjects: (dashboard) => dashboard.assignedProjects,
    recentTasks: (dashboard) => dashboard.recentTasks,
    unreadMessages: (dashboard) => dashboard.unreadMessages,
    recentMessages: (dashboard) => dashboard.recentMessages,
    messageThreads: (dashboard) => dashboard.messageThreads
  }
};

module.exports = { typeDefs, resolvers: mergedResolvers };