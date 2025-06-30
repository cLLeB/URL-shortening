import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { Url, UrlAnalytics } from '../types';
import { formatDate, formatNumber, copyToClipboard, TIME_RANGES } from '../utils';
import LoadingSpinner from '../components/LoadingSpinner';

const UrlDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState<Url | null>(null);
  const [analytics, setAnalytics] = useState<UrlAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (id) {
      loadUrlDetails();
    }
  }, [id, timeRange]);

  const loadUrlDetails = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [urlData, analyticsData] = await Promise.all([
        apiService.getUrl(id),
        apiService.getUrlAnalytics(id, timeRange),
      ]);
      setUrl(urlData);
      setAnalytics(analyticsData);
    } catch (error: any) {
      toast.error('Failed to load URL details');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (url) {
      const success = await copyToClipboard(url.shortUrl);
      if (success) {
        toast.success('URL copied to clipboard!');
      } else {
        toast.error('Failed to copy URL');
      }
    }
  };

  const handleDeleteUrl = async () => {
    if (!url || !window.confirm('Are you sure you want to delete this URL?')) {
      return;
    }

    try {
      await apiService.deleteUrl(url.id);
      toast.success('URL deleted successfully');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Failed to delete URL');
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  if (!url || !analytics) {
    return (
      <div className='text-center py-12'>
        <h3 className='text-lg font-medium text-gray-900'>URL not found</h3>
        <p className='text-gray-500'>The URL you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <button
            onClick={() => navigate('/dashboard')}
            className='p-2 text-gray-400 hover:text-gray-600 rounded-md'
          >
            <ArrowLeftIcon className='h-5 w-5' />
          </button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>URL Details</h1>
            <p className='text-gray-600'>View analytics and manage your URL</p>
          </div>
        </div>
        <div className='flex items-center space-x-3'>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className='input w-auto'
          >
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button onClick={handleDeleteUrl} className='btn-danger'>
            <TrashIcon className='h-4 w-4 mr-2' />
            Delete
          </button>
        </div>
      </div>

      {/* URL Information */}
      <div className='card'>
        <div className='card-body'>
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <div className='flex items-center space-x-3 mb-4'>
                <h2 className='text-xl font-semibold text-gray-900'>
                  {url.title || 'Untitled URL'}
                </h2>
                <span className={`badge ${url.isActive ? 'badge-success' : 'badge-secondary'}`}>
                  {url.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`badge ${url.isPublic ? 'badge-primary' : 'badge-warning'}`}>
                  {url.isPublic ? 'Public' : 'Private'}
                </span>
              </div>

              <div className='space-y-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-500 mb-1'>Short URL</label>
                  <div className='flex items-center space-x-2'>
                    <code className='text-lg font-mono text-primary-600 bg-primary-50 px-3 py-2 rounded-md'>
                      {url.shortUrl}
                    </code>
                    <button
                      onClick={handleCopyUrl}
                      className='p-2 text-gray-400 hover:text-gray-600 rounded-md'
                      title='Copy URL'
                    >
                      <ClipboardDocumentIcon className='h-5 w-5' />
                    </button>
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-500 mb-1'>
                    Original URL
                  </label>
                  <a
                    href={url.originalUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary-600 hover:text-primary-800 break-all'
                  >
                    {url.originalUrl}
                  </a>
                </div>

                {url.description && (
                  <div>
                    <label className='block text-sm font-medium text-gray-500 mb-1'>
                      Description
                    </label>
                    <p className='text-gray-900'>{url.description}</p>
                  </div>
                )}

                <div className='grid grid-cols-2 gap-4 pt-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-500'>Created</label>
                    <p className='text-gray-900'>{formatDate(url.createdAt)}</p>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-500'>Last Accessed</label>
                    <p className='text-gray-900'>
                      {url.lastAccessed ? formatDate(url.lastAccessed) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='card'>
          <div className='card-body'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <ChartBarIcon className='h-6 w-6 text-primary-600' />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-500'>Total Clicks</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {formatNumber(analytics.url.totalClicks)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='card'>
          <div className='card-body'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <ChartBarIcon className='h-6 w-6 text-success-600' />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-500'>Period Clicks</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {formatNumber(analytics.summary.totalClicksInRange)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='card'>
          <div className='card-body'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <ChartBarIcon className='h-6 w-6 text-warning-600' />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-500'>Countries</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {formatNumber(analytics.summary.uniqueCountries)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='card'>
          <div className='card-body'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <ChartBarIcon className='h-6 w-6 text-error-600' />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-500'>Devices</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {formatNumber(analytics.summary.uniqueDevices)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Details */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Top Countries */}
        <div className='card'>
          <div className='card-header'>
            <h3 className='text-lg font-medium text-gray-900'>Top Countries</h3>
          </div>
          <div className='card-body'>
            {analytics.clicksByCountry.length === 0 ? (
              <p className='text-gray-500 text-center py-4'>No data available</p>
            ) : (
              <div className='space-y-3'>
                {analytics.clicksByCountry.slice(0, 5).map((country, index) => (
                  <div key={country.country} className='flex items-center justify-between'>
                    <div className='flex items-center'>
                      <span className='text-sm font-medium text-gray-900'>
                        {country.country || 'Unknown'}
                      </span>
                    </div>
                    <div className='text-sm text-gray-500'>
                      {formatNumber(country.clicks)} clicks
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Devices */}
        <div className='card'>
          <div className='card-header'>
            <h3 className='text-lg font-medium text-gray-900'>Device Types</h3>
          </div>
          <div className='card-body'>
            {analytics.clicksByDevice.length === 0 ? (
              <p className='text-gray-500 text-center py-4'>No data available</p>
            ) : (
              <div className='space-y-3'>
                {analytics.clicksByDevice.map((device, index) => (
                  <div key={device.deviceType} className='flex items-center justify-between'>
                    <div className='flex items-center'>
                      <span className='text-sm font-medium text-gray-900 capitalize'>
                        {device.deviceType}
                      </span>
                    </div>
                    <div className='text-sm text-gray-500'>
                      {formatNumber(device.clicks)} clicks
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Clicks */}
      <div className='card'>
        <div className='card-header'>
          <h3 className='text-lg font-medium text-gray-900'>Recent Clicks</h3>
        </div>
        <div className='card-body p-0'>
          {analytics.recentClicks.length === 0 ? (
            <div className='text-center py-12'>
              <ChartBarIcon className='mx-auto h-12 w-12 text-gray-400' />
              <h3 className='mt-2 text-sm font-medium text-gray-900'>No clicks yet</h3>
              <p className='mt-1 text-sm text-gray-500'>
                Share your URL to start seeing click data.
              </p>
            </div>
          ) : (
            <div className='overflow-hidden'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Time
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Location
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Device
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Browser
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {analytics.recentClicks.slice(0, 10).map((click, index) => (
                    <tr key={index} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                        {formatDate(click.clickedAt, 'MMM dd, HH:mm')}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {click.city && click.country
                          ? `${click.city}, ${click.country}`
                          : click.country || 'Unknown'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize'>
                        {click.deviceType}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {click.browser}
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

export default UrlDetailsPage;
