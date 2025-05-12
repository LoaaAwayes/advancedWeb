import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <div className="w-full max-w-md px-8 py-10 bg-[#1a1a1a] text-white">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;