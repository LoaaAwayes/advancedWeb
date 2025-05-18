const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const { checkAuth, checkStudent } = require('../utils/auth');

const studentResolvers = {
  Query: {
 
    getStudentDashboard: async (_, __, context) => {
     
      if (!context.userId) {
        throw new AuthenticationError('Not authenticated. Please log in.');
      }
      
      try {
        const [userCheck] = await context.db.execute(
          'SELECT * FROM users WHERE id = ? AND role = ?',
          [context.userId, 'student']
        );
        
        if (userCheck.length === 0) {
          throw new ForbiddenError('Not authorized. Student access only.');
        }
        
        const student = userCheck[0];
        
        const [assignedProjectsResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM project_assignments 
           WHERE student_id = ?`,
          [context.userId]
        );
        const assignedProjects = assignedProjectsResult[0].count;
        
        const [completedProjectsResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM projects p
           JOIN project_assignments pa ON p.id = pa.project_id
           WHERE pa.student_id = ? AND p.status = 'completed'`,
          [context.userId]
        );
        const completedProjects = completedProjectsResult[0].count;
        
        const [inProgressProjectsResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM projects p
           JOIN project_assignments pa ON p.id = pa.project_id
           WHERE pa.student_id = ? AND p.status = 'in_progress'`,
          [context.userId]
        );
        const inProgressProjects = inProgressProjectsResult[0].count;
        
    
        const [assignedTasksResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM tasks
           WHERE assigned_to = ?`,
          [context.userId]
        );
        const assignedTasks = assignedTasksResult[0].count;
        
        const [completedTasksResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM tasks
           WHERE assigned_to = ? AND status = 'completed'`,
          [context.userId]
        );
        const completedTasks = completedTasksResult[0].count;
        
        const [pendingTasksResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM tasks
           WHERE assigned_to = ? AND status = 'pending'`,
          [context.userId]
        );
        const pendingTasks = pendingTasksResult[0].count;
        
       
        const [inProgressTasksResult] = await context.db.execute(
          `SELECT COUNT(*) as count FROM tasks
           WHERE assigned_to = ? AND status = 'in_progress'`,
          [context.userId]
        );
        const inProgressTasks = inProgressTasksResult[0].count;
        
        const [projectRows] = await context.db.execute(
          `SELECT p.* FROM projects p
           JOIN project_assignments pa ON p.id = pa.project_id
           WHERE pa.student_id = ?
           ORDER BY p.updated_at DESC`,
          [context.userId]
        );
        
        const [taskRows] = await context.db.execute(
          `SELECT * FROM tasks
           WHERE assigned_to = ?
           ORDER BY updated_at DESC
           LIMIT 5`,
          [context.userId]
        );
        
      
        const [unreadMessagesResult] = await context.db.execute(
          'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
          [context.userId]
        );
        const unreadMessages = unreadMessagesResult[0].count;
        
       
        const [messageRows] = await context.db.execute(
          `SELECT * FROM messages
           WHERE sender_id = ? OR receiver_id = ?
           ORDER BY created_at DESC
           LIMIT 5`,
          [context.userId, context.userId]
        );
        
        const [userRows] = await context.db.execute(
          `SELECT DISTINCT 
            CASE 
              WHEN sender_id = ? THEN receiver_id 
              ELSE sender_id 
            END AS user_id
           FROM messages
           WHERE sender_id = ? OR receiver_id = ?`,
          [context.userId, context.userId, context.userId]
        );
        
        const threads = [];
        
        for (const row of userRows) {
          const userId = row.user_id;
          
          if (!userId) continue;
          
          const [userDetails] = await context.db.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
          );
          
          if (userDetails.length === 0) continue;
          
          const [lastMessageRows] = await context.db.execute(
            `SELECT * FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at DESC LIMIT 1`,
            [context.userId, userId, userId, context.userId]
          );
          
          const [unreadCountRows] = await context.db.execute(
            `SELECT COUNT(*) as count FROM messages 
             WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
            [userId, context.userId]
          );
          
          threads.push({
            user: userDetails[0],
            lastMessage: lastMessageRows.length > 0 ? lastMessageRows[0] : null,
            unreadCount: unreadCountRows[0].count
          });
        }
        
        threads.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
        });
        
        return {
          student,
          stats: {
            assignedProjects,
            completedProjects,
            inProgressProjects,
            assignedTasks,
            completedTasks,
            pendingTasks,
            inProgressTasks
          },
          assignedProjects: projectRows,
          recentTasks: taskRows,
          unreadMessages,
          recentMessages: messageRows,
          messageThreads: threads
        };
      } catch (error) {
        console.error('Error fetching student dashboard:', error);
        throw new Error('Failed to fetch student dashboard: ' + error.message);
      }
    }
  }
};

module.exports = studentResolvers;
