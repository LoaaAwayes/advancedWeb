const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const { checkAuth, checkAdmin } = require('../utils/auth');

// Task resolvers
const taskResolvers = {
  Query: {
    // Get tasks assigned to the current user (student)
    getMyTasks: async (_, __, context) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }

      try {
        console.log('Fetching tasks for user ID:', context.userId);
        console.log('User role:', context.userRole);

        // Fetch tasks assigned to the current user
        const [rows] = await context.db.execute(
          `SELECT t.*, p.id as project_id, p.name as project_name,
                  u.id as user_id, u.username as user_username
           FROM tasks t
           LEFT JOIN projects p ON t.project_id = p.id
           LEFT JOIN users u ON t.assigned_to = u.id
           WHERE t.assigned_to = ?`,
          [context.userId]
        );

        console.log('Found tasks:', rows.length);

        if (rows.length > 0) {
          console.log('Sample task:', rows[0]);
        }

        // Transform the rows to include project information
        const transformedTasks = rows.map(task => ({
          id: task.id,
          projectId: task.project_id,
          title: task.title,
          description: task.description,
          // Map database status values to expected GraphQL status values
          status: task.status === 'todo' ? 'pending' :
                 task.status === 'done' ? 'completed' : task.status,
          dueDate: task.due_date,
          project: {
            id: task.project_id,
            name: task.project_name
          },
          assignedTo: {
            id: task.assigned_to,
            username: task.user_username
          }
        }));

        console.log('Transformed tasks:', transformedTasks);

        return transformedTasks;
      } catch (error) {
        console.error('Error fetching tasks:', error);
        throw new Error('Failed to fetch tasks: ' + error.message);
      }
    }
  },

  Mutation: {
    // Create a new task (admin only)
    createTask: async (_, { projectId, title, description, dueDate }, context) => {
      await checkAdmin(context);

      try {
        // Check if project exists
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);

        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${projectId} not found`);
        }

        // Create the task
        const [result] = await context.db.execute(
          'INSERT INTO tasks (project_id, title, description, due_date) VALUES (?, ?, ?, ?)',
          [projectId, title, description, dueDate]
        );

        const taskId = result.insertId;
        const [rows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);

        return rows[0];
      } catch (error) {
        console.error('Error creating task:', error);
        throw new Error('Failed to create task: ' + error.message);
      }
    },

    // Assign a task to a student (admin only)
    assignTaskToStudent: async (_, { taskId, studentId }, context) => {
      await checkAdmin(context);

      try {
        // Check if task exists
        const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);

        if (taskRows.length === 0) {
          throw new Error(`Task with ID ${taskId} not found`);
        }

        const task = taskRows[0];

        // Check if student exists and is actually a student
        const [studentRows] = await context.db.execute(
          'SELECT * FROM users WHERE id = ? AND role = ?',
          [studentId, 'student']
        );

        if (studentRows.length === 0) {
          throw new Error(`Student with ID ${studentId} not found`);
        }

        // Check if student is assigned to the project
        const [assignmentRows] = await context.db.execute(
          'SELECT * FROM project_assignments WHERE project_id = ? AND student_id = ?',
          [task.project_id, studentId]
        );

        if (assignmentRows.length === 0) {
          throw new Error(`Student must be assigned to the project before assigning tasks`);
        }

        // Assign the task to the student
        await context.db.execute(
          'UPDATE tasks SET assigned_to = ? WHERE id = ?',
          [studentId, taskId]
        );

        // Fetch and return the updated task
        const [rows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
        return rows[0];
      } catch (error) {
        console.error('Error assigning task to student:', error);
        throw new Error('Failed to assign task: ' + error.message);
      }
    },

    // Update task status (admin & student)
    updateTaskStatus: async (_, { id, status }, context) => {
      // Check if user is authenticated
      checkAuth(context);

      try {
        // Check if task exists
        const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);

        if (taskRows.length === 0) {
          throw new Error(`Task with ID ${id} not found`);
        }

        const task = taskRows[0];

        // If user is not an admin, check if they are assigned to this task
        if (context.userRole !== 'admin') {
          if (task.assigned_to !== context.userId) {
            throw new ForbiddenError('You are not assigned to this task');
          }
        }

        // Update the task status
        await context.db.execute(
          'UPDATE tasks SET status = ? WHERE id = ?',
          [status, id]
        );

        // Fetch and return the updated task
        const [rows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error updating task status:', error);
        throw new Error('Failed to update task status: ' + error.message);
      }
    },

    // Update task details (admin & student)
    updateTaskDetails: async (_, { id, title, description, dueDate }, context) => {
      // Check if user is authenticated
      checkAuth(context);

      try {
        // Check if task exists
        const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);

        if (taskRows.length === 0) {
          throw new Error(`Task with ID ${id} not found`);
        }

        const task = taskRows[0];

        // If user is not an admin, check if they are assigned to this task
        if (context.userRole !== 'admin') {
          if (task.assigned_to !== context.userId) {
            throw new ForbiddenError('You are not assigned to this task');
          }
        }

        // Build the update query dynamically based on provided fields
        let updateQuery = 'UPDATE tasks SET ';
        const updateValues = [];
        const updateFields = [];

        if (title) {
          updateFields.push('title = ?');
          updateValues.push(title);
        }

        if (description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(description);
        }

        if (dueDate !== undefined) {
          updateFields.push('due_date = ?');
          updateValues.push(dueDate);
        }

        // If no fields to update, return the task as is
        if (updateFields.length === 0) {
          return task;
        }

        updateQuery += updateFields.join(', ') + ' WHERE id = ?';
        updateValues.push(id);

        // Execute the update
        await context.db.execute(updateQuery, updateValues);

        // Fetch and return the updated task
        const [rows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error updating task details:', error);
        throw new Error('Failed to update task details: ' + error.message);
      }
    },

    // Delete a task (admin & student)
    deleteTask: async (_, { id }, context) => {
      // Check if user is authenticated
      checkAuth(context);

      try {
        // Check if task exists
        const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);

        if (taskRows.length === 0) {
          throw new Error(`Task with ID ${id} not found`);
        }

        const task = taskRows[0];

        // If user is not an admin, check if they are assigned to this task
        if (context.userRole !== 'admin') {
          if (task.assigned_to !== context.userId) {
            throw new ForbiddenError('You are not assigned to this task');
          }
        }

        // Delete the task
        await context.db.execute('DELETE FROM tasks WHERE id = ?', [id]);

        return {
          success: true,
          message: `Task with ID ${id} successfully deleted`,
          id
        };
      } catch (error) {
        console.error('Error deleting task:', error);
        return {
          success: false,
          message: 'Failed to delete task: ' + error.message,
          id
        };
      }
    }
  },

  // Field resolvers
  Task: {
    // Resolve the assignedTo field to return the student assigned to the task
    assignedTo: async (task, _, context) => {
      if (!task.assigned_to) return null;

      try {
        const [rows] = await context.db.execute('SELECT * FROM users WHERE id = ?', [task.assigned_to]);
        return rows[0] || null;
      } catch (error) {
        console.error('Error resolving task assignee:', error);
        return null;
      }
    },

    // Map database fields to GraphQL fields
    id: (task) => task.id,
    projectId: (task) => task.project_id,
    title: (task) => task.title,
    description: (task) => task.description,
    status: (task) => {
      // Map database status values to expected GraphQL status values
      if (task.status === 'todo') return 'pending';
      if (task.status === 'done') return 'completed';
      return task.status;
    },
    dueDate: (task) => task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : null,
    createdAt: (task) => task.created_at ? new Date(task.created_at).toISOString() : null,
    updatedAt: (task) => task.updated_at ? new Date(task.updated_at).toISOString() : null
  }
};

module.exports = taskResolvers;
