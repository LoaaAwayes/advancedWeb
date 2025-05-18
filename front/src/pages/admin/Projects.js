import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useLazyQuery } from '@apollo/client';
import { GET_ALL_PROJECTS, GET_PROJECT, GET_PROJECT_TASKS } from '../../graphql/queries';
import { useData } from '../../context/DataContext';

const Projects = () => {
  const { projects, loading, refreshData } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [getProject, { loading: projectLoading }] = useLazyQuery(GET_PROJECT, {
    onCompleted: (data) => {
      if (data && data.getProject) {
        setSelectedProject(data.getProject);
        setProjectTasks(data.getProject.tasks || []);
      }
      setLoadingTasks(false);
    },
    onError: (error) => {
      console.error('Error fetching project details:', error);
      setLoadingTasks(false);
    }
  });

  const [getProjectTasks, { loading: tasksLoading }] = useLazyQuery(GET_PROJECT_TASKS, {
    onCompleted: (data) => {
      if (data && data.getProjectTasks) {
        setProjectTasks(data.getProjectTasks);
      }
      setLoadingTasks(false);
    },
    onError: (error) => {
      console.error('Error fetching project tasks:', error);
      setLoadingTasks(false);
    }
  });

  useEffect(() => {
    refreshData();
  }, []);

  const handleSelectProject = (project) => {
    setLoadingTasks(true);

    getProject({
      variables: { id: project.id }
    });

    getProjectTasks({
      variables: { projectId: project.id }
    });
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const projectStatus = project.status ?
      project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ') : '';

    const matchesStatus =
      statusFilter === 'All Statuses' ||
      (statusFilter === 'In Progress' && (project.status === 'in_progress' || project.status === 'in progress')) ||
      (statusFilter === 'Completed' && project.status === 'completed') ||
      (statusFilter === 'Pending' && project.status === 'pending') ||
      (statusFilter === 'On Hold' && project.status === 'on_hold') ||
      (statusFilter === 'Cancelled' && project.status === 'cancelled');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="relative p-6">
      <div className="mb-6">
        <h2 className="text-[28px] font-bold text-[#2bb3ff]">Projects Overview</h2>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Link to="/admin/projects/add">
          <button className="bg-[#007bff] hover:bg-[#0056b3] text-white font-semibold py-2 px-4 rounded">
            Add New Project
          </button>
        </Link>

        <input
          type="text"
          placeholder="Search projects by title or description..."
          className="flex-grow px-4 py-2 rounded border border-[#555] bg-white text-black min-w-[300px]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="relative">
          <button
            className="w-[180px] border border-[#555] rounded bg-white text-black py-2 px-3 text-left"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {statusFilter}
          </button>
          {dropdownOpen && (
            <ul className="absolute mt-1 w-full bg-white text-black border border-[#444] rounded shadow z-10">
              {['All Statuses', 'In Progress', 'Completed', 'Pending', 'On Hold', 'Cancelled'].map((status) => (
                <li
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setDropdownOpen(false);
                  }}
                  className={`px-4 py-2 hover:bg-[#f0f0f0] cursor-pointer ${statusFilter === status ? 'font-bold' : ''}`}
                >
                  {status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

     
      <div className="flex flex-wrap gap-6">
        {filteredProjects.length === 0 ? (
          <p className="text-[#aaa]">No projects found.</p>
        ) : (
          filteredProjects.map((project, index) => (
            <div
              key={index}
              onClick={() => handleSelectProject(project)}
              className={`cursor-pointer bg-[#292929] p-4 rounded-lg w-[300px] h-[280px] flex flex-col justify-between shadow transition-all duration-200 border-2
                ${selectedProject?.id === project.id
                  ? 'border-yellow-400'
                  : 'border-[#444] hover:border-[#2bb3ff]'}`}
            >
              <div>
                <h3 className="text-[#2bb3ff] text-lg font-bold mb-2">{project.name}</h3>
                <p className="text-sm"><strong>Description:</strong> {project.description || '—'}</p>
                <p className="text-sm"><strong>Status:</strong> {project.status || 'N/A'}</p>
                <p className="text-sm"><strong>Students:</strong> {project.assignedTo ? project.assignedTo.map(student => student.username).join(', ') : 'N/A'}</p>
              </div>
              <div>
                <div className="w-full bg-[#444] rounded h-[20px] overflow-hidden mt-4">
                  <div
                    className="bg-[#007bff] h-full text-center text-white text-sm font-semibold"
                    style={{ width: `${project.completionPercentage || 0}%` }}
                  >
                    {project.completionPercentage || 0}%
                  </div>
                </div>
                <div className="flex justify-between text-xs text-[#ccc] mt-2">
                  <span>{project.startDate || '-'}</span>
                  <span>{project.endDate || '-'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>


      {selectedProject && (
        <div className="absolute top-0 right-0 w-[300px] bg-[#1c1c1c] text-white p-6 shadow-lg border border-gray-700 rounded-lg z-50">
          <div className="flex justify-between items-center mb-6 border-b border-gray-600 pb-2">
            <h3 className="text-2xl font-bold text-[#00ffff]">{selectedProject.name}</h3>
            <button
              onClick={() => {
                setSelectedProject(null);
                setProjectTasks([]);
              }}
              className="text-sm text-red-400 hover:underline"
            >
              Close
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <p><span className="font-semibold">Description:</span> {selectedProject.description || 'No description'}</p>
            <p><span className="font-semibold">Status:</span> {selectedProject.status || 'N/A'}</p>
            <p><span className="font-semibold">Completion:</span> {selectedProject.completionPercentage || 0}%</p>
            <p><span className="font-semibold">Students:</span> {selectedProject.assignedTo ? selectedProject.assignedTo.map(student => student.username).join(', ') : 'N/A'}</p>
            <p><span className="font-semibold">Created:</span> {new Date(selectedProject.createdAt).toLocaleDateString()}</p>
          </div>

          <h4 className="mt-8 text-xl font-bold text-[#00ffff] border-b border-gray-600 pb-2">Tasks</h4>

          {loadingTasks ? (
            <div className="mt-4 text-center">
              <p className="text-gray-400">Loading tasks...</p>
            </div>
          ) : projectTasks && projectTasks.length > 0 ? (
            <ul className="mt-4 list-disc pl-5">
              {projectTasks.map((task) => (
                <li key={task.id} className="mb-2">
                  <span className="text-white">{task.title}</span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                    task.status === 'completed' ? 'bg-green-600' :
                    task.status === 'in_progress' ? 'bg-blue-600' : 'bg-yellow-600'
                  }`}>
                    {task.status === 'in_progress' ? 'In Progress' :
                     task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-gray-400">No tasks found for this project.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Projects;
