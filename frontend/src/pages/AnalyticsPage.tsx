import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { Url, UserAnalytics, AnalyticsFilters } from '../types';
import { formatNumber, formatDate, TIME_RANGES } from '../utils';
import LoadingSpinner from '../components/LoadingSpinner';

const AnalyticsPage: React.FC = () => {
  const [urls, setUrls] = useState<Url[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [topUrls, setTopUrls] = useState<Url[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [urlsData, analyticsData, topUrlsData] = await Promise.all([
        apiService.getUrls({ limit: 50, sortBy: 'click_count', sortOrder: 'DESC' }),
        apiService.getUserAnalytics(timeRange),
        apiService.getTopUrls({
          timeRange: timeRange as '24h' | '7d' | '30d' | '90d' | '1y',
          limit: 10,
          sortBy: 'clicks',
        }),
      ]);

      setUrls(urlsData.urls);
      setAnalytics(analyticsData);
      setTopUrls(topUrlsData);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Analytics</h1>
          <p className='text-gray-600'>Track performance and insights for your URLs</p>
        </div>
        <div>
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
        </div>
      </div>

      {/* Overview Stats */}
      {analytics && (
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
                    {formatNumber(analytics.totalClicks)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='card'>
            <div className='card-body'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <EyeIcon className='h-6 w-6 text-success-600' />
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-500'>Clicks in Range</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {formatNumber(analytics.clicksInRange)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='card'>
            <div className='card-body'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <GlobeAltIcon className='h-6 w-6 text-warning-600' />
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-500'>Countries</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {formatNumber(analytics.uniqueCountries)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='card'>
            <div className='card-body'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <DevicePhoneMobileIcon className='h-6 w-6 text-error-600' />
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-500'>Unique Visitors</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {formatNumber(analytics.uniqueVisitors)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Performing URLs */}
      <div className='card'>
        <div className='card-header'>
          <h3 className='text-lg font-medium text-gray-900'>Top Performing URLs</h3>
        </div>
        <div className='card-body p-0'>
          {topUrls.length === 0 ? (
            <div className='text-center py-12'>
              <ChartBarIcon className='mx-auto h-12 w-12 text-gray-400' />
              <h3 className='mt-2 text-sm font-medium text-gray-900'>No data available</h3>
              <p className='mt-1 text-sm text-gray-500'>
                Create some URLs and get clicks to see analytics data.
              </p>
            </div>
          ) : (
            <div className='overflow-hidden'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      URL
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Total Clicks
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Period Clicks
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Created
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {topUrls.map((url, index) => (
                    <tr key={url.id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center'>
                            <span className='text-sm font-medium text-primary-600'>
                              #{index + 1}
                            </span>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900 font-mono'>
                              {url.shortUrl}
                            </div>
                            {url.title && <div className='text-sm text-gray-500'>{url.title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm font-medium text-gray-900'>
                          {formatNumber(url.clickCount)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {formatNumber((url as any).clicksInRange || 0)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-500'>{formatDate(url.createdAt)}</span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <Link
                          to={`/urls/${url.id}`}
                          className='text-primary-600 hover:text-primary-900'
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* All URLs */}
      <div className='card'>
        <div className='card-header'>
          <h3 className='text-lg font-medium text-gray-900'>All URLs</h3>
        </div>
        <div className='card-body p-0'>
          {urls.length === 0 ? (
            <div className='text-center py-12'>
              <ChartBarIcon className='mx-auto h-12 w-12 text-gray-400' />
              <h3 className='mt-2 text-sm font-medium text-gray-900'>No URLs found</h3>
              <p className='mt-1 text-sm text-gray-500'>
                Create your first URL to start tracking analytics.
              </p>
              <div className='mt-6'>
                <Link to='/dashboard' className='btn-primary'>
                  Create URL
                </Link>
              </div>
            </div>
          ) : (
            <div className='overflow-hidden'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      URL
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Clicks
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Created
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {urls.map(url => (
                    <tr key={url.id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4'>
                        <div className='flex flex-col'>
                          <div className='text-sm font-medium text-gray-900 font-mono'>
                            {url.shortUrl}
                          </div>
                          {url.title && <div className='text-sm text-gray-500'>{url.title}</div>}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {formatNumber(url.clickCount)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`badge ${url.isActive ? 'badge-success' : 'badge-secondary'}`}
                        >
                          {url.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-500'>{formatDate(url.createdAt)}</span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <Link
                          to={`/urls/${url.id}`}
                          className='text-primary-600 hover:text-primary-900'
                        >
                          View Details
                        </Link>
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

export default AnalyticsPage;
