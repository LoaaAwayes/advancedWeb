const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const { checkAuth, checkAdmin } = require('../utils/auth');

const taskResolvers = {
  Query: {
    getMyTasks: async (_, __, context) => {
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }

      try {
        const [rows] = await context.db.execute(
          `SELECT t.*, 
                  p.id AS project_id, p.name AS project_name,
                  u.id AS user_id, u.username AS user_username
           FROM tasks t
           LEFT JOIN projects p ON t.project_id = p.id
           LEFT JOIN users u ON t.assigned_to = u.id
           WHERE t.assigned_to = ?`,
          [context.userId]
        );

        return rows.map(task => ({
          id: task.id,
          projectId: task.project_id,
          title: task.title,
          description: task.description,
          status: mapStatus(task.status),
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
      } catch (error) {
        console.error('Error fetching tasks:', error);
        throw new Error('Failed to fetch tasks: ' + error.message);
      }
    }
  },

  Mutation: {
    createTask: async (_, { projectId, title, description, dueDate, status }, context) => {
  await checkAdmin(context);

  if (!projectId || !title || !description || !dueDate || !status) {
    throw new Error('All fields (projectId, title, description, dueDate, status) are required.');
  }

  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (projectRows.length === 0) {
    throw new Error(`Project with ID ${projectId} not found.`);
  }

  try {
    const [result] = await context.db.execute(
      `INSERT INTO tasks (project_id, title, description, due_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [projectId, title, description, dueDate, status]
    );

    const taskId = result.insertId;
    const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    return taskRows[0];
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error('Failed to create task: ' + error.message);
  }
},




    assignTaskToStudent: async (_, { taskId, studentId }, context) => {
      await checkAdmin(context);

      try {
        const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (taskRows.length === 0) throw new Error(`Task with ID ${taskId} not found`);

        const [studentRows] = await context.db.execute(
          'SELECT * FROM users WHERE id = ? AND role = ?',
          [studentId, 'student']
        );
        if (studentRows.length === 0) throw new Error(`Student with ID ${studentId} not found`);

        const [assignmentRows] = await context.db.execute(
          'SELECT * FROM project_assignments WHERE project_id = ? AND student_id = ?',
          [taskRows[0].project_id, studentId]
        );
        if (assignmentRows.length === 0) {
          throw new Error(`Student must be assigned to the project before assigning tasks`);
        }

        await context.db.execute(
          'UPDATE tasks SET assigned_to = ? WHERE id = ?',
          [studentId, taskId]
        );

        const [rows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
        return rows[0];
      } catch (error) {
        console.error('Error assigning task to student:', error);
        throw new Error('Failed to assign task: ' + error.message);
      }
    },

    updateTaskStatus: async (_, { id, status }, context) => {
      checkAuth(context);

      try {
        const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) throw new Error(`Task with ID ${id} not found`);

        const task = taskRows[0];

        if (context.userRole !== 'admin' && task.assigned_to !== context.userId) {
          throw new ForbiddenError('You are not assigned to this task');
        }

        await context.db.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
        const [rows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);

        return rows[0];
      } catch (error) {
        console.error('Error updating task status:', error);
        throw new Error('Failed to update task status: ' + error.message);
      }
    },

    updateTaskDetails: async (_, { id, title, description, dueDate }, context) => {
      checkAuth(context);

      try {
        const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) throw new Error(`Task with ID ${id} not found`);

        const task = taskRows[0];
        if (context.userRole !== 'admin' && task.assigned_to !== context.userId) {
          throw new ForbiddenError('You are not assigned to this task');
        }

        const updateFields = [];
        const updateValues = [];

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

        if (updateFields.length === 0) return task;

        const updateQuery = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(id);

        await context.db.execute(updateQuery, updateValues);

        const [rows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error updating task details:', error);
        throw new Error('Failed to update task details: ' + error.message);
      }
    },

    deleteTask: async (_, { id }, context) => {
      checkAuth(context);

      try {
        const [taskRows] = await context.db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) {
          throw new Error(`Task with ID ${id} not found`);
        }

        const task = taskRows[0];
        if (context.userRole !== 'admin' && task.assigned_to !== context.userId) {
          throw new ForbiddenError('You are not assigned to this task');
        }

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

  Task: {
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

    id: task => task.id,
    projectId: task => task.project_id,
    title: task => task.title,
    description: task => task.description,
    status: task => mapStatus(task.status),
    dueDate: task => formatDate(task.due_date),
    createdAt: task => formatDateTime(task.created_at),
    updatedAt: task => formatDateTime(task.updated_at)
  }
};

function mapStatus(status) {
  switch (status) {
    case 'todo': return 'pending';
    case 'done': return 'completed';
    case 'in-progress': return 'in progress';
    default: return status;
  }
}

function formatDate(date) {
  return date ? new Date(date).toISOString().split('T')[0] : null;
}

function formatDateTime(dateTime) {
  return dateTime ? new Date(dateTime).toISOString() : null;
}

module.exports = taskResolvers;
