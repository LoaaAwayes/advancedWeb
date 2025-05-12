import { createContext, useContext, useState, useEffect } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import { SIGNIN_MUTATION, SIGNUP_MUTATION, ME_QUERY } from '../graphql/queries';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token') || null);

  const client = useApolloClient();

  const [signinMutation] = useMutation(SIGNIN_MUTATION);
  const [signupMutation] = useMutation(SIGNUP_MUTATION);

  // Check if user is logged in on app load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (token) {
      // Fetch current user data
      client.query({
        query: ME_QUERY,
        fetchPolicy: 'network-only'
      })
      .then(({ data }) => {
        if (data && data.me) {
          setCurrentUser(data.me.username);
          setUserId(data.me.id);
          setIsAdmin(data.me.role === 'admin');
          setIsStudent(data.me.role === 'student');
        } else {
          // If no user data, clear token
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_info');
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [client]);

  // Sign in function
  const signIn = async (username, password, staySignedIn) => {
    try {
      const { data } = await signinMutation({
        variables: { username, password }
      });

      if (data && data.signin) {
        const { token, user } = data.signin;

        // Save token and user info
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_info', JSON.stringify(user));

        if (staySignedIn) {
          localStorage.setItem('staySignedIn', 'true');
        }

        setToken(token);
        setCurrentUser(user.username);
        setUserId(user.id);
        setIsAdmin(user.role === 'admin');
        setIsStudent(user.role === 'student');

        return { success: true };
      }

      return {
        success: false,
        message: 'Authentication failed.'
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        message: error.message || 'Invalid username or password. Please try again.'
      };
    }
  };

  // Sign up function
  const signUp = async (username, password, isStudent, universityId) => {
    try {
      // Only students can sign up
      if (!isStudent) {
        return {
          success: false,
          message: "Only students can sign up!"
        };
      }

      const { data } = await signupMutation({
        variables: {
          username,
          password,
          universityId
        }
      });

      if (data && data.signup) {
        return { success: true };
      }

      return {
        success: false,
        message: 'Failed to create account.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create account.'
      };
    }
  };

  // Sign out function
  const signOut = () => {
    // Remove auth token
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');

    // Only remove staySignedIn if not staying signed in
    if (localStorage.getItem('staySignedIn') !== 'true') {
      localStorage.removeItem('staySignedIn');
    }

    // Reset state
    setToken(null);
    setCurrentUser(null);
    setUserId(null);
    setIsAdmin(false);
    setIsStudent(false);

    // Clear Apollo cache
    client.clearStore();
  };

  const value = {
    currentUser,
    userId,
    isAdmin,
    isStudent,
    token,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}