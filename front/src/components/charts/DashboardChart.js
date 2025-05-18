import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ADMIN_STATS } from '../../graphql/queries';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function DashboardChart({ title }) {
  const [chartData, setChartData] = useState({
    labels: ['Projects', 'Students', 'Tasks', 'Completed Projects'],
    datasets: [{
      label: 'Count',
      data: [0, 0, 0, 0],
      backgroundColor: [
        'rgba(54, 162, 235, 0.6)',     
        'rgba(255, 206, 86, 0.6)',     
        'rgba(75, 192, 192, 0.6)',    
        'rgba(153, 102, 255, 0.6)',    
      ],
      borderColor: [
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
      ],
      borderWidth: 2,
      borderRadius: 6,
    }]
  });

  const { data: statsData, loading } = useQuery(GET_ADMIN_STATS, {
    fetchPolicy: 'network-only',
    pollInterval: 30000 
  });

  useEffect(() => {
    if (statsData && statsData.getAdminStats) {
      const stats = statsData.getAdminStats;

      setChartData(prevData => ({
        ...prevData,
        datasets: [{
          ...prevData.datasets[0],
          data: [
            stats.totalProjects,
            stats.totalStudents,
            stats.totalTasks,
            stats.completedProjects
          ]
        }]
      }));
    }
  }, [statsData]);

  const maxValue = statsData?.getAdminStats ?
    Math.max(
      statsData.getAdminStats.totalProjects,
      statsData.getAdminStats.totalStudents,
      statsData.getAdminStats.totalTasks,
      statsData.getAdminStats.completedProjects
    ) : 10;

  const yAxisMax = Math.ceil(maxValue * 1.2);

  const chartOptions = {
    responsive: true,
    animation: {
      duration: 1000 
    },
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#ccc',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: !!title,
        text: title || 'Admin Dashboard Statistics',
        color: '#ccc',
        font: { size: 16 },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#555',
        borderWidth: 1,
        padding: 10,
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
        max: yAxisMax,
        ticks: {
          color: '#ccc',
          stepSize: Math.max(1, Math.ceil(yAxisMax / 10)),
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderDash: [4, 4],
        },
        title: {
          display: true,
          text: 'Count',
          color: '#ccc',
          font: {
            size: 14
          }
        }
      },
      x: {
        ticks: {
          color: '#ccc',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderDash: [4, 4],
        },
      },
    },
  };

  return (
    <div className="h-[300px] w-[1100px]"> 
      <Bar options={chartOptions} data={chartData} />
    </div>
  );
}

export default DashboardChart;
