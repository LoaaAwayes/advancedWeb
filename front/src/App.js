import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout Components
import Layout from './components/layout/Layout';
import AuthLayout from './components/layout/AuthLayout';

// Auth Pages
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import Projects from './pages/admin/Projects';
import AddProject from './pages/admin/AddProject';
import Tasks from './pages/admin/Tasks';
import AddTask from './pages/admin/AddTask';
import AdminChat from './pages/admin/Chat';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import StudentProjects from './pages/student/Projects';
import StudentTasks from './pages/student/TasksSimple';
import StudentChat from './pages/student/Chat';

function App() {
  const { currentUser, isAdmin, isStudent } = useAuth();

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route index element={currentUser ? (isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/student/dashboard" />) : <SignIn />} />
        <Route path="signin" element={currentUser ? (isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/student/dashboard" />) : <SignIn />} />
        <Route path="signup" element={currentUser ? (isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/student/dashboard" />) : <SignUp />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={isAdmin ? <Layout /> : <Navigate to="/" />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/add" element={<AddProject />} />
        <Route path="projects/edit/:id" element={<AddProject />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/add" element={<AddTask />} />
        <Route path="chat" element={<AdminChat />} />
      </Route>

      {/* Student Routes */}
      <Route path="/student" element={isStudent ? <Layout /> : <Navigate to="/" />}>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="projects" element={<StudentProjects />} />
        <Route path="tasks" element={<StudentTasks />} />
        <Route path="chat" element={<StudentChat />} />
      </Route>

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;