import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';

function Layout() {
  const { currentUser, isAdmin, isStudent, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState('user');

  useEffect(() => {
    if (isAdmin) setRole('admin');
    else if (isStudent) setRole('student');
  }, [isAdmin, isStudent]);

  const handleLogout = () => {
    signOut();
    navigate('/signin');
  };

  const adminLinks = [
    { label: 'Home', path: '/admin/dashboard' },
    { label: 'Projects', path: '/admin/projects' },
    { label: 'Tasks', path: '/admin/tasks' },
    { label: 'Chat', path: '/admin/chat' },
  ];

  const studentLinks = [
    { label: 'My Home', path: '/student/dashboard' },
    { label: 'My Projects', path: '/student/projects' },
    { label: 'My Tasks', path: '/student/tasks' },
    { label: 'Chat', path: '/student/chat' },
  ];

  const links = role === 'admin' ? adminLinks : studentLinks;

  return (
    <div className="bg-[#1e1e1e] text-white min-h-screen">
     
      <header className="flex justify-end items-center px-[10px] fixed top-0 left-0 right-0 bg-[#222] z-[1000] border-b-2 border-black shadow-[0_2px_0_#474747] h-[50px]">
        <div className="flex items-center gap-4">
          <span className="text-[#ccc] text-[16px] font-bold">
            {role.charAt(0).toUpperCase() + role.slice(1)} {currentUser}
          </span>
          <button
            onClick={handleLogout}
            className="py-[5px] px-[15px] bg-[#dc3545] text-white text-[14px] font-bold rounded hover:bg-[#c82333] transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

     
      <aside className="fixed top-[50px] left-0 h-[calc(100vh-50px)] w-[250px] p-2 bg-[#333] border-r border-[#474747] flex flex-col z-[999] overflow-y-auto">
        <nav className="flex flex-col">
          {links.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`text-sm font-bold rounded-[10px] h-[50px] w-[220px] mx-auto my-[15px] px-[10px] text-center transition-colors duration-300 ${
                  isActive
                    ? 'bg-[#007bff] text-white'
                    : 'bg-[#444] text-[#ccc] hover:bg-[#007bff] hover:text-white'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </aside>

    
      <main className="ml-[250px] mt-[50px] p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
