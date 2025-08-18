import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import UserProfile from '../pages/UserProfile';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const SmartUserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { profile, loading, error } = useUserProfile(userId);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error Loading Profile</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">User Not Found</h1>
          <p className="mt-2 text-gray-600">The user profile could not be loaded.</p>
        </div>
      </div>
    );
  }

  // Use UserProfile for all user types - it already handles agency users properly
  return <UserProfile />;
};

export default SmartUserProfile;