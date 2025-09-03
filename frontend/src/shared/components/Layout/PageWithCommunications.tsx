import React, { useState } from 'react';
import CommunicationSidebar from '../CommunicationSidebar';

interface PageWithCommunicationsProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarCollapsible?: boolean;
}

const PageWithCommunications: React.FC<PageWithCommunicationsProps> = ({ 
  children, 
  showSidebar = true,
  sidebarCollapsible = true
}) => {
  const [sidebarVisible, setSidebarVisible] = useState(showSidebar);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className={`flex-1 ${sidebarVisible ? 'mr-80' : 'mr-0'} transition-all duration-300`}>
        {children}
      </div>

      {/* Communication Sidebar */}
      <div className={`fixed right-0 top-0 h-full z-40 transition-transform duration-300 ${
        sidebarVisible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <CommunicationSidebar 
          isVisible={sidebarVisible}
          onToggle={sidebarCollapsible ? toggleSidebar : undefined}
        />
      </div>
      
      {/* Toggle button when sidebar is hidden */}
      {!sidebarVisible && sidebarCollapsible && (
        <CommunicationSidebar 
          isVisible={false}
          onToggle={toggleSidebar}
        />
      )}
    </div>
  );
};

export default PageWithCommunications;