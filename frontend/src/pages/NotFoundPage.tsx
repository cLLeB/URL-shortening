import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const NotFoundPage: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <div className='text-center'>
          <h1 className='text-9xl font-bold text-primary-600'>404</h1>
          <h2 className='mt-4 text-3xl font-bold tracking-tight text-gray-900'>Page not found</h2>
          <p className='mt-4 text-lg text-gray-600'>
            Sorry, we couldn't find the page you're looking for.
          </p>

          <div className='mt-8 flex flex-col sm:flex-row gap-4 justify-center'>
            <Link to='/' className='btn-primary inline-flex items-center'>
              <HomeIcon className='h-5 w-5 mr-2' />
              Go home
            </Link>
            <button
              onClick={() => window.history.back()}
              className='btn-secondary inline-flex items-center'
            >
              <ArrowLeftIcon className='h-5 w-5 mr-2' />
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
