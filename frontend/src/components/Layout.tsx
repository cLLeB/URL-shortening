import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div
          className='fixed inset-0 bg-gray-600 bg-opacity-75'
          onClick={() => setSidebarOpen(false)}
        />
        <div className='relative flex w-full max-w-xs flex-1 flex-col bg-white'>
          <div className='absolute top-0 right-0 -mr-12 pt-2'>
            <button
              type='button'
              className='ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white'
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className='h-6 w-6 text-white' />
            </button>
          </div>
          <div className='h-0 flex-1 overflow-y-auto pt-5 pb-4'>
            <div className='flex flex-shrink-0 items-center px-4'>
              <LinkIcon className='h-8 w-8 text-primary-600' />
              <span className='ml-2 text-xl font-bold text-gray-900'>URL Shortener</span>
            </div>
            <nav className='mt-5 space-y-1 px-2'>
              {navigation.map(item => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    isCurrentPath(item.href)
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`mr-4 h-6 w-6 flex-shrink-0 ${
                      isCurrentPath(item.href)
                        ? 'text-primary-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className='flex flex-shrink-0 border-t border-gray-200 p-4'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <div className='h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center'>
                  <span className='text-sm font-medium text-white'>
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
              <div className='ml-3'>
                <p className='text-sm font-medium text-gray-700'>{user?.firstName || 'User'}</p>
                <p className='text-xs text-gray-500'>{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className='hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col'>
        <div className='flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white'>
          <div className='flex flex-1 flex-col overflow-y-auto pt-5 pb-4'>
            <div className='flex flex-shrink-0 items-center px-4'>
              <LinkIcon className='h-8 w-8 text-primary-600' />
              <span className='ml-2 text-xl font-bold text-gray-900'>URL Shortener</span>
            </div>
            <nav className='mt-5 flex-1 space-y-1 bg-white px-2'>
              {navigation.map(item => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isCurrentPath(item.href)
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isCurrentPath(item.href)
                        ? 'text-primary-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className='flex flex-shrink-0 border-t border-gray-200 p-4'>
            <div className='flex w-full items-center justify-between'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center'>
                    <span className='text-sm font-medium text-white'>
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className='ml-3'>
                  <p className='text-sm font-medium text-gray-700'>{user?.firstName || 'User'}</p>
                  <p className='text-xs text-gray-500'>{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className='flex-shrink-0 p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500'
                title='Logout'
              >
                <ArrowRightOnRectangleIcon className='h-5 w-5' />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className='lg:pl-64'>
        {/* Top bar */}
        <div className='sticky top-0 z-10 bg-white pl-1 pt-1 sm:pl-3 sm:pt-3 lg:hidden'>
          <button
            type='button'
            className='-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500'
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className='h-6 w-6' />
          </button>
        </div>

        {/* Page content */}
        <main className='flex-1'>
          <div className='py-6'>
            <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
