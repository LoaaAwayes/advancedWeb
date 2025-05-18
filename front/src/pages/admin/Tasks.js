import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_ALL_PROJECTS, GET_PROJECT_TASKS } from '../../graphql/queries';

const sortOptions = [
  { label: 'Task Status', value: 'status' },
  { label: 'Project', value: 'projectId' },
  { label: 'Due Date', value: 'dueDate' },
  { label: 'Assigned Student', value: 'assignedTo' },
];

function Tasks() {
  const [sortBy, setSortBy] = useState('status');
  const [sortedTasks, setSortedTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  
  const { data: projectsData, loading: loadingProjects, refetch: refetchProjects } = useQuery(GET_ALL_PROJECTS, {
    fetchPolicy: 'network-only'
  });

  
  useEffect(() => {
    async function fetchAllTasks() {
      setLoading(true);

      try {
        if (projectsData && projectsData.getAllProjects) {
          const projects = projectsData.getAllProjects;
          let tasksArray = [];

          for (const project of projects) {
            if (project.tasks && project.tasks.length > 0) {
              const projectTasks = project.tasks.map(task => ({
                ...task,
                projectName: project.name,
                projectId: project.id
              }));

              tasksArray = [...tasksArray, ...projectTasks];
            }
          }

          setAllTasks(tasksArray);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!loadingProjects) {
      fetchAllTasks();
    }
  }, [projectsData, loadingProjects]);

  useEffect(() => {
    if (!loading) {
      sortTasks(sortBy);
    }
  }, [allTasks, sortBy, loading]);

  const sortTasks = (criteria) => {
    const tasksCopy = [...allTasks];

    tasksCopy.sort((a, b) => {
      switch (criteria) {
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'projectId':
          return (a.projectName || '').localeCompare(b.projectName || '');
        case 'dueDate':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'assignedTo':
          const aName = a.assignedTo?.username || '';
          const bName = b.assignedTo?.username || '';
          return aName.localeCompare(bName);
        default:
          return 0;
      }
    });

    setSortedTasks(tasksCopy);
  };

  const refreshData = () => {
    refetchProjects();
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    if (!status) return 'text-gray-500';

    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-blue-500';
      case 'in_progress':
      case 'in progress':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';

    switch (status.toLowerCase()) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-white">Loading...</div>;
  }

  return (
    <div className="flex flex-col p-6 text-white">
 
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center space-x-2">
      <label htmlFor="sort-select" className="text-sm font-medium">Sort By:</label>
      <select
        id="sort-select"
        value={sortBy}
        onChange={handleSortChange}
        className="bg-gray-800 text-white border border-gray-600 px-3 py-1 rounded focus:outline-none"
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>

    <Link to="/admin/tasks/add">
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow">
        Create a New Task
      </button>
    </Link>
  </div>

  
  <div className="overflow-x-auto bg-[#1f1f1f] rounded-lg shadow-md">
    <table className="min-w-full text-sm">
      <thead className="bg-[#2a2a2a]">
        <tr>
          <th className="py-3 px-4 text-left font-semibold text-white">Task ID</th>
          <th className="py-3 px-4 text-left font-semibold text-white">Project</th>
          <th className="py-3 px-4 text-left font-semibold text-white">Task Name</th>
          <th className="py-3 px-4 text-left font-semibold text-white">Description</th>
          <th className="py-3 px-4 text-left font-semibold text-white">Assigned Student</th>
          <th className="py-3 px-4 text-left font-semibold text-white">Status</th>
          <th className="py-3 px-4 text-left font-semibold text-white">Due Date</th>
        </tr>
      </thead>
      <tbody>
        {sortedTasks.length === 0 ? (
          <tr>
            <td colSpan="7" className="px-4 py-3 text-center text-white">
              No tasks found
            </td>
          </tr>
        ) : (
          sortedTasks.map((task, index) => (
            <tr key={task.id} className="border-b border-gray-700 hover:bg-gray-800 transition">
              <td className="px-4 py-3">{task.id}</td>
              <td className="px-4 py-3">{task.projectName || 'N/A'}</td>
              <td className="px-4 py-3">{task.title}</td>
              <td className="px-4 py-3">{task.description || 'No description'}</td>
              <td className="px-4 py-3">{task.assignedTo?.username || 'Unassigned'}</td>
              <td className="px-4 py-3">
                <span className={getStatusClass(task.status)}>
                  {formatStatus(task.status)}
                </span>
              </td>
              <td className="px-4 py-3">{formatDate(task.dueDate)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>

  );
}

export default Tasks;
