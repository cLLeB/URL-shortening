import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  LinkIcon,
  ChartBarIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { CreateUrlData, Url, UserStats } from '../types';
import { formatDate, formatNumber, copyToClipboard, truncateText } from '../utils';
import LoadingSpinner from '../components/LoadingSpinner';

const schema = yup.object({
  originalUrl: yup
    .string()
    .required('URL is required')
    .url('Please enter a valid URL'),
  customAlias: yup
    .string()
    .optional()
    .min(3, 'Custom alias must be at least 3 characters')
    .max(50, 'Custom alias must be less than 50 characters')
    .matches(/^[a-zA-Z0-9_-]*$/, 'Custom alias can only contain letters, numbers, hyphens, and underscores'),
  title: yup
    .string()
    .optional()
    .max(500, 'Title must be less than 500 characters'),
});

const DashboardPage: React.FC = () => {
  const [urls, setUrls] = useState<Url[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateUrlData>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [urlsData, statsData] = await Promise.all([
        apiService.getUrls({ limit: 10, sortBy: 'created_at', sortOrder: 'DESC' }),
        apiService.getUserStats(),
      ]);
      setUrls(urlsData.urls);
      setStats(statsData);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CreateUrlData) => {
    setIsCreating(true);
    try {
      const newUrl = await apiService.createUrl(data);
      setUrls([newUrl, ...urls]);
      setShowCreateForm(false);
      reset();
      toast.success('URL created successfully!');
      
      // Refresh stats
      const updatedStats = await apiService.getUserStats();
      setStats(updatedStats);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create URL');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = async (shortUrl: string) => {
    const success = await copyToClipboard(shortUrl);
    if (success) {
      toast.success('URL copied to clipboard!');
    } else {
      toast.error('Failed to copy URL');
    }
  };

  const handleDeleteUrl = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this URL?')) {
      return;
    }

    try {
      await apiService.deleteUrl(id);
      setUrls(urls.filter(url => url.id !== id));
      toast.success('URL deleted successfully');
      
      // Refresh stats
      const updatedStats = await apiService.getUserStats();
      setStats(updatedStats);
    } catch (error: any) {
      toast.error('Failed to delete URL');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage your shortened URLs and view analytics</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create URL
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <LinkIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total URLs</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalUrls)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Clicks</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalClicks)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EyeIcon className="h-6 w-6 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active URLs</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.activeUrls)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.clicksThisMonth)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create URL Form */}
      {showCreateForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Create New URL</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="originalUrl" className="block text-sm font-medium text-gray-700">
                  Original URL *
                </label>
                <input
                  {...register('originalUrl')}
                  type="url"
                  placeholder="https://example.com/very-long-url"
                  className={`input ${errors.originalUrl ? 'input-error' : ''}`}
                />
                {errors.originalUrl && (
                  <p className="mt-1 text-sm text-error-600">{errors.originalUrl.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="customAlias" className="block text-sm font-medium text-gray-700">
                    Custom Alias
                  </label>
                  <input
                    {...register('customAlias')}
                    type="text"
                    placeholder="my-custom-link"
                    className={`input ${errors.customAlias ? 'input-error' : ''}`}
                  />
                  {errors.customAlias && (
                    <p className="mt-1 text-sm text-error-600">{errors.customAlias.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    placeholder="Optional title"
                    className={`input ${errors.title ? 'input-error' : ''}`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-error-600">{errors.title.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    reset();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary"
                >
                  {isCreating ? (
                    <>
                      <LoadingSpinner size="sm" color="white" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create URL'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent URLs */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent URLs</h3>
            <Link to="/analytics" className="text-sm text-primary-600 hover:text-primary-500">
              View all →
            </Link>
          </div>
        </div>
        <div className="card-body p-0">
          {urls.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No URLs yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first short URL.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create URL
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {urls.map((url) => (
                    <tr key={url.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900 font-mono">
                              {url.shortUrl}
                            </span>
                            <button
                              onClick={() => handleCopyUrl(url.shortUrl)}
                              className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                              title="Copy URL"
                            >
                              <ClipboardDocumentIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-sm text-gray-500">
                            {truncateText(url.originalUrl, 60)}
                          </div>
                          {url.title && (
                            <div className="text-sm font-medium text-gray-700 mt-1">
                              {url.title}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{formatNumber(url.clickCount)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{formatDate(url.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/urls/${url.id}`}
                            className="text-primary-600 hover:text-primary-900"
                            title="View details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteUrl(url.id)}
                            className="text-error-600 hover:text-error-900"
                            title="Delete URL"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
