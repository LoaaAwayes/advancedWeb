import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@apollo/client';
import { GET_STUDENT_DASHBOARD } from '../../graphql/queries';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import DashboardChartS from '../../components/charts/DashboardChartS';

function Dashboard() {
  const { currentUser } = useAuth();
  const [chartData, setChartData] = useState({
    labels: ['My Projects', 'My Tasks', 'Completed Projects', 'Completed Tasks'],
    values: [0, 0, 0, 0]
  });

  const { data: dashboardData, loading } = useQuery(GET_STUDENT_DASHBOARD, {
    fetchPolicy: 'network-only',
    pollInterval: 10000 
  });

  const student = dashboardData?.getStudentDashboard?.student || {};
  const stats = dashboardData?.getStudentDashboard?.stats || {
    assignedProjects: 0,
    completedProjects: 0,
    assignedTasks: 0,
    completedTasks: 0
  };
  const assignedProjects = dashboardData?.getStudentDashboard?.assignedProjects || [];
  const recentTasks = dashboardData?.getStudentDashboard?.recentTasks || [];

  useEffect(() => {
    if (dashboardData?.getStudentDashboard) {
      const { stats } = dashboardData.getStudentDashboard;

      setChartData({
        labels: ['My Projects', 'My Tasks', 'Completed Projects', 'Completed Tasks'],
        values: [
          stats.assignedProjects,
          stats.assignedTasks,
          stats.completedProjects,
          stats.completedTasks
        ]
      });
    }
  }, [dashboardData]);

  if (loading) {
    return <div className="text-center py-8 text-darktext">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-darktext">My Dashboard</h1>
      </div>

      <div className="bg-darkcard rounded-lg shadow-md p-6 border border-darkborder">
        <h2 className="text-lg font-semibold mb-2 text-darktext">Student Information</h2>
        <p className="text-darktextsecondary">
          <span className="font-medium text-darktext">Username:</span> {student.username}
        </p>
        <p className="text-darktextsecondary">
          <span className="font-medium text-darktext">University ID:</span> {student.universityId || 'Not Available'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="bg-darkheader">
            <h3 className="text-lg font-semibold text-primary">My Projects</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-darktext">{stats.assignedProjects}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-darkheader">
            <h3 className="text-lg font-semibold text-warning">My Tasks</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-darktext">{stats.assignedTasks}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-darkheader">
            <h3 className="text-lg font-semibold text-success">Completed Projects</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-darktext">{stats.completedProjects}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-darkheader">
            <h3 className="text-lg font-semibold text-info">Completed Tasks</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-darktext">{stats.completedTasks}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-darkcard rounded-lg shadow-md p-6 border border-darkborder">
        <h2 className="text-xl font-bold mb-4 text-darktext">My Progress Overview</h2>
        <DashboardChartS data={chartData} />
      </div>
    </div>
  );
}

export default Dashboard;
