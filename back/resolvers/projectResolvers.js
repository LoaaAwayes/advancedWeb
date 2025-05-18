const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const { checkAuth, checkAdmin } = require('../utils/auth');


const projectResolvers = {
  Query: {
 
    getAllProjects: async (_, __, context) => {
      await checkAdmin(context);
      
      try {
        const [rows] = await context.db.execute('SELECT * FROM projects ORDER BY created_at DESC');
        return rows;
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw new Error('Failed to fetch projects: ' + error.message);
      }
    },
    
    getProject: async (_, { id }, context) => {
  
      checkAuth(context);
      
      try {
      
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        
        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${id} not found`);
        }
        
        const project = projectRows[0];
        
        if (context.userRole !== 'admin') {
          const [assignmentRows] = await context.db.execute(
            'SELECT * FROM project_assignments WHERE project_id = ? AND student_id = ?',
            [id, context.userId]
          );
          
          if (assignmentRows.length === 0) {
            throw new ForbiddenError('You do not have access to this project');
          }
        }
        
        return project;
      } catch (error) {
        console.error('Error fetching project:', error);
        throw new Error('Failed to fetch project: ' + error.message);
      }
    },
   
    getProjectsByStatus: async (_, { status }, context) => {
   
      checkAuth(context);
      
      try {
        
        if (context.userRole === 'admin') {
          const [rows] = await context.db.execute(
            'SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC',
            [status]
          );
          return rows;
        } 
        
        const [rows] = await context.db.execute(
          `SELECT p.* FROM projects p
           JOIN project_assignments pa ON p.id = pa.project_id
           WHERE p.status = ? AND pa.student_id = ?
           ORDER BY p.created_at DESC`,
          [status, context.userId]
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching projects by status:', error);
        throw new Error('Failed to fetch projects: ' + error.message);
      }
    },
    
    getMyProjects: async (_, __, context) => {
      checkAuth(context);
      
      try {
        if (context.userRole === 'admin') {
          const [rows] = await context.db.execute(
            'SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC',
            [context.userId]
          );
          return rows;
        }
        
        const [rows] = await context.db.execute(
          `SELECT p.* FROM projects p
           JOIN project_assignments pa ON p.id = pa.project_id
           WHERE pa.student_id = ?
           ORDER BY p.created_at DESC`,
          [context.userId]
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching my projects:', error);
        throw new Error('Failed to fetch projects: ' + error.message);
      }
    },
    
    getProjectTasks: async (_, { projectId }, context) => {
      checkAuth(context);
      
      try {
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
        
        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${projectId} not found`);
        }
        
        if (context.userRole !== 'admin') {
          const [assignmentRows] = await context.db.execute(
            'SELECT * FROM project_assignments WHERE project_id = ? AND student_id = ?',
            [projectId, context.userId]
          );
          
          if (assignmentRows.length === 0) {
            throw new ForbiddenError('You do not have access to this project');
          }
        }
        
        const [taskRows] = await context.db.execute(
          'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
          [projectId]
        );
        
        return taskRows;
      } catch (error) {
        console.error('Error fetching project tasks:', error);
        throw new Error('Failed to fetch tasks: ' + error.message);
      }
    }
  },
  
  Mutation: {
    createProject: async (_, { name, description }, context) => {
      await checkAdmin(context);
      
      try {
        const [result] = await context.db.execute(
          'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)',
          [name, description, context.userId]
        );
        
        const projectId = result.insertId;
        const [rows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
        
        return rows[0];
      } catch (error) {
        console.error('Error creating project:', error);
        throw new Error('Failed to create project: ' + error.message);
      }
    },
    
    updateProject: async (_, { id, name, description, status }, context) => {
      await checkAdmin(context);
      
      try {
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        
        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${id} not found`);
        }
        
        let updateQuery = 'UPDATE projects SET ';
        const updateValues = [];
        const updateFields = [];
        
        if (name) {
          updateFields.push('name = ?');
          updateValues.push(name);
        }
        
        if (description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(description);
        }
        
        if (status) {
          updateFields.push('status = ?');
          updateValues.push(status);
        }
        
        if (updateFields.length === 0) {
          return projectRows[0];
        }
        
        updateQuery += updateFields.join(', ') + ' WHERE id = ?';
        updateValues.push(id);
        
        await context.db.execute(updateQuery, updateValues);
        
        const [rows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error updating project:', error);
        throw new Error('Failed to update project: ' + error.message);
      }
    },
    
    deleteProject: async (_, { id }, context) => {
      await checkAdmin(context);
      
      try {
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        
        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${id} not found`);
        }
        
        
        await context.db.execute('DELETE FROM projects WHERE id = ?', [id]);
        
        return {
          success: true,
          message: `Project with ID ${id} successfully deleted`,
          id
        };
      } catch (error) {
        console.error('Error deleting project:', error);
        return {
          success: false,
          message: 'Failed to delete project: ' + error.message,
          id
        };
      }
    },
    
     assignProjectToStudent: async (_, { projectId, studentId }, context) => {
      await checkAdmin(context);
      
      try {
       
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
        
        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${projectId} not found`);
        }
        
        const [studentRows] = await context.db.execute(
          'SELECT * FROM users WHERE id = ? AND role = ?',
          [studentId, 'student']
        );
        
        if (studentRows.length === 0) {
          throw new Error(`Student with ID ${studentId} not found`);
        }
        
        const [assignmentRows] = await context.db.execute(
          'SELECT * FROM project_assignments WHERE project_id = ? AND student_id = ?',
          [projectId, studentId]
        );
        
        if (assignmentRows.length > 0) {
          throw new Error(`Student is already assigned to this project`);
        }
        
        await context.db.execute(
          'INSERT INTO project_assignments (project_id, student_id) VALUES (?, ?)',
          [projectId, studentId]
        );
        
        return projectRows[0];
      } catch (error) {
        console.error('Error assigning project to student:', error);
        throw new Error('Failed to assign project: ' + error.message);
      }
    },
    
    removeStudentFromProject: async (_, { projectId, studentId }, context) => {
      await checkAdmin(context);
      
      try {
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
        
        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${projectId} not found`);
        }
        
        const [assignmentRows] = await context.db.execute(
          'SELECT * FROM project_assignments WHERE project_id = ? AND student_id = ?',
          [projectId, studentId]
        );
        
        if (assignmentRows.length === 0) {
          throw new Error(`Student is not assigned to this project`);
        }
        
        await context.db.execute(
          'DELETE FROM project_assignments WHERE project_id = ? AND student_id = ?',
          [projectId, studentId]
        );
        
        return projectRows[0];
      } catch (error) {
        console.error('Error removing student from project:', error);
        throw new Error('Failed to remove student from project: ' + error.message);
      }
    },
    
    updateProjectStatus: async (_, { id, status }, context) => {
      checkAuth(context);
      
      try {
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        
        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${id} not found`);
        }
        
        if (context.userRole !== 'admin') {
          const [assignmentRows] = await context.db.execute(
            'SELECT * FROM project_assignments WHERE project_id = ? AND student_id = ?',
            [id, context.userId]
          );
          
          if (assignmentRows.length === 0) {
            throw new ForbiddenError('You do not have access to this project');
          }
        }
        
        await context.db.execute(
          'UPDATE projects SET status = ? WHERE id = ?',
          [status, id]
        );
        
        const [rows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error updating project status:', error);
        throw new Error('Failed to update project status: ' + error.message);
      }
    },
    
    updateProjectCompletion: async (_, { id, completionPercentage }, context) => {
      checkAuth(context);
      
      try {
        if (completionPercentage < 0 || completionPercentage > 100) {
          throw new Error('Completion percentage must be between 0 and 100');
        }
        
        
        const [projectRows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        
        if (projectRows.length === 0) {
          throw new Error(`Project with ID ${id} not found`);
        }
        
        if (context.userRole !== 'admin') {
          const [assignmentRows] = await context.db.execute(
            'SELECT * FROM project_assignments WHERE project_id = ? AND student_id = ?',
            [id, context.userId]
          );
          
          if (assignmentRows.length === 0) {
            throw new ForbiddenError('You do not have access to this project');
          }
        }
        
        await context.db.execute(
          'UPDATE projects SET completion_percentage = ? WHERE id = ?',
          [completionPercentage, id]
        );
        
        let newStatus = projectRows[0].status;
        if (completionPercentage === 0) {
          newStatus = 'open';
        } else if (completionPercentage === 100) {
          newStatus = 'completed';
        } else if (completionPercentage > 0) {
          newStatus = 'in_progress';
        }
        
        if (newStatus !== projectRows[0].status) {
          await context.db.execute(
            'UPDATE projects SET status = ? WHERE id = ?',
            [newStatus, id]
          );
        }
        
        const [rows] = await context.db.execute('SELECT * FROM projects WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error updating project completion:', error);
        throw new Error('Failed to update project completion: ' + error.message);
      }
    }
  },
  
  Project: {
       createdBy: async (project, _, context) => {
      if (!project.created_by) return null;
      
      try {
        const [rows] = await context.db.execute('SELECT * FROM users WHERE id = ?', [project.created_by]);
        return rows[0] || null;
      } catch (error) {
        console.error('Error resolving project creator:', error);
        return null;
      }
    },
    
    
    assignedTo: async (project, _, context) => {
      try {
        const [rows] = await context.db.execute(
          `SELECT u.* FROM users u
           JOIN project_assignments pa ON u.id = pa.student_id
           WHERE pa.project_id = ?`,
          [project.id]
        );
        return rows;
      } catch (error) {
        console.error('Error resolving project assignments:', error);
        return [];
      }
    },
    
    
    tasks: async (project, _, context) => {
      try {
        const [rows] = await context.db.execute(
          'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
          [project.id]
        );
        return rows;
      } catch (error) {
        console.error('Error resolving project tasks:', error);
        return [];
      }
    },
    
    id: (project) => project.id,
    name: (project) => project.name,
    description: (project) => project.description,
    status: (project) => project.status,
    completionPercentage: (project) => project.completion_percentage,
    createdAt: (project) => project.created_at ? new Date(project.created_at).toISOString() : null,
    updatedAt: (project) => project.updated_at ? new Date(project.updated_at).toISOString() : null
  }
};

module.exports = projectResolvers;
