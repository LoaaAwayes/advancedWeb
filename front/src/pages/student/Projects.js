import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { GET_MY_PROJECTS, GET_PROJECT_TASKS, UPDATE_PROJECT_COMPLETION } from '../../graphql/queries';

const Projects = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Get Apollo client for direct queries
  const client = useApolloClient();

  // Fetch student's projects
  const { data: projectsData, loading: loadingProjects, refetch: refetchProjects } = useQuery(GET_MY_PROJECTS, {
    fetchPolicy: 'network-only'
  });

  // Mutation for updating project completion
  const [updateProjectCompletion] = useMutation(UPDATE_PROJECT_COMPLETION, {
    onCompleted: () => {
      refetchProjects();
    }
  });

  // Get projects from query result
  const projects = projectsData?.getMyProjects || [];

  // Handle project selection and fetch tasks
  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setLoadingTasks(true);

    try {
      // Fetch tasks for the selected project
      const { data } = await client.query({
        query: GET_PROJECT_TASKS,
        variables: { projectId: project.id },
        fetchPolicy: 'network-only'
      });

      if (data && data.getProjectTasks) {
        setProjectTasks(data.getProjectTasks);
      } else {
        setProjectTasks([]);
      }
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      setProjectTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Handle project completion percentage change
  const handleProgressChange = async (projectId, newProgress) => {
    try {
      await updateProjectCompletion({
        variables: {
          id: projectId,
          completionPercentage: newProgress
        }
      });
    } catch (error) {
      console.error('Error updating project completion:', error);
    }
  };

  // Filter projects based on search term and status
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All Statuses' ? true :
      (statusFilter === 'In Progress' && project.status === 'in_progress') ||
      (statusFilter === project.status);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="relative p-6">
      <div className="mb-6">
        <h2 className="text-[28px] font-bold text-[#2bb3ff]">Projects Overview</h2>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
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
        {loadingProjects ? (
          <p className="text-[#aaa]">Loading projects...</p>
        ) : filteredProjects.length === 0 ? (
          <p className="text-[#aaa]">No projects found.</p>
        ) : (
          filteredProjects.map((project) => {
            const completionPercentage = project.completionPercentage || 0;
            const color = `hsl(${completionPercentage * 1.2}, 100%, 45%)`;

            // Format status for display
            const displayStatus = project.status === 'in_progress' ? 'In Progress' :
                                 project.status.charAt(0).toUpperCase() + project.status.slice(1);

            return (
              <div
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className={`cursor-pointer bg-[#292929] p-4 rounded-lg w-[300px] h-[300px] flex flex-col justify-between shadow transition-all duration-200 border-2
                  ${selectedProject?.id === project.id
                    ? 'border-yellow-400'
                    : 'border-[#444] hover:border-[#2bb3ff]'}`}
              >
                <div>
                  <h3 className="text-[#2bb3ff] text-xl font-bold mb-2">{project.name}</h3>
                  <p className="text-base mb-4"><strong>Description:</strong> {project.description || '—'}</p>
                  <p className="text-base mb-4"><strong>Status:</strong>{' '}
                    <span style={{ color }}>{displayStatus}</span>
                  </p>
                </div>

                <div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={completionPercentage}
                    onChange={(e) =>
                      handleProgressChange(project.id, parseInt(e.target.value))
                    }
                    className="w-full mt-2 h-[6px] appearance-none rounded-full bg-[#444] transition-all duration-500"
                    style={{
                      background: `linear-gradient(to right, ${color} ${completionPercentage}%, #444 ${completionPercentage}%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-[#ccc] mt-2">
                    <span>{completionPercentage}% Complete</span>
                    <span>{new Date(project.createdAt).toLocaleDateString() || '-'}</span>
                  </div>
                </div>
              </div>
            );
          })
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
            <p><span className="font-semibold">Status:</span> {selectedProject.status === 'in_progress' ? 'In Progress' :
                                                             selectedProject.status.charAt(0).toUpperCase() + selectedProject.status.slice(1)}</p>
            <p><span className="font-semibold">Completion:</span> {selectedProject.completionPercentage || 0}%</p>
            <p><span className="font-semibold">Created:</span> {new Date(selectedProject.createdAt).toLocaleDateString()}</p>
          </div>

          <h4 className="mt-8 text-xl font-bold text-[#00ffff] border-b border-gray-600 pb-2">Tasks</h4>

          {loadingTasks ? (
            <div className="mt-4 text-center">
              <p className="text-gray-400">Loading tasks...</p>
            </div>
          ) : projectTasks.length === 0 ? (
            <p className="mt-4 text-gray-400">No tasks found for this project.</p>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
};

export default Projects;
