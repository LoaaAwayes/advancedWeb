
const { AuthenticationError, ForbiddenError } = require('apollo-server-express');

/**
 * Check if a user is authenticated
 * @param {Object} context - GraphQL context containing user information
 * @returns {boolean} - True if authenticated
 * @throws {AuthenticationError} - If not authenticated
 */
const checkAuth = (context) => {
  if (!context.userId) {
    throw new AuthenticationError('Not authenticated. Please log in.');
  }
  return true;
};

/**
 * Check if a user is an admin
 * @param {Object} context - GraphQL context containing user information
 * @returns {boolean} - True if user is an admin
 * @throws {AuthenticationError} - If not authenticated
 * @throws {ForbiddenError} - If not an admin
 */
const checkAdmin = async (context) => {
  checkAuth(context);
  
  try {
    const [adminCheck] = await context.db.execute(
      'SELECT role FROM users WHERE id = ?',
      [context.userId]
    );
    
    if (!adminCheck[0] || adminCheck[0].role !== 'admin') {
      throw new ForbiddenError('Not authorized. Admin access required.');
    }
    
    return true;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw error;
    }
    throw new Error('Error checking admin status: ' + error.message);
  }
};

/**
 * Check if a user is a student
 * @param {Object} context - GraphQL context containing user information
 * @returns {boolean} - True if user is a student
 * @throws {AuthenticationError} - If not authenticated
 * @throws {ForbiddenError} - If not a student
 */
const checkStudent = async (context) => {
  
  checkAuth(context);
  
  
  try {
    const [studentCheck] = await context.db.execute(
      'SELECT role FROM users WHERE id = ?',
      [context.userId]
    );
    
    if (!studentCheck[0] || studentCheck[0].role !== 'student') {
      throw new ForbiddenError('Not authorized. Student access required.');
    }
    
    return true;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw error;
    }
    throw new Error('Error checking student status: ' + error.message);
  }
};

module.exports = {
  checkAuth,
  checkAdmin,
  checkStudent
};
