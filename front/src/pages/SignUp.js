import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useMutation } from '@apollo/client';
import { SIGNUP_MUTATION } from '../graphql/queries';

function SignUp() {
  const { signUp } = useAuth();
  const { refreshData } = useData();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    isStudent: false,
    universityId: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [signupMutation, { loading: mutationLoading }] = useMutation(SIGNUP_MUTATION, {
    onError: (error) => {
      console.error('Signup error:', error);
      const errorMessage = error.graphQLErrors?.[0]?.message ||
                          error.networkError?.result?.errors?.[0]?.message ||
                          'An error occurred during registration.';

      if (errorMessage.includes('username')) {
        setError('Username already taken.');
      } else if (errorMessage.includes('universityId')) {
        setError('University ID already registered.');
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const { username, password, isStudent, universityId } = formData;

    if (!username && !password) {
      setError('Please enter your name and password.');
      setLoading(false);
      return;
    }

    if (!username) {
      setError('Please enter your name.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    if (username.length > 20) {
      setError('Username cannot exceed 20 characters.');
      setLoading(false);
      return;
    }

    if (password.length > 10) {
      setError('Password cannot exceed 10 characters.');
      setLoading(false);
      return;
    }

    if (isStudent && !universityId) {
      setError('University ID is required for students.');
      setLoading(false);
      return;
    }

    if (!isStudent) {
      setError('Only students can sign up. Please check the student checkbox.');
      setLoading(false);
      return;
    }

    try {
      const { data } = await signupMutation({
        variables: {
          username,
          password,
          universityId
        }
      });

      if (data && data.signup) {
        setSuccess(true);

        if (refreshData) {
          refreshData();
        }

        setTimeout(() => {
          navigate('/signin');
        }, 1500);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-10">Sign Up</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-white text-xl mb-2">Username</label>
          <input
            className="w-full px-4 py-3 rounded bg-[#313131] border-none text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            maxLength={20}
          />
        </div>

        <div className="mb-6">
          <label className="block text-white text-xl mb-2">Password</label>
          <input
            className="w-full px-4 py-3 rounded bg-[#313131] border-none text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            maxLength={10}
          />
        </div>

        <div className="mb-6 flex items-center">
          <input
            className="w-5 h-5 mr-3 bg-[#313131] border-none text-white rounded focus:ring-0"
            type="checkbox"
            id="isStudent"
            name="isStudent"
            checked={formData.isStudent}
            onChange={handleChange}
          />
          <label className="text-white text-xl">I am a student</label>
        </div>

        {formData.isStudent && (
          <div className="mb-6">
            <label className="block text-white text-xl mb-2">University ID</label>
            <input
              className="w-full px-4 py-3 rounded bg-[#313131] border-none text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              id="universityId"
              name="universityId"
              value={formData.universityId}
              onChange={handleChange}
              required
              maxLength={10}
              placeholder="Enter your university ID"
            />
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-6">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-6">Sign Up Successful!</p>}

        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded text-xl font-medium disabled:opacity-50"
          disabled={success || loading || mutationLoading}
        >
          {loading || mutationLoading ? 'Processing...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-white">
          Already have an account?{' '}
          <Link to="/signin" className="text-blue-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
