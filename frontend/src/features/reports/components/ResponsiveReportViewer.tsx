import React from 'react';
import { MobileReportViewer } from './MobileReportViewer';

interface ResponsiveReportViewerProps {
  forceView?: 'desktop' | 'mobile' | 'auto';
}

export const ResponsiveReportViewer: React.FC<ResponsiveReportViewerProps> = () => {
  return (
    <div className="w-full">
      <MobileReportViewer />
    </div>
  );
};

export default ResponsiveReportViewer;