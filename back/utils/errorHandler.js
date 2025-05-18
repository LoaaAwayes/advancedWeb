const { ApolloError } = require('apollo-server-express');

const errorHandler = (error) => {
  console.error('Error:', error);

  if (error instanceof ApolloError) {
    return error;
  }

  if (error.name === 'SequelizeValidationError') {
    return new ApolloError(
      error.errors.map(e => e.message).join(', '),
      'VALIDATION_ERROR'
    );
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return new ApolloError(
      'A record with this value already exists',
      'UNIQUE_CONSTRAINT_ERROR'
    );
  }

  if (error.name === 'JsonWebTokenError') {
    return new ApolloError('Invalid token', 'INVALID_TOKEN');
  }

  if (error.name === 'TokenExpiredError') {
    return new ApolloError('Token expired', 'TOKEN_EXPIRED');
  }

  return new ApolloError(
    'Internal server error',
    'INTERNAL_SERVER_ERROR'
  );
};

module.exports = errorHandler;