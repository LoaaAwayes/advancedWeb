import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ADMIN_STATS, GET_STUDENTS } from '../../graphql/queries';
import DashboardChart from '../../components/charts/DashboardChart';

function Dashboard() {
  const [dateTime, setDateTime] = useState('');
  const [adminStats, setAdminStats] = useState({
    totalProjects: 0,
    totalStudents: 0,
    totalTasks: 0,
    completedProjects: 0,
    activeProjects: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0
  });

  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery(GET_ADMIN_STATS, {
    fetchPolicy: 'network-only'
  });

  const { data: studentsData, loading: studentsLoading } = useQuery(GET_STUDENTS, {
    fetchPolicy: 'network-only'
  });

  const loading = statsLoading || studentsLoading;

  useEffect(() => {
    if (statsData && statsData.getAdminStats) {
      setAdminStats(statsData.getAdminStats);
    }
  }, [statsData]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchStats]);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      setDateTime(now.toLocaleDateString('en-US', options));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-darktext">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#007bff]">
          Welcome to the Task Management System
        </h1>
        <div className="text-right">
          <div className="text-sm text-white">{dateTime}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div
          className="bg-[#232323] p-6 rounded-lg text-center"
          style={{ boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)' }}
        >
          <h3 className="text-[18px] text-[#ccc] mb-4">Number of Projects</h3>
          <p className="text-[36px] font-bold text-[#2bb3ff]">{adminStats.totalProjects}</p>
        </div>

        <div
          className="bg-[#232323] p-6 rounded-lg text-center"
          style={{ boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)' }}
        >
          <h3 className="text-[18px] text-[#ccc] mb-4">Number of Students</h3>
          <p className="text-[36px] font-bold text-[#2bb3ff]">{adminStats.totalStudents}</p>
        </div>

        <div
          className="bg-[#232323] p-6 rounded-lg text-center"
          style={{ boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)' }}
        >
          <h3 className="text-[18px] text-[#ccc] mb-4">Number of Tasks</h3>
          <p className="text-[36px] font-bold text-[#2bb3ff]">{adminStats.totalTasks}</p>
        </div>

        <div
          className="bg-[#232323] p-6 rounded-lg text-center"
          style={{ boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)' }}
        >
          <h3 className="text-[18px] text-[#ccc] mb-4">Completed Projects</h3>
          <p className="text-[36px] font-bold text-[#2bb3ff]">{adminStats.completedProjects}</p>
        </div>
      </div>

      <div className="mt-6">
        <div
          className="bg-[#232323] rounded-lg p-6 h-[500px] w-full"
          style={{ boxShadow: '0 0 20px rgba(255, 255, 255, 0.15)' }}
        >
          <h2 className="text-xl font-bold mb-4 text-center text-white">Admin Dashboard Overview</h2>
          <DashboardChart title="System Statistics" />
        </div>
      </div>


    </div>

  );
}

export default Dashboard;
