import React, { useState, useEffect } from 'react';
import { MobileReportViewer } from './MobileReportViewer';
import DesktopReports from '../pages/Reports';
import { DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

interface ResponsiveReportViewerProps {
  forceView?: 'desktop' | 'mobile' | 'auto';
}

export const ResponsiveReportViewer: React.FC<ResponsiveReportViewerProps> = ({ 
  forceView = 'auto' 
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'tablet'];
      const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword));
      
      // Also check screen size
      const isSmallScreen = window.innerWidth < 768;
      
      setIsMobile(isMobileDevice || isSmallScreen);
      
      // Set default view based on detection
      if (forceView === 'auto') {
        setViewMode(isMobileDevice || isSmallScreen ? 'mobile' : 'desktop');
      } else {
        setViewMode(forceView);
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [forceView]);

  const toggleView = () => {
    setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile');
  };

  return (
    <div className="relative min-h-screen">
      {/* Render appropriate view based on device detection - no manual toggle */}
      {viewMode === 'mobile' ? (
        <div className="mobile-report-container">
          <MobileReportViewer />
        </div>
      ) : (
        <div className="desktop-report-container">
          <DesktopReports />
        </div>
      )}
    </div>
  );
};

export default ResponsiveReportViewer;