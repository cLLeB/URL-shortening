import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import {
  LinkIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { CreateUrlData, Url } from '../types';
import { copyToClipboard, isValidUrl } from '../utils';
import LoadingSpinner from '../components/LoadingSpinner';

const schema = yup.object({
  originalUrl: yup
    .string()
    .required('URL is required')
    .test('is-url', 'Please enter a valid URL', (value) => {
      if (!value) return false;
      return isValidUrl(value.startsWith('http') ? value : `https://${value}`);
    }),
  customAlias: yup
    .string()
    .optional()
    .min(3, 'Custom alias must be at least 3 characters')
    .max(50, 'Custom alias must be less than 50 characters')
    .matches(/^[a-zA-Z0-9_-]*$/, 'Custom alias can only contain letters, numbers, hyphens, and underscores'),
});

const HomePage: React.FC = () => {
  const [shortenedUrl, setShortenedUrl] = useState<Url | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateUrlData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: CreateUrlData) => {
    setIsLoading(true);
    try {
      // Ensure URL has protocol
      const formattedUrl = data.originalUrl.startsWith('http') 
        ? data.originalUrl 
        : `https://${data.originalUrl}`;

      const url = await apiService.createUrl({
        ...data,
        originalUrl: formattedUrl,
      });

      setShortenedUrl(url);
      reset();
      toast.success('URL shortened successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to shorten URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (shortenedUrl) {
      const success = await copyToClipboard(shortenedUrl.shortUrl);
      if (success) {
        toast.success('URL copied to clipboard!');
      } else {
        toast.error('Failed to copy URL');
      }
    }
  };

  const features = [
    {
      icon: LinkIcon,
      title: 'Custom Short Links',
      description: 'Create memorable short URLs with custom aliases for better branding.',
    },
    {
      icon: ChartBarIcon,
      title: 'Detailed Analytics',
      description: 'Track clicks, geographic data, device types, and more with comprehensive analytics.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee for your links.',
    },
    {
      icon: GlobeAltIcon,
      title: 'Global CDN',
      description: 'Lightning-fast redirects powered by our global content delivery network.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Header */}
      <header className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <LinkIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">URL Shortener Pro</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Shorten URLs with
              <span className="text-gradient"> Professional Analytics</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              Create short, memorable links and track their performance with detailed analytics. 
              Perfect for marketing campaigns, social media, and business communications.
            </p>
          </div>

          {/* URL Shortener Form */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label htmlFor="originalUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      Enter your long URL
                    </label>
                    <input
                      {...register('originalUrl')}
                      type="text"
                      placeholder="https://example.com/very-long-url"
                      className={`input ${errors.originalUrl ? 'input-error' : ''}`}
                    />
                    {errors.originalUrl && (
                      <p className="mt-1 text-sm text-error-600">{errors.originalUrl.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="customAlias" className="block text-sm font-medium text-gray-700 mb-2">
                      Custom alias (optional)
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full btn-lg"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" color="white" className="mr-2" />
                        Shortening...
                      </>
                    ) : (
                      <>
                        Shorten URL
                        <ArrowRightIcon className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Result */}
                {shortenedUrl && (
                  <div className="mt-6 p-4 bg-success-50 border border-success-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-success-800 mb-1">Your shortened URL:</p>
                        <p className="text-lg font-mono text-success-900 break-all">
                          {shortenedUrl.shortUrl}
                        </p>
                      </div>
                      <button
                        onClick={handleCopyUrl}
                        className="ml-4 p-2 text-success-600 hover:text-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 rounded-md"
                        title="Copy to clipboard"
                      >
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Why Choose URL Shortener Pro?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Professional features for businesses and individuals
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-primary-100">
                    <feature.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="bg-white rounded-2xl shadow-large p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to get started?
              </h2>
              <p className="text-gray-600 mb-6">
                Create an account to access advanced features, analytics, and unlimited URL shortening.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="btn-primary btn-lg">
                  Sign Up Free
                </Link>
                <Link to="/login" className="btn-secondary btn-lg">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 URL Shortener Pro. Built with ❤️ for developers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
