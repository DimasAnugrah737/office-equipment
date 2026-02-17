import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from '../hooks/useForm';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiLock, FiSun, FiMoon } from 'react-icons/fi';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, theme, toggleTheme } = useAuth();

  const { values, errors, handleChange, handleBlur } = useForm({
    identifier: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validate = (values) => {
    const errors = {};
    if (!values.identifier) errors.identifier = 'Email or NIP is required';
    if (!values.password) errors.password = 'Password is required';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await login(values);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center min-h-screen w-full bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            {/* Container untuk header dan tombol tema */}
            <div className="flex justify-between items-start mb-8">
              <div className="text-center flex-1">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Office Equipment System
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Sign in to your account
                </p>
              </div>
              
              {/* Tombol tema di samping kanan */}
              <div className="ml-4">
                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
                </button>
              </div>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email or NIP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    value={values.identifier}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Enter email or NIP"
                  />
                </div>
                {errors.identifier && (
                  <p className="mt-1 text-sm text-red-600">{errors.identifier}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Enter password"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Sign in
                </button>
              </div>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Demo Accounts
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">Admin</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">admin@office.com</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">admin123</p>
                </div>
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">Officer</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">bob@office.com</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">password123</p>
                </div>
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">User</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">john@office.com</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">password123</p>
                </div>
              </div>
            </div>
            
            <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
              Note: Users cannot register independently. Please contact administrator for account creation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;