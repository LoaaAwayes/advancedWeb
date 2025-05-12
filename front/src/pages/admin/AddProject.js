import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { GET_STUDENTS, CREATE_PROJECT, ASSIGN_PROJECT } from '../../graphql/queries';
import { useData } from '../../context/DataContext';

const AddProject = () => {
  const navigate = useNavigate();
  const { refreshData } = useData();
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    startDate: '',
    endDate: '',
    status: 'in_progress', // Changed to match backend status format
  });

  // Query to get students
  const { data: studentsData, loading: loadingStudents } = useQuery(GET_STUDENTS, {
    fetchPolicy: 'network-only'
  });

  // Mutations for creating project and assigning students
  const [createProjectMutation] = useMutation(CREATE_PROJECT);
  const [assignProjectMutation] = useMutation(ASSIGN_PROJECT);

  useEffect(() => {
    // Update students list when data is fetched
    if (studentsData && studentsData.getUsers) {
      // Filter to only include students
      const studentUsers = studentsData.getUsers.filter(user => user.role === 'student');
      setStudents(studentUsers);
    }
  }, [studentsData]);

  const handleSelectStudent = (student) => {
    // Check if student is already selected by ID
    if (!selectedStudents.some(s => s.id === student.id)) {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleRemoveStudent = (studentId) => {
    setSelectedStudents(selectedStudents.filter((s) => s.id !== studentId));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the project
      const { data } = await createProjectMutation({
        variables: {
          name: form.name,
          description: form.description,
          // Note: We're not sending category, startDate, endDate as they're not in the GraphQL schema
          // The backend will set default values
        }
      });

      if (data && data.createProject) {
        const projectId = data.createProject.id;

        // Assign students to the project
        for (const student of selectedStudents) {
          await assignProjectMutation({
            variables: {
              projectId,
              studentId: student.id
            }
          });
        }

        // Refresh data in the context
        refreshData();

        alert('Project added successfully!');
        navigate('/projects');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#222] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-[800px] bg-[#232323] p-8 rounded-lg shadow-[0_0_40px_rgba(255,255,255,0.1)]">
        <h2 className="text-[28px] text-center text-[#2bb3ff] font-bold mb-8">Add New Project</h2>
        <form onSubmit={handleSubmit}>
          {/* Project Title */}
          <div className="mb-5">
            <label className="block text-[#ccc] font-bold mb-2">Project Title :</label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="form-input w-full p-3 bg-[#333] text-white border border-[#555] rounded"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-[#ccc] font-bold mb-2">Project Description :</label>
            <textarea
              name="description"
              required
              value={form.description}
              onChange={handleChange}
              className="form-input w-full p-3 bg-[#333] text-white border border-[#555] rounded resize-y min-h-[100px]"
            />
          </div>

          {/* Student List */}
          <div className="mb-5">
            <label className="block text-[#ccc] font-bold mb-2">Student List :</label>
            <div className="bg-[#333] border border-[#555] rounded p-4 max-h-[200px] overflow-y-auto">
              {loadingStudents ? (
                <p className="text-center text-gray-400">Loading students...</p>
              ) : students.length === 0 ? (
                <p className="text-center text-gray-400">No students available</p>
              ) : (
                students.map((student) => (
                  <p
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className="p-2 cursor-pointer hover:bg-[#444] rounded"
                  >
                    {student.username}
                  </p>
                ))
              )}
            </div>
          </div>

          {/* Selected Students */}
          <div className="mb-5">
            <label className="block text-[#ccc] font-bold mb-2">Selected Students</label>
            <div className="bg-[#333] p-3 border border-[#555] rounded">
              {selectedStudents.length === 0 ? (
                <p className="text-gray-400">No students selected</p>
              ) : (
                selectedStudents.map((student) => (
                  <span
                    key={student.id}
                    onClick={() => handleRemoveStudent(student.id)}
                    className="inline-block bg-[#007bff] text-white px-3 py-1 rounded mr-2 mb-2 text-sm cursor-pointer hover:bg-[#0056b3]"
                  >
                    {student.username}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="block text-[#ccc] font-bold mb-2">Project Category :</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="form-input w-full p-3 bg-[#333] text-white border border-[#555] rounded"
            >
              <option value="">Select a category</option>
              <option>Web Development</option>
              <option>Mobile Development</option>
              <option>Cloud Computing</option>
              <option>DevOps</option>
              <option>Cybersecurity</option>
              <option>Data Science</option>
              <option>Machine Learning</option>
            </select>
          </div>

          {/* Start & End Dates */}
          <div className="mb-5">
            <label className="block text-[#ccc] font-bold mb-2">Starting Date :</label>
            <input
              type="date"
              name="startDate"
              required
              value={form.startDate}
              onChange={handleChange}
              className="form-input w-full p-3 bg-[#333] text-white border border-[#555] rounded"
            />
          </div>

          <div className="mb-5">
            <label className="block text-[#ccc] font-bold mb-2">Ending Date :</label>
            <input
              type="date"
              name="endDate"
              required
              value={form.endDate}
              onChange={handleChange}
              className="form-input w-full p-3 bg-[#333] text-white border border-[#555] rounded"
            />
          </div>

          {/* Status */}
          <div className="mb-5">
            <label className="block text-[#ccc] font-bold mb-2">Project Status:</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full p-3 bg-[#333] text-white border border-[#555] rounded"
            >
              <option>In Progress</option>
              <option>Completed</option>
              <option>Pending</option>
              <option>On Hold</option>
              <option>Cancelled</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 mt-6 ${loading ? 'bg-gray-500' : 'bg-[#00b621] hover:bg-[#007912]'} text-white font-bold rounded`}
          >
            {loading ? 'Creating Project...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddProject;
