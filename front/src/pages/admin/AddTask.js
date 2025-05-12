import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_PROJECTS, GET_STUDENTS, CREATE_TASK, ASSIGN_TASK } from '../../graphql/queries';

const statusOptions = [
  { label: 'Select a status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

function AddTask() {
  const navigate = useNavigate();
  const { refreshData } = useData();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    studentId: '',
    status: 'pending',
    dueDate: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query to get projects
  const { data: projectsData, loading: loadingProjects } = useQuery(GET_ALL_PROJECTS, {
    fetchPolicy: 'network-only'
  });

  // Query to get students
  const { data: studentsData, loading: loadingStudents } = useQuery(GET_STUDENTS, {
    fetchPolicy: 'network-only'
  });

  // Mutations for creating task and assigning to student
  const [createTaskMutation] = useMutation(CREATE_TASK);
  const [assignTaskMutation] = useMutation(ASSIGN_TASK);

  // Set default due date to a week from now
  useEffect(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    setFormData(prev => ({
      ...prev,
      dueDate: nextWeek.toISOString().split('T')[0]
    }));
  }, []);

  // Extract projects and students from query results
  const projects = projectsData?.getAllProjects || [];
  const students = studentsData?.getUsers?.filter(user => user.role === 'student') || [];
  const loading = loadingProjects || loadingStudents;

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clear any error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    if (!formData.studentId) {
      newErrors.studentId = 'Student is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the task
      const { data } = await createTaskMutation({
        variables: {
          projectId: formData.projectId,
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate
        }
      });

      if (data && data.createTask) {
        // Assign the task to the selected student
        if (formData.studentId) {
          await assignTaskMutation({
            variables: {
              taskId: data.createTask.id,
              studentId: formData.studentId
            }
          });
        }

        // Refresh data
        refreshData();

        alert('Task created successfully!');
        navigate('/admin/tasks');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    navigate('/admin/tasks');
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }


    return (
      <div className="min-h-screen bg-[#222] text-white flex items-center justify-center p-4">
        <div className="max-w-[800px] w-full bg-[#232323] p-8 rounded-lg shadow-lg shadow-[0_0_40px_rgba(255,255,255,0.1)]">
          <h2 className="text-[28px] text-center text-[#2bb3ff] font-bold mb-8">Add New Task</h2>
          <form onSubmit={handleSubmit}>

            {/* Project */}
            <div className="mb-5">
              <label className="block text-[#ccc] font-bold mb-2">Project :</label>
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                required
                className="w-full p-3 bg-[#333] text-white border border-[#555] rounded"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              {errors.projectId && <p className="text-red-500 mt-1">{errors.projectId}</p>}
            </div>

            {/* Title */}
            <div className="mb-5">
              <label className="block text-[#ccc] font-bold mb-2">Task Title :</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full p-3 bg-[#333] text-white border border-[#555] rounded"
              />
              {errors.title && <p className="text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="block text-[#ccc] font-bold mb-2">Task Description :</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
                className="w-full p-3 bg-[#333] text-white border border-[#555] rounded resize-y"
              />
              {errors.description && <p className="text-red-500 mt-1">{errors.description}</p>}
            </div>

            {/* Student */}
            <div className="mb-5">
              <label className="block text-[#ccc] font-bold mb-2">Assign to Student :</label>
              <select
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                required
                className="w-full p-3 bg-[#333] text-white border border-[#555] rounded"
              >
                <option value="">Select a student</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.username}
                  </option>
                ))}
              </select>
              {errors.studentId && <p className="text-red-500 mt-1">{errors.studentId}</p>}
            </div>

            {/* Status */}
            <div className="mb-5">
              <label className="block text-[#ccc] font-bold mb-2">Status :</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-3 bg-[#333] text-white border border-[#555] rounded"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="mb-5">
              <label className="block text-[#ccc] font-bold mb-2">Due Date :</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full p-3 bg-[#333] text-white border border-[#555] rounded"
              />
              {errors.dueDate && <p className="text-red-500 mt-1">{errors.dueDate}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 mt-6 ${isSubmitting ? 'bg-gray-500' : 'bg-[#00b621] hover:bg-[#007912]'} text-white font-bold rounded`}
            >
              {isSubmitting ? 'Creating Task...' : 'Create Task'}
            </button>
          </form>
        </div>
      </div>
    );


}

export default AddTask;