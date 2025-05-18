import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';



function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    staySignedIn: false
  });
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (localStorage.getItem('staySignedIn') === 'true') {
      setFormData(prev => ({
        ...prev,
        username: localStorage.getItem('username') || '',
        password: localStorage.getItem('password') || '',
        staySignedIn: true
      }));
    }
  }, []);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const { username, password, staySignedIn } = formData;
    
    if (!username && !password) {
      setError('Please enter your username and password.');
      return;
    }
    
    if (!username) {
      setError('Please enter your username.');
      return;
    }
    
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    
    const result = signIn(username, password, staySignedIn);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };
  
  return (
    <div>
      <h1 className="text-4xl font-bold mb-10">Sign In</h1>
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
            id="staySignedIn"
            name="staySignedIn"
            checked={formData.staySignedIn}
            onChange={handleChange}
          />
          <label className="text-white text-xl">Stay Signed In</label>
        </div>
        
        {error && <p className="text-red-500 text-sm mb-6">{error}</p>}
        
        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded text-xl font-medium"
        >
          Sign In
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-white">
          Don't have an account? {' '}
          <Link to="/signup" className="text-blue-400 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignIn;