import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { validatePassword } from '../utils';
import LoadingSpinner from '../components/LoadingSpinner';

const profileSchema = yup.object({
  firstName: yup.string().max(100, 'First name must be less than 100 characters'),
  lastName: yup.string().max(100, 'Last name must be less than 100 characters'),
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .test('password-validation', 'Password requirements not met', (value) => {
      if (!value) return false;
      const validation = validatePassword(value);
      return validation.isValid;
    }),
  confirmPassword: yup
    .string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
    watch,
  } = useForm({
    resolver: yupResolver(passwordSchema),
  });

  const newPassword = watch('newPassword');
  const passwordValidation = newPassword ? validatePassword(newPassword) : { isValid: false, errors: [] };

  const onProfileSubmit = async (data: any) => {
    setIsUpdatingProfile(true);
    try {
      const updatedUser = await apiService.updateProfile(data);
      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: any) => {
    setIsChangingPassword(true);
    try {
      await apiService.changePassword(data.currentPassword, data.newPassword);
      resetPasswordForm();
      toast.success('Password changed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and security settings</p>
      </div>

      {/* Profile Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-1 text-sm text-gray-500">
                Email address cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <input
                  {...registerProfile('firstName')}
                  type="text"
                  className={`input ${profileErrors.firstName ? 'input-error' : ''}`}
                  placeholder="Enter your first name"
                />
                {profileErrors.firstName && (
                  <p className="mt-1 text-sm text-error-600">{profileErrors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <input
                  {...registerProfile('lastName')}
                  type="text"
                  className={`input ${profileErrors.lastName ? 'input-error' : ''}`}
                  placeholder="Enter your last name"
                />
                {profileErrors.lastName && (
                  <p className="mt-1 text-sm text-error-600">{profileErrors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Account Role</label>
              <span className={`badge ${
                user?.role === 'admin' ? 'badge-error' : 
                user?.role === 'premium' ? 'badge-warning' : 'badge-primary'
              } mt-1`}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="btn-primary"
              >
                {isUpdatingProfile ? (
                  <>
                    <LoadingSpinner size="sm" color="white" className="mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Profile'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current password
              </label>
              <div className="mt-1 relative">
                <input
                  {...registerPassword('currentPassword')}
                  type={showCurrentPassword ? 'text' : 'password'}
                  className={`input pr-10 ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-sm text-error-600">{passwordErrors.currentPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New password
              </label>
              <div className="mt-1 relative">
                <input
                  {...registerPassword('newPassword')}
                  type={showNewPassword ? 'text' : 'password'}
                  className={`input pr-10 ${passwordErrors.newPassword ? 'input-error' : ''}`}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password requirements */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  {passwordValidation.errors.map((error, index) => (
                    <p key={index} className="text-xs text-error-600">
                      • {error}
                    </p>
                  ))}
                  {passwordValidation.isValid && (
                    <p className="text-xs text-success-600">
                      • Password meets all requirements
                    </p>
                  )}
                </div>
              )}
              
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-error-600">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm new password
              </label>
              <div className="mt-1 relative">
                <input
                  {...registerPassword('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input pr-10 ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-error-600">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn-primary"
              >
                {isChangingPassword ? (
                  <>
                    <LoadingSpinner size="sm" color="white" className="mr-2" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
        </div>
        <div className="card-body">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Member since</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last login</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email verified</dt>
              <dd className="mt-1">
                <span className={`badge ${user?.isVerified ? 'badge-success' : 'badge-warning'}`}>
                  {user?.isVerified ? 'Verified' : 'Not verified'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Account status</dt>
              <dd className="mt-1">
                <span className="badge badge-success">Active</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
