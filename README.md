# Task Management System

A full-stack task management system with admin and student roles, project management,task managment , and messaging capabilities.

## Project Structure

- **Backend**: GraphQL API with MySQL database
- **Frontend**: React application with Apollo Client for GraphQL integration

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

## Setup Instructions

1. Start the backend server:
   ```
   cd back
   npm run dev
   ```
 The GraphQL server will be available at http://localhost:3002/graphql
2. Start the frontend development server:
   ```
   cd front
   npm start
   ```
      The frontend application will be available at http://localhost:3000

### Manual Setup

#### 1. Database Setup

1. Create a MySQL database named `task_managment`
2. Import the database schema from `back/database-schema.sql`:
   ```
   mysql -u root -p < back/database-schema.sql
   ```
3. Update database credentials in `back/server.js` if needed:


## Default Users

### Admin
- Username: ali
- Password: 2003

### Student
- You can create student accounts through the signup page

## Features

### Admin Features
- Dashboard with system statistics
- Create and manage projects
- Assign projects to students
- Create and assign tasks
- Message students

### Student Features
- Dashboard with personal statistics
- View assigned projects
- Update project completion percentage
- View assigned tasks
- Message administrators

## API Documentation

The GraphQL API provides the following operations:

### Queries
- User management (getUsers, getUser, etc.)
- Project management (getAllProjects, getProject, etc.)
- Task management (getProjectTasks, etc.)
- Statistics (getAdminStats, getStudentStats)
- Messaging (getMyMessages, getMessageThreads)

### Mutations
- Authentication (signin, signup)
- Project management (createProject, assignProjectToStudent, etc.)
- Task management (createTask, updateTaskStatus, etc.)
- Messaging (sendMessage, markMessageAsRead)

## Technologies Used

### Backend
- Node.js
- Express
- Apollo Server
- GraphQL
- MySQL
- JSON Web Tokens (JWT)

### Frontend
- React
- Apollo Client
- React Router
- Chart.js
- CSS

