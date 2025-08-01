import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  CheckSquare,
  Clock, 
  FileText, 
  Lock, 
  Mail, 
  MessageSquare, 
  Plus, 
  Search, 
  Settings, 
  Shield, 
  Upload, 
  User, 
  Users, 
  AlertTriangle,
  Download,
  Eye,
  Send,
  Paperclip,
  BarChart3,
  RefreshCw,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Star,
  MapPin,
  DollarSign,
  Play,
  Tag,
  MoreVertical
} from 'lucide-react';

// ModernDropdown must be here so all components can use it
const ModernDropdown = ({ options, value, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(opt => opt.value === value);
  return (
    <div className={`relative inline-block w-56 ${className}`}> 
      <button
        type="button"
        className="w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-4 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
      >
        <span>{selected ? selected.label : 'Select...'}</span>
        <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <ul className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto animate-fade-in">
          {options.map(opt => (
            <li
              key={opt.value}
              className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${opt.value === value ? 'bg-blue-100 font-semibold' : ''}`}
              onMouseDown={() => { onChange(opt.value); setOpen(false); }}
              tabIndex={0}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const UnifiedChatInterface = ({
  exchanges,
  messages,
  currentUser,
  exchangeParticipants,
  onSendMessage,
  newMessage,
  setNewMessage,
  selectedExchange,
  setSelectedExchange,
  handleWireView,
  showAddMemberModal,
  setShowAddMemberModal
}) => {
  const [membersCollapsed, setMembersCollapsed] = useState(false);
  
  useEffect(() => {
    if (!selectedExchange && exchanges.length > 0) {
      setSelectedExchange(exchanges[0]);
    }
  }, [selectedExchange, exchanges, setSelectedExchange]);

  if (!selectedExchange && exchanges.length === 0) {
    return <div className="p-8 text-center text-gray-500">No exchanges available.</div>;
  }

  return (
    <div className="flex h-[70vh] bg-white rounded-lg shadow border overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-gray-50 border-r overflow-y-auto">
        <div className="p-4 border-b bg-white">
          <h3 className="text-lg font-semibold">Exchanges</h3>
        </div>
        {exchanges.map(exchange => {
          const lastMsg = messages[exchange.id]?.[messages[exchange.id].length - 1];
          return (
            <div
              key={exchange.id}
              onClick={() => setSelectedExchange(exchange)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors ${
                selectedExchange?.id === exchange.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                  {exchange.clientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-sm truncate">{exchange.clientName}</h4>
                    <span className="text-xs text-gray-500">
                      {lastMsg?.timestamp || ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{exchange.value} • {exchange.status}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {lastMsg ? `${lastMsg.sender}: ${lastMsg.content.substring(0, 40)}...` : 'No messages yet'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
              {selectedExchange?.clientName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-semibold">{selectedExchange?.clientName}</h3>
              <p className="text-sm text-gray-600">
                {exchangeParticipants[selectedExchange?.id]?.length || 0} participants • {messages[selectedExchange?.id]?.length || 0} messages
              </p>
            </div>
          </div>
        </div>

        {/* Group Members - Collapsible */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-semibold text-sm text-gray-700">Group Members</h5>
            <button
              onClick={() => setMembersCollapsed(!membersCollapsed)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {membersCollapsed ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Show Details</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Hide Details</span>
                </>
              )}
            </button>
          </div>
          
          {membersCollapsed ? (
            /* Collapsed Summary View */
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {exchangeParticipants[selectedExchange?.id]?.slice(0, 5).map((participant, index) => (
                  <div
                    key={participant.id}
                    className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 border-2 border-white"
                    title={`${participant.name} (${participant.role})`}
                  >
                    {participant.avatar}
                  </div>
                ))}
                {exchangeParticipants[selectedExchange?.id]?.length > 5 && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
                    +{exchangeParticipants[selectedExchange?.id]?.length - 5}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {exchangeParticipants[selectedExchange?.id]?.length || 0} members
                </p>
                <p className="text-xs text-gray-500">
                  {exchangeParticipants[selectedExchange?.id]?.map(p => p.role).filter((role, index, arr) => arr.indexOf(role) === index).join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {exchangeParticipants[selectedExchange?.id]?.filter(p => p.id !== currentUser.id).length || 0} others
                </p>
                <p className="text-xs text-blue-600 font-medium">You</p>
              </div>
            </div>
          ) : (
            /* Expanded Detailed View - Compact */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {exchangeParticipants[selectedExchange?.id]?.map(participant => (
                <div key={participant.id} className="flex items-center space-x-2 bg-white px-2 py-1.5 rounded border hover:bg-blue-50 transition-colors">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 flex-shrink-0">
                    {participant.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium truncate">{participant.name}</p>
                      {participant.id === currentUser.id && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{participant.role}</p>
                  </div>
                  {participant.id !== currentUser.id && (
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button
                        className="text-blue-500 hover:text-blue-700 text-[10px] px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                        title={`Direct message ${participant.name}`}
                        onClick={() => alert(`Direct message to ${participant.name} (demo)`)}
                      >
                        DM
                      </button>
                      <button
                        className="text-green-500 hover:text-green-700 text-[10px] px-1.5 py-0.5 rounded hover:bg-green-100 transition-colors"
                        title={`View ${participant.name}'s profile`}
                        onClick={() => alert(`View profile for ${participant.name} (demo)`)}
                      >
                        Profile
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {messages[selectedExchange?.id]?.map(message => (
            <div
              key={message.id}
              className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${message.senderId === currentUser.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'} rounded-lg px-4 py-2 shadow-sm`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium opacity-75">{message.sender}</span>
                  {message.hasAttachment && <span className="ml-1">📎</span>}
                </div>
                <p className="text-sm">{
                  message.content
                    .split('\n')
                    .filter(line => !line.trim().toLowerCase().startsWith('wire pin code:'))
                    .join('\n')
                }</p>
                {message.hasAttachment && (
                  <div className="mt-2 p-2 bg-white bg-opacity-20 rounded text-xs flex flex-col gap-1">
                    📎 {message.attachmentName}
                    <div className="flex gap-2 mt-1">
                      <button className="underline text-blue-600" onClick={() => handleWireView(message.attachmentName)}>View</button>
                      <span className="text-gray-400">|</span>
                      <button className="underline text-blue-600" onClick={() => alert('Download not implemented in demo')}>Download</button>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Uploaded by: {message.sender}</div>
                    {currentUser.role === 'Exchange Coordinator' && <div className="text-xs text-gray-500">Confirmed by: Admin</div>}
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 text-xs opacity-75">
                  <span>{message.timestamp}</span>
                  {message.senderId === currentUser.id && (
                    <span>{message.read ? '✓✓' : '✓'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white">
          <form
            className="flex flex-col"
            onSubmit={e => {
              e.preventDefault();
              onSendMessage();
            }}
          >
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-3 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
              rows={2}
            />
            <div className="flex justify-between items-center mt-3">
              <div className="flex space-x-2">
                <button type="button" className="text-gray-600 hover:text-blue-600 p-2 rounded hover:bg-gray-100">
                  📎
                </button>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add Member to Exchange</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Client">Client</option>
                  <option value="Real Estate Agent">Real Estate Agent</option>
                  <option value="Third Party">Third Party</option>
                  <option value="Attorney">Attorney</option>
                  <option value="Accountant">Accountant</option>
                </select>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Login Link Preview</h4>
                <p className="text-sm text-blue-700">
                  https://peak1031.com/login?invite={Date.now()}&email={newMemberEmail}&role={newMemberRole}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
};

// Refactor dashboards to show only relevant tabs/content per user type
const getTabsForRole = (role) => {
  if (role === 'Exchange Coordinator') {
    return ['overview', 'timeline', 'tasks', 'documents', 'audit', 'user-management', 'messages'];
  } else if (role === 'Agency Manager') {
    return ['overview', 'timeline', 'tasks', 'documents', 'audit', 'messages'];
  } else if (role === 'Real Estate Agent') {
    return ['overview', 'timeline', 'tasks', 'documents', 'audit', 'messages'];
  } else if (role === 'Client') {
    return ['overview', 'timeline', 'tasks', 'documents', 'audit', 'messages'];
  }
  return ['overview', 'messages'];
};

const SyncDirectionBanner = () => (
  <div className="flex items-center justify-center bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 shadow">
    <img src="https://seeklogo.com/images/P/practicepanther-logo-6B6B6B6B6B-seeklogo.com.png" alt="PracticePanther" className="h-8 w-8 mr-2" style={{borderRadius: '4px'}} />
    <span className="text-lg font-semibold text-blue-800 flex items-center">
      PracticePanther
      <svg className="mx-3 w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      Peak Order
    </span>
    <span className="ml-6 text-gray-600 text-sm">Data is imported from PracticePanther. No data is sent back.</span>
  </div>
);

const Dashboard = (props) => {
  const { currentUser, activeTab, setActiveTab } = props;
  const tabs = getTabsForRole(currentUser.role);
  // Use exchanges from props everywhere in Dashboard
  const exchanges = props.exchanges;
  const thirdParties = props.thirdParties;
  const selectedExchange = props.selectedExchange;
  const setSelectedExchange = props.setSelectedExchange;
  // At the start of Dashboard, add fallback userForOverview logic
  const selectedUser = props.selectedUser;
  const userForOverview = selectedUser;
  
  // Debug: Log selectedUser prop in Dashboard
  console.log('Dashboard selectedUser prop:', selectedUser);
  // Add useEffect here to handle user-overview tab logic
  useEffect(() => {
    if (activeTab === 'user-overview' && (!selectedUser || !selectedUser.exchanges || selectedUser.exchanges.length === 0)) {
      setActiveTab('overview');
      if (typeof window !== 'undefined') {
        window.alert('Please select a user from Overview to view their details.');
      }
    }
  }, [activeTab, selectedUser, setActiveTab]);

  // At the top of Dashboard, inside the function body:
  let filteredExchanges = exchanges;
  if ((currentUser.role === 'Exchange Coordinator' || currentUser.role === 'Agency Manager') && (typeof props.exchangeSearch !== 'undefined' || typeof props.exchangeStatusFilter !== 'undefined' || typeof props.exchangeMinValue !== 'undefined' || typeof props.exchangeMaxValue !== 'undefined')) {
    filteredExchanges = exchanges.filter(ex => {
      const matchesName = !props.exchangeSearch || ex.clientName.toLowerCase().includes(props.exchangeSearch.toLowerCase());
      const matchesStatus = !props.exchangeStatusFilter || ex.status === props.exchangeStatusFilter;
      const valueNum = Number(ex.value.replace(/[^\d.]/g, ''));
      const matchesMin = !props.exchangeMinValue || valueNum >= Number(props.exchangeMinValue);
      const matchesMax = !props.exchangeMaxValue || valueNum <= Number(props.exchangeMaxValue);
      return matchesName && matchesStatus && matchesMin && matchesMax;
    });
  }

  // At the top of Dashboard, after tab nav:
  const [overviewFilterMode, setOverviewFilterMode] = useState('exchange'); // 'exchange' or 'user'

  // In Dashboard, for admin and super third party, Overview is a grid of user cards, each with their exchanges as sub-cards, and both user and exchange filters:
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [exchangeStatusFilter, setExchangeStatusFilter] = useState('');
  const [exchangeMinValue, setExchangeMinValue] = useState('');
  const [exchangeMaxValue, setExchangeMaxValue] = useState('');
  const [userReferralFilter, setUserReferralFilter] = useState('');
  const [showReferralChip, setShowReferralChip] = useState(false);
  const filteredUserList = props.userList.filter(user =>
    (!userSearch || user.name.toLowerCase().includes(userSearch.toLowerCase())) &&
    (!userRoleFilter || user.role === userRoleFilter) &&
    (!userStatusFilter || user.status === userStatusFilter) &&
    (!userReferralFilter || user.referralSource === userReferralFilter)
  );

  // Add state for filter chip dropdowns
  const [showRoleChip, setShowRoleChip] = useState(false);
  const [showStatusChip, setShowStatusChip] = useState(false);
  const [showExchangeStatusChip, setShowExchangeStatusChip] = useState(false);
  const [showMinChip, setShowMinChip] = useState(false);
  const [showMaxChip, setShowMaxChip] = useState(false);

  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  // At the top of the Dashboard component (or before userActionMenu is used):
  const [userActionMenu, setUserActionMenu] = useState(null);

  // Add state for referral details modal
  const [showReferralDetailsModal, setShowReferralDetailsModal] = useState(false);
  const [selectedReferralUser, setSelectedReferralUser] = useState(null);
  const [referralModalTab, setReferralModalTab] = useState('overview');

  // Add state for member management
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Client');

  // Audit log states
  const [auditLogFilter, setAuditLogFilter] = useState('all');
  
  // Document generation states
  const [docGenerationFilter, setDocGenerationFilter] = useState('all');
  const [selectedDocTemplate, setSelectedDocTemplate] = useState(null);
  const [docPreviewMode, setDocPreviewMode] = useState(false);
  const [showDocGenerationModal, setShowDocGenerationModal] = useState(false);
  const [showTemplateUploadModal, setShowTemplateUploadModal] = useState(false);
  const [docGenerationData, setDocGenerationData] = useState({
    clientName: '',
    exchangeId: '',
    propertyAddress: '',
    ownershipPercentage: '',
    propertyValue: '',
    qiName: '',
    sellerName: '',
    buyerName: ''
  });
  const [auditLogUserFilter, setAuditLogUserFilter] = useState('');
  const [auditLogDateFilter, setAuditLogDateFilter] = useState('all');
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [showAuditDetails, setShowAuditDetails] = useState(null);

  // Sample audit log data
  const auditLogs = [
    { id: 1, userId: 1, userName: "Pacific Coast Realty", action: "login", details: "User logged in successfully", timestamp: "2024-12-28 09:15:30", ip: "192.168.1.100", userAgent: "Chrome/120.0", severity: "info", exchangeId: null, documentId: null },
    { id: 2, userId: 4, userName: "Johnson Family Trust", action: "document_upload", details: "Uploaded wire instructions document", timestamp: "2024-12-28 09:20:15", ip: "192.168.1.101", userAgent: "Safari/17.0", severity: "info", exchangeId: 1, documentId: "wire_123" },
    { id: 3, userId: 100, userName: "Acme Agency", action: "user_created", details: "Created new user: Blue Ocean Realty", timestamp: "2024-12-28 09:25:45", ip: "192.168.1.102", userAgent: "Firefox/121.0", severity: "info", exchangeId: null, documentId: null },
    { id: 4, userId: 5, userName: "Metro Properties LLC", action: "message_sent", details: "Sent message in exchange #2", timestamp: "2024-12-28 09:30:20", ip: "192.168.1.103", userAgent: "Chrome/120.0", severity: "info", exchangeId: 2, documentId: null },
    { id: 5, userId: 1, userName: "Pacific Coast Realty", action: "document_viewed", details: "Viewed wire instructions", timestamp: "2024-12-28 09:35:10", ip: "192.168.1.100", userAgent: "Chrome/120.0", severity: "info", exchangeId: 1, documentId: "wire_123" },
    { id: 6, userId: 100, userName: "Acme Agency", action: "security_alert", details: "Failed login attempt from suspicious IP", timestamp: "2024-12-28 09:40:30", ip: "203.45.67.89", userAgent: "Unknown", severity: "warning", exchangeId: null, documentId: null },
    { id: 7, userId: 6, userName: "Anderson Holdings", action: "task_completed", details: "Completed task: Upload property documents", timestamp: "2024-12-28 09:45:15", ip: "192.168.1.104", userAgent: "Safari/17.0", severity: "info", exchangeId: 3, documentId: null },
    { id: 8, userId: 2, userName: "Law Firm A", action: "exchange_created", details: "Created new exchange for client", timestamp: "2024-12-28 09:50:00", ip: "192.168.1.105", userAgent: "Chrome/120.0", severity: "info", exchangeId: 16, documentId: null },
    { id: 9, userId: 4, userName: "Johnson Family Trust", action: "document_downloaded", details: "Downloaded exchange agreement", timestamp: "2024-12-28 09:55:30", ip: "192.168.1.101", userAgent: "Safari/17.0", severity: "info", exchangeId: 1, documentId: "agreement_456" },
    { id: 10, userId: 100, userName: "Acme Agency", action: "user_deactivated", details: "Deactivated user: Inactive Third Party", timestamp: "2024-12-28 10:00:15", ip: "192.168.1.102", userAgent: "Firefox/121.0", severity: "warning", exchangeId: null, documentId: null },
    { id: 11, userId: 7, userName: "Greenfield Estates", action: "login", details: "User logged in successfully", timestamp: "2024-12-28 10:05:45", ip: "192.168.1.106", userAgent: "Chrome/120.0", severity: "info", exchangeId: null, documentId: null },
    { id: 12, userId: 3, userName: "Bank of America", action: "security_alert", details: "Multiple failed login attempts", timestamp: "2024-12-28 10:10:20", ip: "192.168.1.107", userAgent: "Unknown", severity: "error", exchangeId: null, documentId: null },
    { id: 13, userId: 8, userName: "Sunset Commercial", action: "message_received", details: "Received message from coordinator", timestamp: "2024-12-28 10:15:30", ip: "192.168.1.108", userAgent: "Safari/17.0", severity: "info", exchangeId: 5, documentId: null },
    { id: 14, userId: 100, userName: "Acme Agency", action: "backup_created", details: "System backup completed successfully", timestamp: "2024-12-28 10:20:00", ip: "192.168.1.102", userAgent: "System", severity: "info", exchangeId: null, documentId: null },
    { id: 15, userId: 9, userName: "Blue Ocean Realty", action: "document_upload", details: "Uploaded property photos", timestamp: "2024-12-28 10:25:15", ip: "192.168.1.109", userAgent: "Chrome/120.0", severity: "info", exchangeId: 6, documentId: "photos_789" }
  ];

  // Filter audit logs based on user role and permissions
  const getFilteredAuditLogs = () => {
    let filteredLogs = auditLogs;
    
    // Role-based filtering
    switch (currentUser.role) {
      case 'Exchange Coordinator':
        // Admin sees everything
        break;
      case 'Agency Manager':
        // Agency Managers see their network activities and security alerts
        filteredLogs = auditLogs.filter(log => 
          log.action === 'security_alert' ||
          log.userName === currentUser.name ||
          log.details.includes('Agency') ||
          log.details.includes('Third Party')
        );
        break;
      case 'Third Party':
        // Third Parties see their own activities and their clients' activities
        const thirdPartyClients = props.userList.filter(u => u.referralSource === currentUser.name);
        filteredLogs = auditLogs.filter(log => 
          log.userName === currentUser.name ||
          thirdPartyClients.some(client => log.userName === client.name) ||
          (log.exchangeId && thirdPartyClients.some(client => 
            client.exchanges && client.exchanges.includes(log.exchangeId)
          ))
        );
        break;
      case 'Client':
        // Clients see only their own activities and their exchange activities
        const userExchanges = props.userList.find(u => u.name === currentUser.name)?.exchanges || [];
        filteredLogs = auditLogs.filter(log => 
          log.userName === currentUser.name ||
          (log.exchangeId && userExchanges.includes(log.exchangeId))
        );
        break;
      case 'Real Estate Agent':
      case 'Attorney':
        // Agents and Attorneys see activities related to their assigned exchanges
        const assignedExchanges = props.getUserExchanges().map(ex => ex.id);
        filteredLogs = auditLogs.filter(log => 
          log.userName === currentUser.name ||
          (log.exchangeId && assignedExchanges.includes(log.exchangeId))
        );
        break;
      default:
        // Default: show only own activities
        filteredLogs = auditLogs.filter(log => log.userName === currentUser.name);
    }
    
         // Apply additional filters
     return filteredLogs.filter(log => {
       const matchesFilter = auditLogFilter === 'all' || log.action === auditLogFilter;
       const matchesUser = !auditLogUserFilter || log.userName.toLowerCase().includes(auditLogUserFilter.toLowerCase());
       const matchesSearch = !auditLogSearch || log.details.toLowerCase().includes(auditLogSearch.toLowerCase());
       
       let matchesDate = true;
       if (auditLogDateFilter === 'today') {
         const today = new Date().toDateString();
         matchesDate = new Date(log.timestamp).toDateString() === today;
       } else if (auditLogDateFilter === 'week') {
         const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
         matchesDate = new Date(log.timestamp) >= weekAgo;
       } else if (auditLogDateFilter === 'month') {
         const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
         matchesDate = new Date(log.timestamp) >= monthAgo;
       }
       
       return matchesFilter && matchesUser && matchesSearch && matchesDate;
     });
  };

  const filteredAuditLogs = getFilteredAuditLogs();

  // Get audit statistics based on role
  const getAuditStats = () => {
    const roleFilteredLogs = getFilteredAuditLogs();
    
    return {
      total: roleFilteredLogs.length,
      today: roleFilteredLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString()).length,
      warnings: roleFilteredLogs.filter(log => log.severity === 'warning').length,
      errors: roleFilteredLogs.filter(log => log.severity === 'error').length,
      users: [...new Set(roleFilteredLogs.map(log => log.userName))].length,
      actions: [...new Set(roleFilteredLogs.map(log => log.action))].length
    };
  };

  const auditStats = getAuditStats();

  // Get action statistics based on role
  const getActionStats = () => {
    const roleFilteredLogs = getFilteredAuditLogs();
    return roleFilteredLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});
  };

  const actionStats = getActionStats();

  // Get user activity statistics based on role
  const getUserActivityStats = () => {
    const roleFilteredLogs = getFilteredAuditLogs();
    return roleFilteredLogs.reduce((acc, log) => {
      acc[log.userName] = (acc[log.userName] || 0) + 1;
      return acc;
    }, {});
  };

  const userActivityStats = getUserActivityStats();

  // Member management handlers
  const handleAddMember = () => {
    if (newMemberEmail && newMemberRole) {
      alert(`Invitation sent to ${newMemberEmail} for role: ${newMemberRole}`);
      setShowAddMemberModal(false);
      setNewMemberEmail('');
      setNewMemberRole('Client');
    } else {
      alert('Please fill in all required fields');
    }
  };

  // Exchange management handlers
  const handleDirectChat = (exchange) => {
    alert(`Opening direct chat for ${exchange.clientName}`);
  };

  const handlePaymentStatus = (exchange) => {
    alert(`Payment status for ${exchange.clientName}: ${exchange.status}`);
  };

  const handleViewExchangeDetails = (exchange, role) => {
    alert(`Viewing exchange details for ${exchange.clientName} (${role})`);
  };

  const handleManageParticipants = (exchange) => {
    alert(`Managing participants for ${exchange.clientName}`);
  };

  const handleCommissionStatus = (exchange, role) => {
    alert(`Commission status for ${exchange.clientName} (${role})`);
  };

  const handleReferralStatus = (exchange) => {
    alert(`Referral status for ${exchange.clientName}`);
  };

  const handleServiceStatus = (exchange) => {
    alert(`Service status for ${exchange.clientName}`);
  };

  const handleBillingInformation = (exchange) => {
    alert(`Billing information for ${exchange.clientName}`);
  };

  const handleAgentPerformance = (exchange) => {
    alert(`Agent performance for ${exchange.clientName}`);
  };

  const handleExchangeAnalytics = (exchange) => {
    alert(`Exchange analytics for ${exchange.clientName}`);
  };

  const handleRemoveMember = (member) => {
    alert(`Removing member: ${member.name}`);
  };

  // Document templates and generation
  const documentTemplates = [
    {
      id: 'like-kind-assignment',
      name: 'Like-Kind Assignment',
      description: 'Assignment of exchange rights and obligations',
      requiredSignatures: ['QI', 'Seller', 'Buyer'],
      status: 'ready',
      category: 'core'
    },
    {
      id: 'exchange-agreement',
      name: 'Exchange Agreement',
      description: 'Formal agreement between QI and seller',
      requiredSignatures: ['QI', 'Seller'],
      status: 'ready',
      category: 'core'
    },
    {
      id: 'authorization-form',
      name: 'Authorization Form',
      description: 'Authorization for QI to act on behalf of seller',
      requiredSignatures: ['QI', 'Seller'],
      status: 'ready',
      category: 'core'
    },
    {
      id: 'introduction-letter',
      name: 'Introduction Letter',
      description: 'Letter introducing QI to all parties',
      requiredSignatures: ['Seller'],
      status: 'ready',
      category: 'communication'
    },
    {
      id: 'w9-form',
      name: 'W9 Form',
      description: 'Tax identification form for seller',
      requiredSignatures: ['Seller'],
      status: 'template',
      category: 'tax'
    },
    {
      id: '3-property-rule',
      name: '3-Property Rule Analysis',
      description: 'Analysis of 3-property identification rule',
      requiredSignatures: [],
      status: 'analysis',
      category: 'rules'
    },
    {
      id: '200-percent-rule',
      name: '200% Rule Analysis',
      description: 'Analysis of 200% identification rule',
      requiredSignatures: [],
      status: 'analysis',
      category: 'rules'
    },
    {
      id: '95-percent-rule',
      name: '95% Rule Analysis',
      description: 'Analysis of 95% identification rule',
      requiredSignatures: [],
      status: 'analysis',
      category: 'rules'
    }
  ];
  
  const generatedDocuments = [
    {
      id: 1,
      templateId: 'like-kind-assignment',
      clientName: 'Johnson Family Trust',
      exchangeId: 1,
      generatedBy: 'AI',
      status: 'pending_review',
      createdAt: '2024-12-17 10:30:00',
      signatures: {
        qi: { signed: false, date: null },
        seller: { signed: false, date: null },
        buyer: { signed: false, date: null }
      }
    },
    {
      id: 2,
      templateId: 'exchange-agreement',
      clientName: 'Metro Properties LLC',
      exchangeId: 2,
      generatedBy: 'AI',
      status: 'approved',
      createdAt: '2024-12-16 14:20:00',
      signatures: {
        qi: { signed: true, date: '2024-12-16 15:00:00' },
        seller: { signed: true, date: '2024-12-16 16:30:00' }
      }
    }
  ];

  return (
    <div>
      <SyncDirectionBanner />
      <div className="mb-6 border-b">
        <nav className="flex space-x-6">
          {tabs.includes('overview') && (
            <button
              className={`py-2 px-4 ${activeTab === 'overview' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
          )}
          {activeTab === 'user-overview' && (
            <button
              className={`py-2 px-4 ${activeTab === 'user-overview' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
              onClick={() => setActiveTab('user-overview')}
            >
              User Overview
            </button>
          )}
          {tabs.includes('timeline') && <button className={`py-2 px-4 ${activeTab === 'timeline' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-400'} ${!selectedExchange ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => selectedExchange && setActiveTab('timeline')} disabled={!selectedExchange}>Timeline</button>}
          {tabs.includes('tasks') && <button className={`py-2 px-4 ${activeTab === 'tasks' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab('tasks')}>Tasks</button>}
          {tabs.includes('documents') && <button className={`py-2 px-4 ${activeTab === 'documents' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab('documents')}>Documents</button>}
          {tabs.includes('messages') && <button className={`py-2 px-4 ${activeTab === 'messages' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab('messages')}>Messages</button>}
          {tabs.includes('audit') && <button className={`py-2 px-4 ${activeTab === 'audit' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab('audit')}>Audit Log</button>}
          {tabs.includes('user-management') && <button className={`py-2 px-4 ${activeTab === 'user-management' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`} onClick={() => { console.log('User Management tab clicked'); setActiveTab('user-management'); }}>User Management</button>}
        </nav>
      </div>
      {/* Render tab content as before, using props and role-based filtering */}
      {activeTab === 'overview' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Exchanges Overview</h2>
          {(currentUser.role === 'Exchange Coordinator' || currentUser.role === 'Agency Manager') && (
            <div className="flex flex-wrap gap-4 mb-6 items-center">
              <ModernDropdown options={[{ value: 'exchange', label: 'By Exchange' }, { value: 'user', label: 'By User' }]} value={overviewFilterMode} onChange={setOverviewFilterMode} />
              {overviewFilterMode === 'exchange' && <>
                <input type="text" placeholder="Search by client name..." className="border rounded px-3 py-2 w-64" value={props.exchangeSearch || ''} onChange={e => props.setExchangeSearch(e.target.value)} />
                <ModernDropdown options={[{ value: '', label: 'All Status' }, { value: 'PENDING', label: 'Pending' }, { value: 'OPEN', label: 'Open' }, { value: 'COMPLETED', label: 'Completed' }]} value={props.exchangeStatusFilter || ''} onChange={props.setExchangeStatusFilter} />
                <input type="number" placeholder="Min Value ($)" className="border rounded px-3 py-2 w-32" value={props.exchangeMinValue || ''} onChange={e => props.setExchangeMinValue(e.target.value)} />
                <input type="number" placeholder="Max Value ($)" className="border rounded px-3 py-2 w-32" value={props.exchangeMaxValue || ''} onChange={e => props.setExchangeMaxValue(e.target.value)} />
              </>}
              {overviewFilterMode === 'user' && <>
                <ModernDropdown options={props.userList.map(u => ({ value: u.id, label: u.name }))} value={props.selectedUser?.id || ''} onChange={uid => { const user = props.userList.find(u => u.id === uid); props.setSelectedUser(user); props.setActiveTab('user-overview'); }} className="w-64" />
              </>}
                    </div>
          )}
          {overviewFilterMode === 'exchange' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExchanges.map(exchange => (
                <div key={exchange.id} className="bg-white rounded-lg shadow p-6 border flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{exchange.clientName}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{exchange.status}</span>
                            </div>
                  <div className="mb-2 text-gray-600">Value: {exchange.value}</div>
                  <div className="mb-2">
                    <span className="text-xs text-gray-500">Start: {exchange.startDate}</span>
                    <span className="mx-2 text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">45-day: {exchange.deadline45}</span>
                    <span className="mx-2 text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">180-day: {exchange.deadline180}</span>
                  </div>
                            <div className="mb-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${exchange.progress}%` }}></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Progress: {exchange.progress}%</span>
                      <span>{exchange.activeTasks} Active Tasks</span>
                              </div>
                            </div>
                  <div className="flex justify-between mt-2">
                    <button className="text-blue-600 hover:underline text-sm" onClick={() => { props.setSelectedExchange(exchange); setActiveTab('timeline'); }}>View Details</button>
                    <span className="text-xs text-gray-500">Unread: {exchange.unreadMessages}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {overviewFilterMode === 'user' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Users & Their Exchanges</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {props.userList.filter(user => user.role === 'Client' || user.role === 'Third Party').map(user => {
                  const userExchanges = (user.exchanges || []).map(eid => props.exchanges.find(e => e.id === eid)).filter(Boolean);
                  const totalValue = userExchanges.reduce((sum, ex) => sum + Number(ex.value.replace(/[^\d.]/g, '')), 0);
                  return (
                    <div
                      key={user.id}
                      className="bg-white rounded-xl shadow p-6 border flex flex-col hover:shadow-lg transition cursor-pointer"
                      onClick={() => {
                        console.log('User card clicked:', user);
                        props.setSelectedUser(user);
                        props.setActiveTab('user-overview');
                      }}
                      tabIndex={0}
                      role="button"
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { props.setSelectedUser(user); props.setActiveTab('user-overview'); } }}
                    >
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 shadow">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.role} <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{user.status}</span></div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        Manages {userExchanges.length} exchange{userExchanges.length !== 1 ? 's' : ''}, total value {totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-1">
                        {userExchanges.slice(0, 3).map(ex => (
                          <span
                            key={ex.id}
                            className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100 hover:bg-blue-200 hover:text-blue-900 cursor-pointer transition"
                            onClick={e => { e.stopPropagation(); props.setSelectedExchange(ex); props.setActiveTab('timeline'); }}
                            tabIndex={0}
                            role="button"
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); props.setSelectedExchange(ex); props.setActiveTab('timeline'); } }}
                          >
                            {ex.clientName}
                          </span>
                        ))}
                        {userExchanges.length > 3 && (
                          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold border border-gray-200">
                            +{userExchanges.length - 3} more
                          </span>
                        )}
                      </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
          )}
              </div>
      )}
              {activeTab === 'user-overview' && (
        // Debug output
        <>
          {console.log('User Overview userForOverview:', userForOverview)}
          {!userForOverview || !userForOverview.id || !userForOverview.name ? (
            <div className="bg-white rounded-xl shadow p-6 border mt-8 text-center text-gray-500">No user selected. (DEBUG: userForOverview is {JSON.stringify(userForOverview)})</div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg border p-8 max-w-3xl mx-auto mt-8">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-700 shadow">
                  {userForOverview.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-extrabold text-blue-900 mb-1">{userForOverview.name}</h3>
                  <div className="flex flex-wrap gap-4 items-center text-base text-gray-700 font-medium mb-2">
                    <span className="inline-flex items-center gap-1"><User className="w-5 h-5 text-blue-500" /> {userForOverview.role}</span>
                    <span className="inline-flex items-center gap-1"><Mail className="w-5 h-5 text-blue-500" /> {userForOverview.email}</span>
                    <span className="inline-flex items-center gap-1"><Shield className="w-5 h-5 text-blue-500" /> {userForOverview.status}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-5 h-5 text-blue-500" /> Last Login: {userForOverview.lastLogin || 'N/A'}</span>
                    <span className="inline-flex items-center gap-1"><Star className="w-5 h-5 text-yellow-500" /> Referral: {userForOverview.referralSource || '-'}</span>
                    <span className="inline-flex items-center gap-1"><BarChart3 className="w-5 h-5 text-blue-500" /> Engagement: 🔑 {userForOverview.engagement?.logins || 0} logins, 💬 {userForOverview.engagement?.messages || 0} messages, 📄 {userForOverview.engagement?.docs || 0} docs</span>
                    {userForOverview.marketingTags && userForOverview.marketingTags.length > 0 && (
                      <span className="inline-flex items-center gap-1"><Tag className="w-5 h-5 text-purple-500" /> {userForOverview.marketingTags.map(tag => (
                        <span key={tag} className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold border border-blue-100 mr-1">{tag}</span>
                      ))}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow p-6 border flex flex-col items-center">
                  <span className="text-3xl font-bold text-blue-700 mb-1">{Array.isArray(userForOverview.exchanges) ? userForOverview.exchanges.length : 0}</span>
                        <span className="text-xs text-gray-500">Total Exchanges</span>
                      </div>
                <div className="bg-white rounded-xl shadow p-6 border flex flex-col items-center">
                  <span className="text-3xl font-bold text-green-700 mb-1">{
                    props.tasks.filter(t => Array.isArray(userForOverview.exchanges) && userForOverview.exchanges.includes(t.exchangeId) && t.status !== 'COMPLETED').length
                        }</span>
                        <span className="text-xs text-gray-500">Open Tasks</span>
                      </div>
                <div className="bg-white rounded-xl shadow p-6 border flex flex-col items-center">
                        {/* Performance Bar: % tasks completed */}
                        {(() => {
                    const userTasks = props.tasks.filter(t => Array.isArray(userForOverview.exchanges) && userForOverview.exchanges.includes(t.exchangeId));
                          const completed = userTasks.filter(t => t.status === 'COMPLETED').length;
                          const percent = userTasks.length ? Math.round((completed / userTasks.length) * 100) : 0;
                          return <>
                            <div className="w-24 h-3 bg-gray-200 rounded-full mb-1">
                        <div className="h-3 bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-500">{percent}% Tasks Completed</span>
                          </>;
                        })()}
                      </div>
                    </div>
              {Array.isArray(userForOverview.exchanges) && userForOverview.exchanges.length > 0 && (
                <>
                  <h4 className="font-semibold mb-2 text-blue-900">Related Exchanges</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {userForOverview.exchanges.map(eid => {
                        const ex = exchanges.find(e => e.id === eid);
                        if (!ex) return null;
                        return (
                        <div key={eid} className="bg-blue-50 rounded-lg shadow p-4 border flex flex-col hover:shadow-lg transition">
                            <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-blue-800">{ex.clientName}</span>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{ex.status}</span>
                            </div>
                            <div className="mb-2 text-gray-600">Value: {ex.value}</div>
                            <div className="mb-2 text-xs text-gray-500">Start: {ex.startDate} | 45-day: {ex.deadline45} | 180-day: {ex.deadline180}</div>
                            <div className="mb-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${ex.progress}%` }}></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Progress: {ex.progress}%</span>
                                <span>{ex.activeTasks} Tasks</span>
                              </div>
                            </div>
                            <button className="mt-2 text-blue-600 hover:underline text-xs self-end" onClick={() => { props.setSelectedExchange(ex); props.setActiveTab('timeline'); }}>View Exchange</button>
                          </div>
                        );
                      })}
                    </div>
                </>
              )}
                    {/* Open Tasks */}
              {Array.isArray(userForOverview.exchanges) && userForOverview.exchanges.length > 0 && (
                <>
                  <h4 className="font-semibold mb-2 text-blue-900">Open Tasks</h4>
                    <ul className="divide-y divide-gray-200 mb-6">
                      {props.tasks.filter(t => userForOverview.exchanges.includes(t.exchangeId) && t.status !== 'COMPLETED').map(task => (
                        <li key={task.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{task.title}</div>
                            <div className="text-xs text-gray-500">Due: {task.dueDate} | Priority: {task.priority}</div>
                            <div className="text-xs text-gray-400">Exchange: {exchanges.find(e => e.id === task.exchangeId)?.clientName}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{task.status}</span>
                        </li>
                      ))}
                    </ul>
                </>
              )}
              <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition" onClick={() => props.setActiveTab('overview')}>Back to Overview</button>
                </div>
              )}
            </>
          )}
      {activeTab === 'timeline' && (
        <div className="max-w-5xl mx-auto p-6">
          {console.log('Current user:', currentUser)}
          {console.log('User exchanges:', props.userList.find(u => u.id === currentUser.id)?.exchanges)}
          {console.log('All exchanges:', props.exchanges)}
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-lg text-blue-900">Exchange</label>
            <ModernDropdown
              options={
                props.exchanges.map(ex => ({
                  value: ex.id,
                  label: (
                    <div className="flex flex-col">
                      <span className="font-semibold">{ex.clientName}</span>
                      <span className="text-xs text-gray-500">{ex.status} • {ex.value}</span>
        </div>
                  ),
                }))
              }
              value={selectedExchange ? selectedExchange.id : ''}
              onChange={val => {
                const ex = props.exchanges.find(e => e.id === Number(val));
                props.setSelectedExchange(ex);
              }}
              placeholder="Select an exchange…"
              className="w-full"
            />
            {props.exchanges.length === 0 && (
              <div className="text-gray-400 mt-2">No exchanges available.</div>
            )}
          </div>
          {!selectedExchange ? (
            <div className="text-gray-500 p-8 text-center">Select an exchange to see its timeline.</div>
          ) : (
            <TimelinePerExchange
              selectedExchange={selectedExchange}
              tasks={props.tasks}
              auditLogs={props.auditLogs}
              documents={props.documents}
              exchangeParticipants={props.exchangeParticipants}
              setActiveTab={props.setActiveTab}
              setSelectedExchange={props.setSelectedExchange}
              currentUser={currentUser}
              setSelectedUser={props.setSelectedUser}
              setShowProfileDrawer={props.setShowProfileDrawer}
              handleViewUserProfile={props.handleViewUserProfile}
              handleDirectChat={handleDirectChat}
              handleRemoveMember={handleRemoveMember}
              setShowAddMemberModal={props.setShowAddMemberModal}
            />
          )}
        </div>
      )}
      {activeTab === 'tasks' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Tasks</h2>
          <div className="mb-4">
            <label className="font-semibold mr-2">Filter by Exchange:</label>
            <ModernDropdown
              options={[{ value: 'all', label: 'All' }, ...props.exchanges.map(ex => ({ value: ex.id, label: ex.clientName }))]}
              value={props.selectedExchange ? props.selectedExchange.id : 'all'}
              onChange={val => {
                if (val === 'all') props.setSelectedExchange(null);
                else {
                  const ex = props.exchanges.find(ex => ex.id === Number(val));
                  props.setSelectedExchange(ex);
                }
              }}
              className="mb-4"
            />
          </div>
          {(!props.selectedExchange) ? (
            props.exchanges.map(ex => (
              <div key={ex.id} className="mb-8">
                <h3 className="font-semibold mb-2">{ex.clientName}</h3>
                <div className="bg-white rounded-lg shadow p-6 border">
                  <ul>
                    {props.tasks.filter(task => task.exchangeId === ex.id || !task.exchangeId).map(task => (
                      <li key={task.id} className="mb-4 flex justify-between items-center border-b pb-2">
                        <div>
                          <div className="font-semibold">{task.title}</div>
                          <div className="text-xs text-gray-500">Due: {task.dueDate} | Priority: {task.priority}</div>
                          <div className="text-xs text-gray-400">Assigned to: {task.assignedTo}</div>
                        </div>
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{task.status}</span>
                          {task.status !== 'COMPLETED' && (task.title.toLowerCase().includes('upload') || task.title.toLowerCase().includes('review')) ? (
                            <button className="ml-4 text-blue-600" onClick={() => { props.setDocModalType(task.title.toLowerCase().includes('upload') ? 'upload' : 'review'); props.setShowDocModal(true); }}> {task.title.toLowerCase().includes('upload') ? 'Upload' : 'Review'} </button>
                          ) : task.status !== 'COMPLETED' ? (
                            <button className="ml-4 text-blue-600" onClick={() => props.handleTaskComplete(task.id)}>Complete</button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-6 border">
              <ul>
                {props.tasks.filter(task => task.exchangeId === props.selectedExchange.id || !task.exchangeId).map(task => (
                  <li key={task.id} className="mb-4 flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="font-semibold">{task.title}</div>
                      <div className="text-xs text-gray-500">Due: {task.dueDate} | Priority: {task.priority}</div>
                      <div className="text-xs text-gray-400">Assigned to: {task.assignedTo}</div>
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{task.status}</span>
                      {task.status !== 'COMPLETED' && (task.title.toLowerCase().includes('upload') || task.title.toLowerCase().includes('review')) ? (
                        <button className="ml-4 text-blue-600" onClick={() => { props.setDocModalType(task.title.toLowerCase().includes('upload') ? 'upload' : 'review'); props.setShowDocModal(true); }}> {task.title.toLowerCase().includes('upload') ? 'Upload' : 'Review'} </button>
                      ) : task.status !== 'COMPLETED' ? (
                        <button className="ml-4 text-blue-600" onClick={() => props.handleTaskComplete(task.id)}>Complete</button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {activeTab === 'documents' && (
        <div>
          {/* Admin Document Generation Interface */}
          {currentUser.role === 'Exchange Coordinator' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Document Generation & Management</h2>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowTemplateUploadModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Template
                  </button>
                  <button 
                    onClick={() => setShowDocGenerationModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Generate New Document
                  </button>
                </div>
              </div>
              
              {/* System Status Banner */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">System Status: EXCHANGE_DOCUMENTS_READY</h3>
                    <p className="text-green-700 text-sm">All document templates are available for generation. AI-powered document creation is active.</p>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Client Document Room Interface */}
          {currentUser.role !== 'Exchange Coordinator' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Document Room</h2>
                <p className="text-gray-600 mt-1">View and manage documents for your exchanges</p>
              </div>
              
              {/* Client Exchange Selection */}
              <div className="mb-6">
                <label className="block font-semibold mb-2 text-lg text-blue-900">Select Exchange</label>
            <ModernDropdown
                  options={
                    props.exchanges
                      .filter(ex => currentUser.role === 'Client' ? ex.clientName === currentUser.name : true)
                      .map(ex => ({
                        value: ex.id,
                        label: (
                          <div className="flex flex-col">
                            <span className="font-semibold">{ex.clientName}</span>
                            <span className="text-xs text-gray-500">{ex.status} • {ex.value}</span>
                          </div>
                        ),
                      }))
                  }
                  value={selectedExchange ? selectedExchange.id : ''}
              onChange={val => {
                    const ex = props.exchanges.find(e => e.id === Number(val));
                  props.setSelectedExchange(ex);
                  }}
                  placeholder="Select an exchange…"
                  className="w-full"
                />
              </div>
            </>
          )}
          
          {/* System Status Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">System Status: EXCHANGE_DOCUMENTS_READY</h3>
                <p className="text-green-700 text-sm">All document templates are available for generation. AI-powered document creation is active.</p>
              </div>
            </div>
          </div>
          {/* Admin Document Management */}
          {currentUser.role === 'Exchange Coordinator' && (
            <>
              <div className="mb-6">
                <label className="block font-semibold mb-2 text-lg text-blue-900">Select Exchange</label>
                <ModernDropdown
                  options={
                    props.exchanges.map(ex => ({
                      value: ex.id,
                      label: (
                        <div className="flex flex-col">
                          <span className="font-semibold">{ex.clientName}</span>
                          <span className="text-xs text-gray-500">{ex.status} • {ex.value}</span>
                        </div>
                      ),
                    }))
                  }
                  value={props.selectedExchange ? props.selectedExchange.id : ''}
                  onChange={val => {
                    const ex = props.exchanges.find(e => e.id === Number(val));
                    props.setSelectedExchange(ex);
                  }}
                  placeholder="Select an exchange…"
                  className="w-full"
            />
          </div>
          {(!props.selectedExchange) ? (
            props.exchanges.map(ex => (
              <div key={ex.id} className="mb-8">
                <h3 className="font-semibold mb-2">{ex.clientName}</h3>
                <div className="bg-white rounded-lg shadow p-6 border flex flex-col items-start w-full">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded mb-4" onClick={() => { props.setDocModalType('upload'); props.setShowDocModal(true); }}>Upload Document</button>
                  <div className="w-full">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2">Name</th>
                          <th>Uploaded At</th>
                          <th>Uploader</th>
                          <th>Engagement</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {props.documents.filter(doc => doc.exchangeId === ex.id).map(doc => (
                          <tr key={doc.id} className="border-b">
                            <td className="py-2">{doc.name}</td>
                            <td>{doc.uploadedAt}</td>
                            <td>{doc.uploader}</td>
                            <td>{doc.engagement.join(', ')}</td>
                            <td>
                              <button className="text-blue-600 hover:underline" onClick={() => { props.setSelectedDoc(doc); props.setDocModalType('review'); props.setShowDocModal(true); }}>Review</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-6 border flex flex-col items-start w-full">
              <button className="bg-blue-600 text-white px-4 py-2 rounded mb-4" onClick={() => { props.setDocModalType('upload'); props.setShowDocModal(true); }}>Upload Document</button>
              <div className="w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Name</th>
                      <th>Uploaded At</th>
                      <th>Uploader</th>
                      <th>Engagement</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.documents.filter(doc => doc.exchangeId === props.selectedExchange.id).map(doc => (
                      <tr key={doc.id} className="border-b">
                        <td className="py-2">{doc.name}</td>
                        <td>{doc.uploadedAt}</td>
                        <td>{doc.uploader}</td>
                        <td>{doc.engagement.join(', ')}</td>
                        <td>
                          <button className="text-blue-600 hover:underline" onClick={() => { props.setSelectedDoc(doc); props.setDocModalType('review'); props.setShowDocModal(true); }}>Review</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </>
          )}
          
          {/* Client Document Room */}
          {currentUser.role !== 'Exchange Coordinator' && currentUser.role !== 'Third Party' && currentUser.role !== 'Super Third Party' && (
            <>
              {!selectedExchange ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Select an Exchange</h3>
                  <p className="text-gray-600">Choose an exchange from the dropdown above to view its documents</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedExchange.clientName}</h3>
                      <p className="text-gray-600">Exchange #{selectedExchange.id} • {selectedExchange.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {props.documents.filter(doc => doc.exchangeId === selectedExchange.id).length} Documents
                      </span>
                    </div>
                  </div>
                  
                  {/* Document Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-800">Ready to Sign</span>
                      </div>
                      <p className="text-sm text-green-700">
                        {props.documents.filter(doc => doc.exchangeId === selectedExchange.id && doc.status === 'ready').length} documents
                      </p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-800">Pending Review</span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        {props.documents.filter(doc => doc.exchangeId === selectedExchange.id && doc.status === 'pending').length} documents
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">All Documents</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        {props.documents.filter(doc => doc.exchangeId === selectedExchange.id).length} total
                      </p>
                    </div>
                  </div>
                  
                  {/* Documents List */}
                  <div className="space-y-3">
                    {props.documents.filter(doc => doc.exchangeId === selectedExchange.id).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                            <p className="text-sm text-gray-600">Uploaded {doc.uploadedAt} by {doc.uploader}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'ready' ? 'bg-green-100 text-green-800' :
                            doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {doc.status}
                          </span>
                          <button 
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            onClick={() => { props.setSelectedDoc(doc); props.setDocModalType('review'); props.setShowDocModal(true); }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {props.documents.filter(doc => doc.exchangeId === selectedExchange.id).length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No documents available for this exchange yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Third Party Document Access Restriction */}
          {(currentUser.role === 'Third Party' || currentUser.role === 'Super Third Party') && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Access Restricted</h3>
              <p className="text-gray-600">Third Party users cannot access exchange documents. Please contact the Exchange Coordinator for document-related inquiries.</p>
            </div>
          )}
          
          {props.showDocModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
                <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => props.setShowDocModal(false)}>&times;</button>
                {props.docModalType === 'upload' && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Upload Document</h3>
                    <input type="file" className="mb-4" />
                    <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => props.setShowDocModal(false)}>Upload</button>
                  </div>
                )}
                {props.docModalType === 'review' && props.selectedDoc && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Review Document</h3>
                    <div className="mb-2"><span className="font-semibold">Name:</span> {props.selectedDoc.name}</div>
                    <div className="mb-2"><span className="font-semibold">Uploaded At:</span> {props.selectedDoc.uploadedAt}</div>
                    <div className="mb-2"><span className="font-semibold">Uploader:</span> {props.selectedDoc.uploader}</div>
                    <div className="mb-2"><span className="font-semibold">Engagement:</span> {props.selectedDoc.engagement.join(', ')}</div>
                    <button className="bg-green-600 text-white px-4 py-2 rounded mt-4" onClick={() => props.setShowDocModal(false)}>Mark as Reviewed</button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Admin Document Generation Tabs */}
          {currentUser.role === 'Exchange Coordinator' && (
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                  <button 
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${docGenerationFilter === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setDocGenerationFilter('all')}
                  >
                    All Documents ({generatedDocuments.length})
                  </button>
                  <button 
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${docGenerationFilter === 'core' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setDocGenerationFilter('core')}
                  >
                    Core Documents
                  </button>
                  <button 
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${docGenerationFilter === 'rules' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setDocGenerationFilter('rules')}
                  >
                    Rule Analysis
                  </button>
                  <button 
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${docGenerationFilter === 'pending' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setDocGenerationFilter('pending')}
                  >
                    Pending Review
                  </button>
                </nav>
              </div>
        </div>
      )}
          
          {/* Admin Document Templates Grid */}
          {currentUser.role === 'Exchange Coordinator' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {documentTemplates
                .filter(template => docGenerationFilter === 'all' || template.category === docGenerationFilter)
                .map(template => (
                  <div key={template.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-4">
        <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{template.name}</h3>
                        <p className="text-gray-600 text-sm">{template.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        template.status === 'ready' ? 'bg-green-100 text-green-800' :
                        template.status === 'template' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {template.status === 'ready' ? 'Ready' : template.status === 'template' ? 'Template' : 'Analysis'}
                      </span>
                    </div>
                    
                    {template.requiredSignatures.length > 0 && (
          <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">Required Signatures:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.requiredSignatures.map(sig => (
                            <span key={sig} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {sig}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedDocTemplate(template);
                          setDocGenerationData({
                            clientName: '',
                            exchangeId: '',
                            propertyAddress: '',
                            ownershipPercentage: '',
                            propertyValue: '',
                            qiName: 'Peak 1031 Exchange',
                            sellerName: '',
                            buyerName: ''
                          });
                          setShowDocGenerationModal(true);
                        }}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Generate Document
                      </button>
                      <button 
                        onClick={() => setDocPreviewMode(template.id)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
          
          {/* Admin Generated Documents List */}
          {currentUser.role === 'Exchange Coordinator' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Generated Documents</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {generatedDocuments
                  .filter(doc => docGenerationFilter === 'all' || 
                    (docGenerationFilter === 'pending' && doc.status === 'pending_review') ||
                    (docGenerationFilter === 'core' && documentTemplates.find(t => t.id === doc.templateId)?.category === 'core'))
                  .map(doc => {
                    const template = documentTemplates.find(t => t.id === doc.templateId);
                    return (
                      <div key={doc.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{template?.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                doc.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {doc.status === 'approved' ? 'Approved' : doc.status === 'pending_review' ? 'Pending Review' : 'Draft'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Client: {doc.clientName} | Exchange: #{doc.exchangeId} | Generated by: {doc.generatedBy}
                            </p>
                            <p className="text-xs text-gray-500">Created: {doc.createdAt}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Review
                          </button>
                          <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                            Approve
                          </button>
                          <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">
                            Download
                          </button>
                        </div>
                      </div>
                      
                      {/* Signature Status */}
                      {template?.requiredSignatures.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2">Signature Status:</p>
                          <div className="flex gap-3">
                            {template.requiredSignatures.map(sig => {
                              const sigKey = sig.toLowerCase();
                              const signature = doc.signatures[sigKey];
                              return (
                                <div key={sig} className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                    signature?.signed ? 'bg-green-500' : 'bg-gray-300'
                                  }`}></span>
                                  <span className="text-xs text-gray-600">{sig}</span>
                                  {signature?.signed && (
                                    <span className="text-xs text-green-600">✓ {signature.date}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Template Upload Modal */}
          {showTemplateUploadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Upload Document Template</h3>
                  <button 
                    onClick={() => setShowTemplateUploadModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Like-Kind Assignment Template"
            />
          </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Describe the template purpose and usage..."
                    />
                        </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="core">Core Document</option>
                      <option value="rules">Rule Analysis</option>
                      <option value="custom">Custom Template</option>
                    </select>
                          </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Required Signatures</label>
                    <div className="space-y-2">
                      {['QI', 'Seller', 'Buyer', 'Attorney', 'Accountant'].map(sig => (
                        <label key={sig} className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">{sig}</span>
                        </label>
                      ))}
                        </div>
                      </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Template File</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX up to 10MB</p>
                      <input type="file" className="hidden" />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowTemplateUploadModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        alert('Template uploaded successfully!');
                        setShowTemplateUploadModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Upload Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Document Generation Modal */}
          {showDocGenerationModal && selectedDocTemplate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Generate {selectedDocTemplate.name}</h3>
                    <p className="text-gray-600 mt-1">{selectedDocTemplate.description}</p>
                  </div>
                  <button 
                    onClick={() => setShowDocGenerationModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                {/* Document Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Document Summary</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Type:</span>
                      <span className="ml-2 text-blue-900">{selectedDocTemplate.name}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Category:</span>
                      <span className="ml-2 text-blue-900 capitalize">{selectedDocTemplate.category}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Signatures:</span>
                      <span className="ml-2 text-blue-900">{selectedDocTemplate.requiredSignatures.length}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Status:</span>
                      <span className="ml-2 text-blue-900 capitalize">{selectedDocTemplate.status}</span>
                    </div>
                  </div>
                  {selectedDocTemplate.requiredSignatures.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <span className="text-blue-700 font-medium text-sm">Required Signatures: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedDocTemplate.requiredSignatures.map(sig => (
                          <span key={sig} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {sig}
                          </span>
                    ))}
                  </div>
                </div>
                  )}
              </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Name
                      {docGenerationData.exchangeId && (
                        <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={docGenerationData.clientName}
                      onChange={(e) => setDocGenerationData({...docGenerationData, clientName: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter client name"
                    />
                    </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Exchange</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {props.exchanges.map(ex => (
                        <div
                          key={ex.id}
                          onClick={() => {
                            setDocGenerationData({
                              ...docGenerationData,
                              exchangeId: ex.id,
                              clientName: ex.clientName,
                              propertyAddress: ex.propertyAddress || '123 Main St, City, State',
                              ownershipPercentage: '100',
                              propertyValue: ex.value.replace(/[^\d]/g, ''),
                              qiName: 'Peak 1031 Exchange',
                              sellerName: ex.clientName,
                              buyerName: ex.clientName
                            });
                          }}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            docGenerationData.exchangeId === ex.id 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{ex.clientName}</h4>
                              <p className="text-xs text-gray-500">Exchange #{ex.id}</p>
                      </div>
                            {docGenerationData.exchangeId === ex.id && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Value:</span>
                              <span className="font-medium text-gray-900">{ex.value}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Status:</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                ex.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                ex.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {ex.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Progress:</span>
                              <span className="font-medium text-gray-900">{ex.progress}%</span>
                            </div>
                    </div>
                  </div>
                ))}
              </div>
                    {docGenerationData.exchangeId && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Exchange Selected</span>
                        </div>
                        <p className="text-xs text-green-700">
                          Client information has been auto-filled. You can modify any fields as needed.
                        </p>
            </div>
          )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Address
                      {docGenerationData.exchangeId && (
                        <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={docGenerationData.propertyAddress}
                      onChange={(e) => setDocGenerationData({...docGenerationData, propertyAddress: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter property address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ownership Percentage
                      {docGenerationData.exchangeId && (
                        <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={docGenerationData.ownershipPercentage}
                      onChange={(e) => setDocGenerationData({...docGenerationData, ownershipPercentage: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter percentage"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Value
                      {docGenerationData.exchangeId && (
                        <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={docGenerationData.propertyValue}
                      onChange={(e) => setDocGenerationData({...docGenerationData, propertyValue: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter value"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QI Name
                      <span className="ml-2 text-xs text-blue-600">✓ Default</span>
                    </label>
                    <input
                      type="text"
                      value={docGenerationData.qiName}
                      onChange={(e) => setDocGenerationData({...docGenerationData, qiName: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter QI name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seller Name
                      {docGenerationData.exchangeId && (
                        <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={docGenerationData.sellerName}
                      onChange={(e) => setDocGenerationData({...docGenerationData, sellerName: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter seller name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buyer Name
                      {docGenerationData.exchangeId && (
                        <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={docGenerationData.buyerName}
                      onChange={(e) => setDocGenerationData({...docGenerationData, buyerName: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter buyer name"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    onClick={() => setShowDocGenerationModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Generate document logic here
                      alert(`Document "${selectedDocTemplate.name}" generated successfully for ${docGenerationData.clientName}`);
                      setShowDocGenerationModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Generate Document
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'audit' && (
        <div className="max-w-7xl mx-auto p-6">
                     {/* Audit Log Header */}
           <div className="mb-8">
             <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Log</h1>
             <p className="text-gray-600">
               {currentUser.role === 'Exchange Coordinator' && 'Monitor all system activities, user actions, and security events'}
               {currentUser.role === 'Agency Manager' && 'Monitor your network activities, Third Party actions, and security alerts'}
               {currentUser.role === 'Third Party' && 'Monitor your activities and your referred clients\' exchange activities'}
               {currentUser.role === 'Client' && 'Monitor your activities and your exchange-related events'}
               {(currentUser.role === 'Real Estate Agent' || currentUser.role === 'Attorney') && 'Monitor activities related to your assigned exchanges'}
               {!['Exchange Coordinator', 'Agency Manager', 'Third Party', 'Client', 'Real Estate Agent', 'Attorney'].includes(currentUser.role) && 'Monitor your system activities and actions'}
             </p>
             <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
               <p className="text-sm text-blue-800">
                 <strong>Role-based Access:</strong> Showing {filteredAuditLogs.length} events relevant to your {currentUser.role} role
               </p>
             </div>
           </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{auditStats.total}</div>
              <div className="text-blue-100 text-sm">Total Events</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{auditStats.today}</div>
              <div className="text-green-100 text-sm">Today</div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{auditStats.warnings}</div>
              <div className="text-yellow-100 text-sm">Warnings</div>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{auditStats.errors}</div>
              <div className="text-red-100 text-sm">Errors</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{auditStats.users}</div>
              <div className="text-purple-100 text-sm">Active Users</div>
            </div>
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-lg">
              <div className="text-2xl font-bold">{auditStats.actions}</div>
              <div className="text-indigo-100 text-sm">Action Types</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
                                 <select 
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   value={auditLogFilter}
                   onChange={(e) => setAuditLogFilter(e.target.value)}
                 >
                   <option value="all">All Actions</option>
                   {currentUser.role === 'Exchange Coordinator' && (
                     <>
                       <option value="login">Login</option>
                       <option value="document_upload">Document Upload</option>
                       <option value="document_viewed">Document Viewed</option>
                       <option value="document_downloaded">Document Downloaded</option>
                       <option value="message_sent">Message Sent</option>
                       <option value="message_received">Message Received</option>
                       <option value="task_completed">Task Completed</option>
                       <option value="exchange_created">Exchange Created</option>
                       <option value="user_created">User Created</option>
                       <option value="user_deactivated">User Deactivated</option>
                       <option value="security_alert">Security Alert</option>
                       <option value="backup_created">Backup Created</option>
                     </>
                   )}
                   {currentUser.role === 'Agency Manager' && (
                     <>
                       <option value="login">Login</option>
                       <option value="user_created">User Created</option>
                       <option value="user_deactivated">User Deactivated</option>
                       <option value="security_alert">Security Alert</option>
                       <option value="document_upload">Document Upload</option>
                       <option value="message_sent">Message Sent</option>
                     </>
                   )}
                   {(currentUser.role === 'Third Party' || currentUser.role === 'Client') && (
                     <>
                       <option value="login">Login</option>
                       <option value="document_upload">Document Upload</option>
                       <option value="document_viewed">Document Viewed</option>
                       <option value="document_downloaded">Document Downloaded</option>
                       <option value="message_sent">Message Sent</option>
                       <option value="message_received">Message Received</option>
                       <option value="task_completed">Task Completed</option>
                     </>
                   )}
                   {(currentUser.role === 'Real Estate Agent' || currentUser.role === 'Attorney') && (
                     <>
                       <option value="login">Login</option>
                       <option value="document_upload">Document Upload</option>
                       <option value="document_viewed">Document Viewed</option>
                       <option value="message_sent">Message Sent</option>
                       <option value="message_received">Message Received</option>
                       <option value="task_completed">Task Completed</option>
                     </>
                   )}
                 </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                <input 
                  type="text" 
                  placeholder="Search by user..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={auditLogUserFilter}
                  onChange={(e) => setAuditLogUserFilter(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={auditLogDateFilter}
                  onChange={(e) => setAuditLogDateFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input 
                  type="text" 
                  placeholder="Search details..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={auditLogSearch}
                  onChange={(e) => setAuditLogSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
              <p className="text-gray-600">Showing {filteredAuditLogs.length} events</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {filteredAuditLogs.map((log, index) => (
                  <div key={log.id} className="relative">
                    {/* Timeline Line */}
                    {index < filteredAuditLogs.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                    )}
                    
                    <div className="flex items-start gap-4">
                      {/* Timeline Dot */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                        log.severity === 'error' ? 'bg-red-500' :
                        log.severity === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}>
                        {log.action === 'login' && '🔑'}
                        {log.action === 'document_upload' && '📤'}
                        {log.action === 'document_viewed' && '👁️'}
                        {log.action === 'document_downloaded' && '📥'}
                        {log.action === 'message_sent' && '💬'}
                        {log.action === 'message_received' && '📨'}
                        {log.action === 'task_completed' && '✅'}
                        {log.action === 'exchange_created' && '💼'}
                        {log.action === 'user_created' && '👤'}
                        {log.action === 'user_deactivated' && '🚫'}
                        {log.action === 'security_alert' && '⚠️'}
                        {log.action === 'backup_created' && '💾'}
                      </div>

                      {/* Activity Card */}
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setShowAuditDetails(log)}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">{log.userName}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.severity === 'error' ? 'bg-red-100 text-red-800' :
                              log.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {log.action.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700 mb-2">{log.details}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>IP: {log.ip}</span>
                          <span>Browser: {log.userAgent.split('/')[0]}</span>
                          {log.exchangeId && <span>Exchange: #{log.exchangeId}</span>}
                          {log.documentId && <span>Document: {log.documentId}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Action Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Distribution</h3>
              <div className="space-y-3">
                {Object.entries(actionStats).slice(0, 8).map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(count / Math.max(...Object.values(actionStats))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Active Users</h3>
              <div className="space-y-3">
                {Object.entries(userActivityStats)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 8)
                  .map(([user, count]) => (
                  <div key={user} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate">{user}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(count / Math.max(...Object.values(userActivityStats))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Details Modal */}
      {showAuditDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div>
                <h2 className="text-xl font-bold">Audit Event Details</h2>
                <p className="text-blue-100">Event ID: {showAuditDetails.id}</p>
              </div>
              <button 
                className="text-white hover:text-blue-200 text-2xl"
                onClick={() => setShowAuditDetails(null)}
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <p className="text-gray-900 font-medium">{showAuditDetails.userName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    showAuditDetails.severity === 'error' ? 'bg-red-100 text-red-800' :
                    showAuditDetails.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {showAuditDetails.action.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                  <p className="text-gray-900">{new Date(showAuditDetails.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    showAuditDetails.severity === 'error' ? 'bg-red-100 text-red-800' :
                    showAuditDetails.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {showAuditDetails.severity.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <p className="text-gray-900 font-mono text-sm">{showAuditDetails.ip}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                  <p className="text-gray-900 text-sm">{showAuditDetails.userAgent}</p>
                </div>
                {showAuditDetails.exchangeId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exchange ID</label>
                    <p className="text-gray-900">#{showAuditDetails.exchangeId}</p>
                  </div>
                )}
                {showAuditDetails.documentId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document ID</label>
                    <p className="text-gray-900 font-mono text-sm">{showAuditDetails.documentId}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{showAuditDetails.details}</p>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  View User Profile
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Export Event
                </button>
                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Flag for Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'user-management' && currentUser.role === 'Exchange Coordinator' && (
        <div>
          <h2 className="text-xl font-bold mb-4">User Management</h2>
          {console.log('DEBUG: User Management section rendering, currentUser:', currentUser, 'userList length:', props.userList?.length)}
          {/* Filter chip bar (reuse Overview logic) */}
          <div className="flex flex-wrap gap-2 items-center mb-6">
            {/* Search bar */}
            <div className="flex items-center bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search user..."
                className="border-none outline-none bg-transparent px-1 py-1 w-32 md:w-40 text-sm"
                value={userSearch || ''}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            {/* Role chip */}
            <div className="relative">
              <button
                className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 transition ${userRoleFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                onClick={() => setShowRoleChip(!showRoleChip)}
                type="button"
              >
                <User className="w-4 h-4" />
                {userRoleFilter ? userRoleFilter : 'All Roles'}
              </button>
              {showRoleChip && (
                <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded shadow-lg w-40 animate-fade-in">
                  {['', 'Third Party', 'Client', 'Agency Manager'].map(role => (
                    <div
                      key={role}
                      className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${userRoleFilter === role ? 'bg-blue-100 font-semibold' : ''}`}
                      onClick={() => { setUserRoleFilter(role); setShowRoleChip(false); }}
                    >
                      {role === '' ? 'All Roles' : (role === 'Agency Manager' ? 'Super Third Party' : role)}
                    </div>
                  ))}
                    </div>
              )}
                    </div>
            {/* Status chip */}
            <div className="relative">
              <button
                className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 transition ${userStatusFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                onClick={() => setShowStatusChip(!showStatusChip)}
                type="button"
              >
                <CheckCircle className="w-4 h-4" />
                {userStatusFilter ? userStatusFilter : 'All Status'}
              </button>
              {showStatusChip && (
                <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded shadow-lg w-32 animate-fade-in">
                  {['', 'Active', 'Inactive'].map(status => (
                    <div
                      key={status}
                      className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${userStatusFilter === status ? 'bg-blue-100 font-semibold' : ''}`}
                      onClick={() => { setUserStatusFilter(status); setShowStatusChip(false); }}
                    >
                      {status === '' ? 'All Status' : status}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Exchange Status chip */}
            <div className="relative">
              <button
                className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 transition ${exchangeStatusFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                onClick={() => setShowExchangeStatusChip(!showExchangeStatusChip)}
                type="button"
              >
                <BarChart3 className="w-4 h-4" />
                {exchangeStatusFilter ? exchangeStatusFilter : 'All Exchange Status'}
              </button>
              {showExchangeStatusChip && (
                <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded shadow-lg w-40 animate-fade-in">
                  {['', 'PENDING', 'OPEN', 'COMPLETED'].map(status => (
                    <div
                      key={status}
                      className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${exchangeStatusFilter === status ? 'bg-blue-100 font-semibold' : ''}`}
                      onClick={() => { setExchangeStatusFilter(status); setShowExchangeStatusChip(false); }}
                    >
                      {status === '' ? 'All Exchange Status' : (status.charAt(0) + status.slice(1).toLowerCase())}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Min value chip */}
            <div className="relative">
              <button
                className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 transition ${exchangeMinValue ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                onClick={() => setShowMinChip(!showMinChip)}
                type="button"
              >
                <DollarSign className="w-4 h-4" />
                {exchangeMinValue ? `Min $${exchangeMinValue}` : 'Min $'}
              </button>
              {showMinChip && (
                <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded shadow-lg w-32 animate-fade-in p-2">
                  <input
                    type="number"
                    placeholder="Min Value ($)"
                    className="border rounded px-2 py-1 w-full text-sm"
                    value={exchangeMinValue || ''}
                    onChange={e => setExchangeMinValue(e.target.value)}
                    onBlur={() => setShowMinChip(false)}
                    autoFocus
                  />
                </div>
              )}
            </div>
            {/* Max value chip */}
            <div className="relative">
              <button
                className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 transition ${exchangeMaxValue ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                onClick={() => setShowMaxChip(!showMaxChip)}
                type="button"
              >
                <DollarSign className="w-4 h-4" />
                {exchangeMaxValue ? `Max $${exchangeMaxValue}` : 'Max $'}
              </button>
              {showMaxChip && (
                <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded shadow-lg w-32 animate-fade-in p-2">
                  <input
                    type="number"
                    placeholder="Max Value ($)"
                    className="border rounded px-2 py-1 w-full text-sm"
                    value={exchangeMaxValue || ''}
                    onChange={e => setExchangeMaxValue(e.target.value)}
                    onBlur={() => setShowMaxChip(false)}
                    autoFocus
                  />
                </div>
              )}
            </div>
            {/* Clear All chip */}
            <button
              className="px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 transition"
              onClick={() => {
                setUserSearch('');
                setUserRoleFilter('');
                setUserStatusFilter('');
                setExchangeStatusFilter('');
                setExchangeMinValue('');
                setExchangeMaxValue('');
              }}
              title="Clear All Filters"
              type="button"
            >
              <RefreshCw className="w-4 h-4" />
              Clear All
            </button>
          </div>
          {/* User card grid as before */}
          {console.log('DEBUG userList:', props.userList)}
          {console.log('DEBUG filteredUserList:', filteredUserList)}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredUserList.map(user => {
              const userExchanges = (user.exchanges || []).map(eid => props.exchanges.find(e => e.id === eid)).filter(Boolean);
              const totalValue = userExchanges.reduce((sum, ex) => sum + Number(ex.value.replace(/[^\d.]/g, '')), 0);
              return (
                <div
                  key={user.id}
                  className="bg-white rounded-xl shadow p-6 border flex flex-col hover:shadow-lg transition cursor-pointer relative"
                  onClick={() => { props.setSelectedUser(user); setShowProfileDrawer(true); }}
                  tabIndex={0}
                  role="button"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { props.setSelectedUser(user); setShowProfileDrawer(true); } }}
                >
                  {/* Three dots admin actions menu */}
                  <div className="absolute top-4 right-4 z-10">
                    <button onClick={e => { e.stopPropagation(); setUserActionMenu(user.id === userActionMenu ? null : user.id); }} className="p-2 rounded-full hover:bg-gray-100 focus:outline-none">
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>
                    {userActionMenu === user.id && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-20 animate-fade-in">
                        <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => handleSendLoginLink(user)}>Send Login Link</button>
                        <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => { props.setSelectedUser(user); props.setActiveTab('user-overview'); setUserActionMenu(null); }}>View Exchanges & Details</button>
                        <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => handleSeeAudit(user)}>See Audit</button>
                        <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => handleChat(user)}>Chat</button>
                        <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => handleDeactivate(user)}>Deactivate</button>
                        <div className="border-t my-1"></div>
                        <div className="px-4 py-2">
                          <div className="font-semibold text-xs text-gray-500 mb-1">Assign to Exchange</div>
                          <select className="w-full border rounded px-2 py-1 text-sm" onChange={e => handleAdminAssignExchange(user, e.target.value)} defaultValue="">
                            <option value="" disabled>Select Exchange</option>
                            {props.exchanges.map(ex => <option key={ex.id} value={ex.id}>{ex.clientName}</option>)}
                      </select>
                    </div>
                        <div className="px-4 py-2">
                          <div className="font-semibold text-xs text-gray-500 mb-1">Assign Super Third Party</div>
                          <select className="w-full border rounded px-2 py-1 text-sm" onChange={e => handleAdminAssignSuperThirdParty(user, e.target.value)} defaultValue="">
                            <option value="" disabled>Select Third Party</option>
                            {filteredUserList.filter(u => u.role === 'Third Party').map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
                      </select>
                    </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 shadow">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.role} <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{user.status}</span></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    Email: {user.email}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-1">
                    {user.marketingTags && user.marketingTags.map(tag => (
                      <span key={tag} className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold border border-blue-100 mr-1">{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Slide-in Profile Drawer */}
          {showProfileDrawer && props.selectedUser && (
            <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 transition-transform duration-300 animate-slide-in overflow-y-auto">
              <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowProfileDrawer(false)}>&times;</button>
              
              {/* User Profile Content */}
              <div className="p-6">
                {/* Header with Edit Button */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700 shadow">
                      {props.selectedUser.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{props.selectedUser.name}</h2>
                      <p className="text-gray-600">{props.selectedUser.role}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${props.selectedUser.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                        {props.selectedUser.status}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={() => alert('Edit user profile functionality')}
                  >
                    Edit Profile
                  </button>
                </div>

                {/* Admin Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {props.selectedUser.exchanges ? props.selectedUser.exchanges.length : 0}
                    </div>
                    <div className="text-sm text-blue-600">Active Exchanges</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {props.tasks.filter(t => props.selectedUser.exchanges && props.selectedUser.exchanges.includes(t.exchangeId) && t.status !== 'COMPLETED').length}
                    </div>
                    <div className="text-sm text-green-600">Open Tasks</div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{props.selectedUser.email}</span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm" onClick={() => alert('Copy email to clipboard')}>
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">Last Login: {props.selectedUser.lastLogin || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">Referral: {props.selectedUser.referralSource || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Admin Actions Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Admin Actions</h3>
                  <div className="space-y-2">
                    <button 
                      className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      onClick={() => alert(`Send login link to ${props.selectedUser.email}`)}
                    >
                      <div className="font-medium text-blue-900">Send Login Link</div>
                      <div className="text-sm text-blue-700">Email login credentials to user</div>
                    </button>
                    <button 
                      className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                      onClick={() => alert(`Reset password for ${props.selectedUser.name}`)}
                    >
                      <div className="font-medium text-green-900">Reset Password</div>
                      <div className="text-sm text-green-700">Force password reset on next login</div>
                    </button>
                    <button 
                      className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                      onClick={() => alert(`Enable 2FA for ${props.selectedUser.name}`)}
                    >
                      <div className="font-medium text-purple-900">Enable 2FA</div>
                      <div className="text-sm text-purple-700">Require two-factor authentication</div>
                    </button>
                  </div>
                </div>

                {/* Role & Status Management */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Role & Status</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <div className="relative">
                        <select 
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
                          value={props.selectedUser.role}
                          onChange={(e) => alert(`Change role to ${e.target.value}`)}
                        >
                          <option value="Client" className="py-2">👤 Client</option>
                          <option value="Third Party" className="py-2">🏢 Third Party</option>
                          <option value="Agency Manager" className="py-2">👨‍💼 Agency Manager</option>
                          <option value="Exchange Coordinator" className="py-2">⚙️ Exchange Coordinator</option>
                      </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                    </div>
                </div>
              </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="relative">
                        <select 
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
                          value={props.selectedUser.status}
                          onChange={(e) => alert(`Change status to ${e.target.value}`)}
                        >
                          <option value="Active" className="py-2">🟢 Active</option>
                          <option value="Inactive" className="py-2">⚪ Inactive</option>
                          <option value="Suspended" className="py-2">🔴 Suspended</option>
                          <option value="Pending" className="py-2">🟡 Pending</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exchange Assignment */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Exchange Assignment</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Exchange</label>
                      <div className="relative">
                        <select 
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
                          onChange={(e) => alert(`Assign to exchange ${e.target.value}`)}
                        >
                          <option value="" className="py-2">📋 Select Exchange</option>
                          {props.exchanges.map(ex => (
                            <option key={ex.id} value={ex.id} className="py-2">
                              💼 {ex.clientName} - {ex.value} ({ex.status})
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <button 
                      className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                      onClick={() => alert('View all user exchanges')}
                    >
                      📊 View All User Exchanges
                    </button>
                  </div>
                </div>

                {/* Referral Source with Third Party Details */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Referral Source</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-700 font-semibold">TP</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{props.selectedUser.referralSource || 'Direct Signup'}</div>
                          <div className="text-sm text-gray-600">
                            {props.selectedUser.referralSource ? 'Third Party Referral' : 'No referral source'}
                          </div>
                        </div>
                      </div>
                      {props.selectedUser.referralSource && (
                        <button 
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                          onClick={() => {
                            // Find the third party user
                            const thirdParty = props.userList.find(u => u.name === props.selectedUser.referralSource);
                            if (thirdParty) {
                              // Show referral details modal instead of switching profiles
                              setShowReferralDetailsModal(true);
                              setSelectedReferralUser(thirdParty);
                            } else {
                              alert(`View details for ${props.selectedUser.referralSource}`);
                            }
                          }}
                        >
                          View Details
                        </button>
            )}
          </div>
                    
                    {/* Third Party Stats (if this user is a Third Party) */}
                    {props.selectedUser.role === 'Third Party' && (
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-2">Third Party Overview</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-purple-700 font-medium">
                              {props.userList.filter(u => u.referralSource === props.selectedUser.name).length}
                            </div>
                            <div className="text-purple-600">Referred Clients</div>
                          </div>
                          <div>
                            <div className="text-purple-700 font-medium">
                              {props.exchanges.filter(ex => 
                                props.userList.find(u => u.referralSource === props.selectedUser.name)?.exchanges?.includes(ex.id)
                              ).length}
                            </div>
                            <div className="text-purple-600">Total Exchanges</div>
                          </div>
                        </div>
                        <button 
                          className="mt-3 w-full p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                          onClick={() => {
                            setShowReferralDetailsModal(true);
                            setSelectedReferralUser(props.selectedUser);
                          }}
                        >
                          View All Referred Clients
                        </button>
                      </div>
                    )}

                    {/* Super Third Party Stats */}
                    {props.selectedUser.role === 'Agency Manager' && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">Super Third Party Overview</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-blue-700 font-medium">
                              {props.userList.filter(u => u.role === 'Third Party' && u.referralSource === props.selectedUser.name).length}
                            </div>
                            <div className="text-blue-600">Third Parties</div>
                          </div>
                          <div>
                            <div className="text-blue-700 font-medium">
                              {props.userList.filter(u => u.referralSource && props.userList.find(tp => tp.name === u.referralSource && tp.referralSource === props.selectedUser.name)).length}
                            </div>
                            <div className="text-blue-600">Total Clients</div>
                          </div>
                          <div>
                            <div className="text-blue-700 font-medium">
                              {props.exchanges.filter(ex => {
                                const client = props.userList.find(u => u.exchanges?.includes(ex.id));
                                const thirdParty = props.userList.find(tp => tp.name === client?.referralSource);
                                return thirdParty?.referralSource === props.selectedUser.name;
                              }).length}
                            </div>
                            <div className="text-blue-600">Total Exchanges</div>
                          </div>
                        </div>
                        <button 
                          className="mt-3 w-full p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                          onClick={() => {
                            setShowReferralDetailsModal(true);
                            setSelectedReferralUser(props.selectedUser);
                          }}
                        >
                          View All Third Parties
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security & Access */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Security & Access</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Two-Factor Authentication</div>
                        <div className="text-sm text-gray-600">Enhanced security</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={props.selectedUser.role === 'Exchange Coordinator'} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">API Access</div>
                        <div className="text-sm text-gray-600">External integrations</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Audit Logging</div>
                        <div className="text-sm text-gray-600">Track all activities</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Engagement Stats */}
                {props.selectedUser.engagement && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Engagement Analytics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">{props.selectedUser.engagement.logins || 0}</div>
                        <div className="text-xs text-gray-600">Logins</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{props.selectedUser.engagement.messages || 0}</div>
                        <div className="text-xs text-gray-600">Messages</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-700">{props.selectedUser.engagement.docs || 0}</div>
                        <div className="text-xs text-gray-600">Documents</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Marketing Tags */}
                {props.selectedUser.marketingTags && props.selectedUser.marketingTags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Marketing Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {props.selectedUser.marketingTags.map(tag => (
                        <span key={tag} className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm" onClick={() => alert('Edit marketing tags')}>
                      Edit Tags
                    </button>
                  </div>
                )}

                {/* User Exchanges */}
                {props.selectedUser.exchanges && props.selectedUser.exchanges.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Related Exchanges</h3>
                    <div className="space-y-3">
                      {props.selectedUser.exchanges.map(eid => {
                        const ex = props.exchanges.find(e => e.id === eid);
                        if (!ex) return null;
                        return (
                          <div key={eid} className="p-3 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-gray-900">{ex.clientName}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ex.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ex.status === 'OPEN' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {ex.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">Value: {ex.value}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${ex.progress}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                              <span>Progress: {ex.progress}%</span>
                              <span>{ex.activeTasks} Tasks</span>
                            </div>
                            <button 
                              className="w-full text-center text-blue-600 hover:text-blue-800 text-sm font-medium py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                              onClick={() => { 
                                props.setSelectedExchange(ex); 
                                props.setActiveTab('timeline'); 
                                setShowProfileDrawer(false);
                              }}
                            >
                              View Exchange
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Advanced Admin Actions */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Advanced Actions</h3>
                  <div className="space-y-2">
                    <button 
                      className="w-full text-left p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                      onClick={() => alert('View audit log for user')}
                    >
                      <div className="font-medium text-yellow-900">View Audit Log</div>
                      <div className="text-sm text-yellow-700">See all user activities and actions</div>
                    </button>
                    <button 
                      className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                      onClick={() => alert('Export user data')}
                    >
                      <div className="font-medium text-orange-900">Export User Data</div>
                      <div className="text-sm text-orange-700">Download user information and history</div>
                    </button>
                    <button 
                      className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      onClick={() => {
                        if (confirm('Are you sure you want to deactivate this user?')) {
                          alert('User deactivated');
                        }
                      }}
                    >
                      <div className="font-medium text-red-900">Deactivate User</div>
                      <div className="text-sm text-red-700">Temporarily disable user access</div>
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Quick Actions</h3>
                  <div className="space-y-2">
                    <button 
                      className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      onClick={() => { props.setSelectedUser(props.selectedUser); props.setActiveTab('user-overview'); setShowProfileDrawer(false); }}
                    >
                      <div className="font-medium text-blue-900">View Full Details</div>
                      <div className="text-sm text-blue-700">See complete user overview and exchanges</div>
                    </button>
                    <button 
                      className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                      onClick={() => alert(`Open chat with ${props.selectedUser.name}`)}
                    >
                      <div className="font-medium text-purple-900">Start Chat</div>
                      <div className="text-sm text-purple-700">Send direct message to user</div>
                    </button>
                    <button 
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => alert('Generate user report')}
                    >
                      <div className="font-medium text-gray-900">Generate Report</div>
                      <div className="text-sm text-gray-700">Create detailed user activity report</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'messages' && (
        <UnifiedChatInterface
          exchanges={props.exchanges}
          messages={props.messages}
          currentUser={props.currentUser}
          exchangeParticipants={props.exchangeParticipants}
          onSendMessage={props.onSendMessage}
          newMessage={props.newMessage}
          setNewMessage={props.setNewMessage}
          selectedExchange={props.selectedExchange}
          setSelectedExchange={props.setSelectedExchange}
          handleWireView={props.handleWireView}
          showAddMemberModal={props.showAddMemberModal}
          setShowAddMemberModal={props.setShowAddMemberModal}
        />
      )}

      {/* Referral Details Modal - Super Admin Overview */}
      {showReferralDetailsModal && selectedReferralUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {selectedReferralUser.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedReferralUser.name}</h2>
                  <p className="text-purple-100">{selectedReferralUser.role} • Referral Network Overview</p>
                </div>
              </div>
              <button 
                className="text-white hover:text-purple-200 text-2xl"
                onClick={() => setShowReferralDetailsModal(false)}
              >
                ×
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b bg-gray-50">
              {['overview', 'third-parties', 'clients', 'exchanges', 'analytics'].map(tab => (
                <button
                  key={tab}
                  className={`px-6 py-3 font-medium transition-colors ${
                    referralModalTab === tab 
                      ? 'bg-white text-purple-600 border-b-2 border-purple-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setReferralModalTab(tab)}
                >
                  {tab === 'overview' && '📊 Overview'}
                  {tab === 'third-parties' && '🏢 Third Parties'}
                  {tab === 'clients' && '👥 Clients'}
                  {tab === 'exchanges' && '💼 Exchanges'}
                  {tab === 'analytics' && '📈 Analytics'}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {referralModalTab === 'overview' && (
                <div className="space-y-6">
                  {/* Network Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                      <div className="text-2xl font-bold">
                        {selectedReferralUser.role === 'Agency Manager' 
                          ? props.userList.filter(u => u.role === 'Third Party' && u.referralSource === selectedReferralUser.name).length
                          : props.userList.filter(u => u.referralSource === selectedReferralUser.name).length
                        }
                      </div>
                      <div className="text-purple-100">
                        {selectedReferralUser.role === 'Agency Manager' ? 'Third Parties' : 'Referred Clients'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                      <div className="text-2xl font-bold">
                        {selectedReferralUser.role === 'Agency Manager'
                          ? props.userList.filter(u => u.referralSource && props.userList.find(tp => tp.name === u.referralSource && tp.referralSource === selectedReferralUser.name)).length
                          : props.exchanges.filter(ex => props.userList.find(u => u.referralSource === selectedReferralUser.name)?.exchanges?.includes(ex.id)).length
                        }
                      </div>
                      <div className="text-blue-100">
                        {selectedReferralUser.role === 'Agency Manager' ? 'Total Clients' : 'Total Exchanges'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                      <div className="text-2xl font-bold">
                        {selectedReferralUser.role === 'Agency Manager'
                          ? props.exchanges.filter(ex => {
                              const client = props.userList.find(u => u.exchanges?.includes(ex.id));
                              const thirdParty = props.userList.find(tp => tp.name === client?.referralSource);
                              return thirdParty?.referralSource === selectedReferralUser.name;
                            }).length
                          : props.exchanges.filter(ex => props.userList.find(u => u.referralSource === selectedReferralUser.name)?.exchanges?.includes(ex.id)).reduce((sum, ex) => sum + Number(ex.value.replace(/[^\d.]/g, '')), 0).toLocaleString()
                        }
                      </div>
                      <div className="text-green-100">
                        {selectedReferralUser.role === 'Agency Manager' ? 'Total Exchanges' : 'Total Value ($)'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
                      <div className="text-2xl font-bold">
                        {selectedReferralUser.role === 'Agency Manager' ? '85%' : '92%'}
                      </div>
                      <div className="text-orange-100">Success Rate</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Recent Activity</h3>
                    <div className="space-y-2">
                      {selectedReferralUser.role === 'Agency Manager' ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span>New Third Party "ABC Realty" joined network</span>
                            <span className="text-gray-500">2 hours ago</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span>Client "Smith Family" completed exchange</span>
                            <span className="text-gray-500">1 day ago</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span>Third Party "XYZ Properties" referred 3 new clients</span>
                            <span className="text-gray-500">3 days ago</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span>New client "Johnson Family" referred</span>
                            <span className="text-gray-500">1 hour ago</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span>Exchange "Metro Properties" completed</span>
                            <span className="text-gray-500">2 days ago</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span>Client "Anderson Holdings" uploaded documents</span>
                            <span className="text-gray-500">4 days ago</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {referralModalTab === 'third-parties' && selectedReferralUser.role === 'Agency Manager' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Third Parties Network</h3>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Add Third Party
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {props.userList.filter(u => u.role === 'Third Party' && u.referralSource === selectedReferralUser.name).map(tp => (
                      <div key={tp.id} className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-700 font-semibold">{tp.name.split(' ').map(n => n[0]).join('')}</span>
                          </div>
                          <div>
                            <div className="font-semibold">{tp.name}</div>
                            <div className="text-sm text-gray-600">{tp.email}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <div className="font-medium text-purple-700">
                              {props.userList.filter(u => u.referralSource === tp.name).length}
                            </div>
                            <div className="text-gray-600">Clients</div>
                          </div>
                          <div>
                            <div className="font-medium text-blue-700">
                              {props.exchanges.filter(ex => 
                                props.userList.find(u => u.referralSource === tp.name)?.exchanges?.includes(ex.id)
                              ).length}
                            </div>
                            <div className="text-gray-600">Exchanges</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200">
                            View Details
                          </button>
                          <button className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                            Message
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {referralModalTab === 'clients' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      {selectedReferralUser.role === 'Agency Manager' ? 'All Network Clients' : 'Referred Clients'}
                    </h3>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Export List
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3">Client Name</th>
                          <th className="text-left p-3">Email</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-left p-3">Exchanges</th>
                          <th className="text-left p-3">Total Value</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedReferralUser.role === 'Agency Manager' 
                          ? props.userList.filter(u => u.referralSource && props.userList.find(tp => tp.name === u.referralSource && tp.referralSource === selectedReferralUser.name))
                          : props.userList.filter(u => u.referralSource === selectedReferralUser.name)
                        ).map(client => (
                          <tr key={client.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{client.name}</td>
                            <td className="p-3 text-gray-600">{client.email}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                client.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {client.status}
                              </span>
                            </td>
                            <td className="p-3">
                              {client.exchanges ? client.exchanges.length : 0}
                            </td>
                            <td className="p-3">
                              ${props.exchanges.filter(ex => client.exchanges?.includes(ex.id))
                                .reduce((sum, ex) => sum + Number(ex.value.replace(/[^\d.]/g, '')), 0)
                                .toLocaleString()}
                            </td>
                            <td className="p-3">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {referralModalTab === 'exchanges' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      {selectedReferralUser.role === 'Agency Manager' ? 'All Network Exchanges' : 'Referred Exchanges'}
                    </h3>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Export Data
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(selectedReferralUser.role === 'Agency Manager'
                      ? props.exchanges.filter(ex => {
                          const client = props.userList.find(u => u.exchanges?.includes(ex.id));
                          const thirdParty = props.userList.find(tp => tp.name === client?.referralSource);
                          return thirdParty?.referralSource === selectedReferralUser.name;
                        })
                      : props.exchanges.filter(ex => 
                          props.userList.find(u => u.referralSource === selectedReferralUser.name)?.exchanges?.includes(ex.id)
                        )
                    ).map(exchange => (
                      <div key={exchange.id} className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-semibold">{exchange.clientName}</div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            exchange.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            exchange.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {exchange.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          Value: {exchange.value}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${exchange.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Progress: {exchange.progress}%</span>
                          <span>{exchange.activeTasks} Tasks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {referralModalTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">Monthly Growth</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>New Clients</span>
                          <span className="font-medium text-green-600">+12</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completed Exchanges</span>
                          <span className="font-medium text-blue-600">+8</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Value</span>
                          <span className="font-medium text-purple-600">+$2.4M</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">Performance Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Success Rate</span>
                          <span className="font-medium text-green-600">92%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg. Exchange Value</span>
                          <span className="font-medium text-blue-600">$1.2M</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Client Retention</span>
                          <span className="font-medium text-purple-600">87%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Peak1031Preview = () => {
  const [currentView, setCurrentView] = useState('admin');
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedExchangeForMessages, setSelectedExchangeForMessages] = useState(null);
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [selectedChatExchange, setSelectedChatExchange] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  
  // Debug: Log selectedUser changes
  useEffect(() => {
    console.log('selectedUser changed:', selectedUser);
  }, [selectedUser]);
  const [exchanges, setExchanges] = useState([
    // BEFORE INITIAL - Exchange hasn't started yet
    { id: 1, clientName: "Johnson Family Trust", status: "PENDING", startDate: "2025-02-15", deadline45: "2025-03-30", deadline180: "2025-08-14", progress: 0, unreadMessages: 2, activeTasks: 3, value: "$2,450,000" },
    
    // 45 DAYS - Currently in 45-day period (about 60% through 45 days)
    { id: 2, clientName: "Metro Properties LLC", status: "OPEN", startDate: "2024-12-01", deadline45: "2025-01-15", deadline180: "2025-05-30", progress: 60, unreadMessages: 0, activeTasks: 5, value: "$1,200,000" },
    
    // CLOSEUP - Exchange completed (past 180 days)
    { id: 3, clientName: "Anderson Holdings", status: "COMPLETED", startDate: "2024-06-01", deadline45: "2024-07-15", deadline180: "2024-11-30", progress: 100, unreadMessages: 0, activeTasks: 0, value: "$850,000" },
    
    // 45 DAYS - Currently in 45-day period (about 75% through 45 days)
    { id: 4, clientName: "Greenfield Estates", status: "OPEN", startDate: "2024-12-10", deadline45: "2025-01-24", deadline180: "2025-06-08", progress: 75, unreadMessages: 1, activeTasks: 2, value: "$3,100,000" },
    
    // BEFORE INITIAL - Exchange hasn't started yet
    { id: 5, clientName: "Sunset Commercial", status: "PENDING", startDate: "2025-03-20", deadline45: "2025-05-03", deadline180: "2025-09-18", progress: 0, unreadMessages: 3, activeTasks: 4, value: "$2,800,000" },
    
    // 180 DAYS - Currently in 180-day period (about 35% through 180 days)
    { id: 6, clientName: "Blue Ocean Realty", status: "OPEN", startDate: "2024-10-05", deadline45: "2024-11-19", deadline180: "2025-04-03", progress: 35, unreadMessages: 0, activeTasks: 1, value: "$1,950,000" },
    
    // CLOSEUP - Exchange completed (past 180 days)
    { id: 7, clientName: "Maple Leaf Partners", status: "COMPLETED", startDate: "2024-05-15", deadline45: "2024-06-30", deadline180: "2024-11-14", progress: 100, unreadMessages: 0, activeTasks: 0, value: "$1,100,000" },
    
    // BEFORE INITIAL - Exchange hasn't started yet
    { id: 8, clientName: "Cedar Ridge LLC", status: "PENDING", startDate: "2025-04-18", deadline45: "2025-06-01", deadline180: "2025-10-16", progress: 0, unreadMessages: 2, activeTasks: 3, value: "$2,200,000" },
    
    // 45 DAYS - Currently in 45-day period (about 45% through 45 days)
    { id: 9, clientName: "Evergreen Trust", status: "OPEN", startDate: "2024-12-22", deadline45: "2025-02-05", deadline180: "2025-06-20", progress: 45, unreadMessages: 1, activeTasks: 2, value: "$1,750,000" },
    
    // BEFORE INITIAL - Exchange hasn't started yet
    { id: 10, clientName: "Summit Realty Group", status: "PENDING", startDate: "2025-05-25", deadline45: "2025-07-08", deadline180: "2025-11-23", progress: 0, unreadMessages: 4, activeTasks: 5, value: "$3,600,000" },
    
    // 180 DAYS - Currently in 180-day period (about 20% through 180 days)
    { id: 11, clientName: "Pinecrest Partners", status: "OPEN", startDate: "2024-09-28", deadline45: "2024-11-11", deadline180: "2025-03-26", progress: 20, unreadMessages: 0, activeTasks: 2, value: "$2,100,000" },
    
    // CLOSEUP - Exchange completed (past 180 days)
    { id: 12, clientName: "Harborview Estates", status: "COMPLETED", startDate: "2024-07-20", deadline45: "2024-09-04", deadline180: "2025-01-19", progress: 100, unreadMessages: 0, activeTasks: 0, value: "$1,900,000" },
    
    // 45 DAYS - Currently in 45-day period (about 30% through 45 days)
    { id: 13, clientName: "Willow Springs", status: "OPEN", startDate: "2024-12-30", deadline45: "2025-02-14", deadline180: "2025-06-29", progress: 30, unreadMessages: 2, activeTasks: 3, value: "$2,600,000" },
    
    // BEFORE INITIAL - Exchange hasn't started yet
    { id: 14, clientName: "Oakridge Estates", status: "PENDING", startDate: "2025-06-02", deadline45: "2025-07-16", deadline180: "2025-12-01", progress: 0, unreadMessages: 1, activeTasks: 2, value: "$1,850,000" },
    
    // 180 DAYS - Currently in 180-day period (about 50% through 180 days)
    { id: 15, clientName: "Silver Lake Holdings", status: "OPEN", startDate: "2024-11-05", deadline45: "2024-12-19", deadline180: "2025-05-04", progress: 50, unreadMessages: 0, activeTasks: 4, value: "$3,200,000" }
  ]);
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Review Purchase Agreement",
      priority: "HIGH",
      dueDate: "2024-12-20",
      status: "PENDING",
      assignedTo: "Sarah Johnson"
    },
    {
      id: 2,
      title: "Verify Wire Instructions",
      priority: "URGENT",
      dueDate: "2024-12-18",
      status: "IN_PROGRESS",
      assignedTo: "Mike Chen"
    },
    {
      id: 3,
      title: "Upload Signed Documents",
      priority: "MEDIUM",
      dueDate: "2024-12-22",
      status: "PENDING",
      assignedTo: "Client"
    }
  ]);
  const [messages, setMessages] = useState({
    1: [ // Exchange ID 1 - Johnson Family Trust
      {
        id: 1,
        sender: "Sarah Johnson",
        senderId: "sarah",
        content: "Hi! I've uploaded the purchase agreement for your review. Please take a look when you have a chance.",
        timestamp: "2 hours ago",
        read: false,
        hasAttachment: true,
        attachmentName: "Purchase Agreement.pdf"
      },
      {
        id: 2,
        sender: "Mike Chen",
        senderId: "mike",
        content: "Please confirm the wire details for the replacement property. I've sent the instructions via secure email.",
        timestamp: "1 day ago",
        read: true,
        hasAttachment: false
      },
      {
        id: 3,
        sender: "Sarah Johnson",
        senderId: "sarah",
        content: "Wire instructions are attached. You'll need your pin to view them for security.",
        timestamp: "1 day ago",
        read: true,
        hasAttachment: true,
        attachmentName: "Wire Instructions.pdf"
      },
      {
        id: 4,
        sender: "Johnson Family Trust",
        senderId: "client",
        content: "Thanks Sarah, I entered my pin and was able to view the wire instructions.",
        timestamp: "23 hours ago",
        read: true,
        hasAttachment: false
      },
      {
        id: 5,
        sender: "Sarah Johnson",
        senderId: "sarah",
        content: "Great! Let me know if you have any questions or need to update your pin in your profile settings.",
        timestamp: "22 hours ago",
        read: true,
        hasAttachment: false
      },
      {
        id: 6,
        sender: "Johnson Family Trust",
        senderId: "client",
        content: "All set. I'll review the rest of the documents this evening.",
        timestamp: "1 hour ago",
        read: true,
        hasAttachment: false
      }
    ],
    2: [ // Exchange ID 2 - Metro Properties LLC
      {
        id: 1,
        sender: "David Wilson",
        senderId: "david",
        content: "Property inspection scheduled for tomorrow at 2 PM. Will send photos after.",
        timestamp: "3 hours ago",
        read: false,
        hasAttachment: false
      },
      {
        id: 2,
        sender: "Metro Properties LLC",
        senderId: "client",
        content: "Perfect, looking forward to the inspection report.",
        timestamp: "2 hours ago",
        read: true,
        hasAttachment: false
      },
      {
        id: 3,
        sender: "David Wilson",
        senderId: "david",
        content: "Wire instructions for the deposit are attached. Please use your pin to access.",
        timestamp: "1 hour ago",
        read: false,
        hasAttachment: true,
        attachmentName: "Wire Instructions.pdf"
      },
      {
        id: 4,
        sender: "Metro Properties LLC",
        senderId: "client",
        content: "I entered my pin and downloaded the wire instructions. Thank you!",
        timestamp: "50 minutes ago",
        read: true,
        hasAttachment: false
      },
      {
        id: 5,
        sender: "David Wilson",
        senderId: "david",
        content: "You're welcome. Let me know once the transfer is complete.",
        timestamp: "45 minutes ago",
        read: true,
        hasAttachment: false
      }
    ],
    3: [ // Exchange ID 3 - Anderson Holdings
      {
        id: 1,
        sender: "Maria Rodriguez",
        senderId: "maria",
        content: "Closing documents are ready. Final walkthrough scheduled for Friday.",
        timestamp: "5 hours ago",
        read: true,
        hasAttachment: true,
        attachmentName: "Closing Docs.pdf"
      },
      {
        id: 2,
        sender: "Maria Rodriguez",
        senderId: "maria",
        content: "Wire instructions for closing are attached. Please enter your pin to view.",
        timestamp: "4 hours ago",
        read: false,
        hasAttachment: true,
        attachmentName: "Wire Instructions.pdf"
      },
      {
        id: 3,
        sender: "Anderson Holdings",
        senderId: "client",
        content: "Pin entered, wire instructions received. Ready for closing.",
        timestamp: "3 hours ago",
        read: true,
        hasAttachment: false
      },
      {
        id: 4,
        sender: "Maria Rodriguez",
        senderId: "maria",
        content: "Excellent. See you at the walkthrough!",
        timestamp: "2 hours ago",
        read: true,
        hasAttachment: false
      }
    ]
  });

  const [exchangeParticipants, setExchangeParticipants] = useState({
    1: [
      { id: "sarah", name: "Sarah Johnson", role: "Real Estate Agent", avatar: "SJ" },
      { id: "mike", name: "Mike Chen", role: "Attorney", avatar: "MC" },
      { id: "client", name: "Johnson Family Trust", role: "Client", avatar: "JFT" },
      { id: "admin", name: "Peak 1031 Staff", role: "Exchange Coordinator", avatar: "P1031" }
    ],
    2: [
      { id: "david", name: "David Wilson", role: "Real Estate Agent", avatar: "DW" },
      { id: "client", name: "Metro Properties LLC", role: "Client", avatar: "MPL" },
      { id: "admin", name: "Peak 1031 Staff", role: "Exchange Coordinator", avatar: "P1031" }
    ],
    3: [
      { id: "maria", name: "Maria Rodriguez", role: "Real Estate Agent", avatar: "MR" },
      { id: "client", name: "Anderson Holdings", role: "Client", avatar: "AH" },
      { id: "admin", name: "Peak 1031 Staff", role: "Exchange Coordinator", avatar: "P1031" }
    ]
  });

  const [currentExchangeId, setCurrentExchangeId] = useState(1);
  const [currentUser, setCurrentUser] = useState({
    id: "client",
    name: "Johnson Family Trust",
    role: "Client"
  });

  // User assignments to exchanges
  const [userExchangeAssignments, setUserExchangeAssignments] = useState({
    "admin": [1, 2, 3], // Admin sees all exchanges
    "client": [1], // Johnson Family Trust only sees their exchange
    "sarah": [1], // Sarah Mitchell assigned to Johnson Family Trust
    "david": [2], // David Wilson assigned to Metro Properties
    "maria": [3], // Maria Rodriguez assigned to Anderson Holdings
    "mike": [1], // Mike Chen assigned to Johnson Family Trust
    "agency-admin": [1, 2, 3] // Agency admin sees all their agents' exchanges
  });

  // Update current user based on view
  useEffect(() => {
    switch (currentView) {
      case 'admin':
        setCurrentUser({
          id: "admin",
          name: "Peak 1031 Staff",
          role: "Exchange Coordinator"
        });
        break;
      case 'client':
        setCurrentUser({
          id: "client",
          name: "Johnson Family Trust",
          role: "Client"
        });
        break;
      case 'super-third-party':
        setCurrentUser({
          id: "agency-admin",
          name: "Pacific Coast Realty",
          role: "Agency Manager"
        });
        break;
      case 'third-party':
        setCurrentUser({
          id: "sarah",
          name: "Sarah Mitchell",
          role: "Real Estate Agent"
        });
        break;
    }
  }, [currentView]);

  // Get exchanges for current user
  const getUserExchanges = () => {
    const userExchanges = userExchangeAssignments[currentUser.id] || [];
    return exchanges.filter(exchange => userExchanges.includes(exchange.id));
  };
  const [auditLogs, setAuditLogs] = useState([
    // Johnson Family Trust (Exchange 1)
    {
      id: 1,
      action: "DOCUMENT_UPLOAD",
      user: "sarah.johnson@agency.com",
      timestamp: "2024-12-17 14:30:15",
      details: "Purchase Agreement.pdf uploaded for Johnson Family Trust (Exchange 1)",
      ip: "192.168.1.100"
    },
    {
      id: 2,
      action: "LOGIN_SUCCESS",
      user: "admin@peak1031.com",
      timestamp: "2024-12-17 14:15:22",
      details: "2FA verified for admin login",
      ip: "10.0.1.50"
    },
    {
      id: 3,
      action: "FAILED_2FA",
      user: "suspicious@email.com",
      timestamp: "2024-12-17 13:45:10",
      details: "Multiple failed attempts for Johnson Family Trust (Exchange 1)",
      ip: "203.45.67.89"
    },
    {
      id: 4,
      action: "TASK_COMPLETED",
      user: "mike.chen@lawfirm.com",
      timestamp: "2024-12-17 15:10:00",
      details: "Task 'Review Purchase Agreement' marked as completed for Johnson Family Trust (Exchange 1)",
      ip: "192.168.1.101"
    },
    {
      id: 5,
      action: "DOCUMENT_REVIEWED",
      user: "johnson@email.com",
      timestamp: "2024-12-17 16:00:00",
      details: "Purchase Agreement.pdf reviewed by client for Johnson Family Trust (Exchange 1)",
      ip: "192.168.1.102"
    },
    // Metro Properties LLC (Exchange 2)
    {
      id: 6,
      action: "DOCUMENT_UPLOAD",
      user: "david.wilson@agency.com",
      timestamp: "2024-12-19 11:00:00",
      details: "Inspection Report.pdf uploaded for Metro Properties LLC (Exchange 2)",
      ip: "192.168.2.100"
    },
    {
      id: 7,
      action: "LOGIN_SUCCESS",
      user: "client@metro.com",
      timestamp: "2024-12-19 11:05:00",
      details: "Client logged in successfully for Metro Properties LLC (Exchange 2)",
      ip: "10.0.2.50"
    },
    {
      id: 8,
      action: "TASK_COMPLETED",
      user: "david.wilson@agency.com",
      timestamp: "2024-12-19 12:00:00",
      details: "Task 'Property Inspection' marked as completed for Metro Properties LLC (Exchange 2)",
      ip: "192.168.2.101"
    },
    {
      id: 9,
      action: "USER_ASSIGNED",
      user: "admin@peak1031.com",
      timestamp: "2024-12-19 12:30:00",
      details: "David Wilson assigned to Metro Properties LLC (Exchange 2)",
      ip: "10.0.1.50"
    },
    // Anderson Holdings (Exchange 3)
    {
      id: 10,
      action: "DOCUMENT_UPLOAD",
      user: "maria.rodriguez@agency.com",
      timestamp: "2024-12-20 16:45:00",
      details: "Closing Docs.pdf uploaded for Anderson Holdings (Exchange 3)",
      ip: "192.168.3.100"
    },
    {
      id: 11,
      action: "SYNC_PP",
      user: "admin@peak1031.com",
      timestamp: "2024-12-20 17:00:00",
      details: "PracticePanther sync completed for Anderson Holdings (Exchange 3)",
      ip: "10.0.1.50"
    },
    {
      id: 12,
      action: "LOGIN_SUCCESS",
      user: "maria.rodriguez@agency.com",
      timestamp: "2024-12-20 17:05:00",
      details: "Agent logged in for Anderson Holdings (Exchange 3)",
      ip: "192.168.3.101"
    },
    {
      id: 13,
      action: "FAILED_2FA",
      user: "anderson@holdings.com",
      timestamp: "2024-12-20 17:10:00",
      details: "Failed 2FA for Anderson Holdings (Exchange 3)",
      ip: "203.45.67.90"
    },
    {
      id: 14,
      action: "TASK_COMPLETED",
      user: "maria.rodriguez@agency.com",
      timestamp: "2024-12-20 18:00:00",
      details: "Task 'Closing Documents' marked as completed for Anderson Holdings (Exchange 3)",
      ip: "192.168.3.102"
    },
    {
      id: 15,
      action: "DOCUMENT_REVIEWED",
      user: "anderson@holdings.com",
      timestamp: "2024-12-20 18:30:00",
      details: "Closing Docs.pdf reviewed by client for Anderson Holdings (Exchange 3)",
      ip: "192.168.3.103"
    }
  ]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    connected: true,
    lastSync: "2 hours ago",
    recordsProcessed: 47,
    successRate: 99.8
  });

  // Interactive functions
  const handleExchangeClick = (exchange) => {
    setSelectedExchange(exchange);
    setCurrentExchangeId(exchange.id);
    if (currentView === 'client') {
      setActiveTab('timeline');
    }
  };

  const handleTaskComplete = (taskId) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: 'COMPLETED' }
        : task
    ));
    // Update exchange progress
    setExchanges(prev => prev.map(exchange => ({
      ...exchange,
      activeTasks: exchange.activeTasks > 0 ? exchange.activeTasks - 1 : 0
    })));
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const exchangeMessages = messages[currentExchangeId] || [];
      const newMsg = {
        id: Math.max(...exchangeMessages.map(m => m.id), 0) + 1,
        sender: currentUser.name,
        senderId: currentUser.id,
        content: newMessage,
        timestamp: 'Just now',
        read: false,
        hasAttachment: false
      };
      
      setMessages(prev => ({
        ...prev,
        [currentExchangeId]: [...(prev[currentExchangeId] || []), newMsg]
      }));
      setNewMessage('');
      
      // Update unread messages count for other participants
      setExchanges(prev => prev.map(exchange => 
        exchange.id === currentExchangeId 
          ? { ...exchange, unreadMessages: exchange.unreadMessages + 1 }
          : exchange
      ));
    }
  };

  const handleSyncPP = () => {
    setSyncStatus(prev => ({
      ...prev,
      lastSync: 'Just now',
      recordsProcessed: prev.recordsProcessed + 3,
      successRate: 99.9
    }));
    
    // Add audit log
    const newLog = {
      id: auditLogs.length + 1,
      action: "SYNC_PP",
      user: "admin@peak1031.com",
      timestamp: new Date().toLocaleString(),
      details: "PracticePanther sync completed",
      ip: "10.0.1.50"
    };
    setAuditLogs(prev => [newLog, ...prev]);
    showSuccess('PracticePanther sync completed successfully!');
  };

  const handleNewExchange = () => {
    const newExchange = {
      id: exchanges.length + 1,
      clientName: `New Exchange ${exchanges.length + 1}`,
      status: "OPEN",
      startDate: new Date().toISOString().split('T')[0],
      deadline45: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deadline180: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      unreadMessages: 0,
      activeTasks: 2,
      value: "$500,000"
    };
    setExchanges(prev => [newExchange, ...prev]);
    showSuccess('New exchange created successfully!');
  };

  const handleMarkMessageRead = (messageId) => {
    setMessages(prev => ({
      ...prev,
      [currentExchangeId]: (prev[currentExchangeId] || []).map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      )
    }));
    
    // Update unread count for current exchange
    setExchanges(prev => prev.map(exchange => 
      exchange.id === currentExchangeId 
        ? { ...exchange, unreadMessages: Math.max(0, exchange.unreadMessages - 1) }
        : exchange
    ));
  };

  const handleUploadDocument = () => {
    const newLog = {
      id: auditLogs.length + 1,
      action: "DOCUMENT_UPLOAD",
      user: currentView === 'client' ? 'johnson@email.com' : 'admin@peak1031.com',
      timestamp: new Date().toLocaleString(),
      details: "New document uploaded",
      ip: "192.168.1.100"
    };
    setAuditLogs(prev => [newLog, ...prev]);
    showSuccess('Document uploaded successfully!');
  };

  const handleCompleteTask = (taskId) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: 'COMPLETED' }
        : task
    ));
    showSuccess('Task completed successfully!');
  };

  const handleReplyMessage = (messageId) => {
    const message = messages[currentExchangeId]?.find(m => m.id === messageId);
    if (message) {
      setNewMessage(`Reply to ${message.sender}: `);
    }
  };

  const handleExchangeSelect = (exchange) => {
    setSelectedExchange(exchange);
    setCurrentExchangeId(exchange.id);
    if (currentView === 'client') {
      setActiveTab('messages');
    } else {
      // For other views, show unified chat interface
      setSelectedChatExchange(exchange);
      setShowChatInterface(true);
    }
  };

  const handleOpenChat = () => {
    setShowChatInterface(true);
    if (getUserExchanges().length > 0) {
      setSelectedChatExchange(getUserExchanges()[0]);
    }
  };

  const handleViewDetails = (exchange) => {
    setSelectedExchange(exchange);
    setActiveTab('timeline');
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setNotifications(0);
  };

  const handleClearNotifications = () => {
    setNotifications(0);
    setShowNotifications(false);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  useEffect(() => {
    if (!selectedExchange && exchanges.length > 0) {
      setSelectedExchange(exchanges[0]);
    }
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const StatusBadge = ({ status }) => {
    const colors = {
      OPEN: "bg-yellow-100 text-yellow-800",
      PENDING: "bg-orange-100 text-orange-800",
      COMPLETED: "bg-green-100 text-green-800"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const PriorityBadge = ({ priority }) => {
    const colors = {
      LOW: "bg-gray-100 text-gray-800",
      MEDIUM: "bg-blue-100 text-blue-800",
      HIGH: "bg-orange-100 text-orange-800",
      URGENT: "bg-red-100 text-red-800"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>
        {priority}
      </span>
    );
  };

  const ProgressBar = ({ progress, deadline45, deadline180 }) => {
    const daysTo45 = Math.ceil((new Date(deadline45) - new Date()) / (1000 * 60 * 60 * 24));
    const daysTo180 = Math.ceil((new Date(deadline180) - new Date()) / (1000 * 60 * 60 * 24));
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress: {progress}%</span>
          <span className={daysTo45 < 10 ? "text-red-600 font-bold" : "text-gray-600"}>
            {daysTo45} days to 45-day deadline
          </span>
        </div>
        <div className="relative w-full bg-gray-200 rounded-full h-3">
          <div 
            className="absolute top-0 left-0 h-3 bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-0 h-3 w-1 bg-red-500"
            style={{ left: '25%' }}
            title="45-day deadline"
          />
          <div 
            className="absolute top-0 h-3 w-1 bg-orange-500"
            style={{ left: '100%' }}
            title="180-day deadline"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Start</span>
          <span>45 days</span>
          <span>180 days</span>
              </div>
      </div>
    );
  };

  // Add mock document data to state in Peak1031Preview
  const [documents, setDocuments] = useState([
    { id: 1, exchangeId: 1, name: 'Purchase Agreement.pdf', uploadedAt: '2024-12-17 14:30', uploader: 'Sarah Johnson', engagement: ['Mike Chen', 'Johnson Family Trust'] },
    { id: 2, exchangeId: 1, name: 'Wire Instructions.pdf', uploadedAt: '2024-12-18 09:15', uploader: 'Mike Chen', engagement: ['Sarah Johnson'] },
    { id: 3, exchangeId: 2, name: 'Inspection Report.pdf', uploadedAt: '2024-12-19 11:00', uploader: 'David Wilson', engagement: ['Metro Properties LLC'] },
    { id: 4, exchangeId: 3, name: 'Closing Docs.pdf', uploadedAt: '2024-12-20 16:45', uploader: 'Maria Rodriguez', engagement: ['Anderson Holdings'] }
  ]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docModalType, setDocModalType] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const thirdParties = [
    { id: 1, name: "Pacific Coast Realty", exchanges: [1, 2] },
    { id: 2, name: "Law Firm A", exchanges: [1] },
    { id: 3, name: "Bank of America", exchanges: [1, 2, 3] }
  ];

  const [userList, setUserList] = useState([
    { id: 100, name: 'Acme Agency', email: 'super@acme.com', role: 'Agency Manager', status: 'Active', exchanges: [], lastLogin: '2024-12-28 09:00', referralSource: null, engagement: { logins: 20, messages: 10, docs: 5 }, marketingTags: ['Agency'] },
    { id: 4, name: "Johnson Family Trust", email: "johnson@email.com", role: "Client", status: "Active", exchanges: [1, 4, 8, 9, 13], lastLogin: "2024-12-17 08:00", referralSource: "Pacific Coast Realty", engagement: { logins: 12, messages: 8, docs: 3 }, marketingTags: ["VIP"], thirdPartyId: 1, superThirdPartyId: 100 },
    { id: 5, name: "Metro Properties LLC", email: "client@metro.com", role: "Client", status: "Active", exchanges: [2, 5, 7, 11, 14], lastLogin: "2024-12-19 10:00", referralSource: "Law Firm A", engagement: { logins: 8, messages: 5, docs: 2 }, marketingTags: ["Newsletter"], thirdPartyId: 2, superThirdPartyId: 100 },
    { id: 6, name: "Anderson Holdings", email: "anderson@holdings.com", role: "Client", status: "Inactive", exchanges: [3, 6, 12, 13, 15], lastLogin: "2024-12-15 13:45", referralSource: "Bank of America", engagement: { logins: 5, messages: 2, docs: 1 }, marketingTags: [], thirdPartyId: 3, superThirdPartyId: 100 },
    { id: 7, name: "Greenfield Estates", email: "client@greenfield.com", role: "Client", status: "Active", exchanges: [4, 8, 9, 13, 15], lastLogin: "2024-12-20 09:30", referralSource: "Blue Ocean Realty", engagement: { logins: 10, messages: 7, docs: 2 }, marketingTags: ["VIP", "Event"], thirdPartyId: 4, superThirdPartyId: 100 },
    { id: 8, name: "Sunset Commercial", email: "client@sunset.com", role: "Client", status: "Active", exchanges: [5, 7, 10, 12, 14], lastLogin: "2024-12-21 11:00", referralSource: "Pacific Coast Realty", engagement: { logins: 7, messages: 3, docs: 1 }, marketingTags: [], thirdPartyId: 5, superThirdPartyId: 100 },
    { id: 12, name: "Evergreen Trust", email: "client@evergreen.com", role: "Client", status: "Active", exchanges: [9, 11, 12, 13, 15], lastLogin: "2024-12-24 08:30", referralSource: "Cedar Ridge LLC", engagement: { logins: 9, messages: 6, docs: 2 }, marketingTags: ["Newsletter"], thirdPartyId: 9, superThirdPartyId: 100 },
    { id: 14, name: "Pinecrest Partners", email: "client@pinecrest.com", role: "Client", status: "Active", exchanges: [11, 12, 13, 14, 15], lastLogin: "2024-12-26 09:45", referralSource: "Summit Realty Group", engagement: { logins: 6, messages: 2, docs: 1 }, marketingTags: [], thirdPartyId: 11, superThirdPartyId: 100 },
    { id: 15, name: "Harborview Estates", email: "client@harborview.com", role: "Client", status: "Inactive", exchanges: [12, 1, 13, 14, 15], lastLogin: "2024-12-27 10:15", referralSource: "Pacific Coast Realty", engagement: { logins: 4, messages: 1, docs: 0 }, marketingTags: [], thirdPartyId: 12, superThirdPartyId: 100 },
    { id: 1, name: "Pacific Coast Realty", email: "admin@pacificcoast.com", role: "Third Party", status: "Active", exchanges: [1, 2, 4, 9], lastLogin: "2024-12-17 09:12", referralSource: "Acme Agency", engagement: { logins: 10, messages: 6, docs: 2 }, marketingTags: ["Newsletter"], superThirdPartyId: 100 },
    { id: 2, name: "Law Firm A", email: "admin@lawfirma.com", role: "Third Party", status: "Active", exchanges: [1, 5, 10], lastLogin: "2024-12-16 15:30", referralSource: "Acme Agency", engagement: { logins: 8, messages: 4, docs: 1 }, marketingTags: ["Newsletter"], superThirdPartyId: 100 },
    { id: 3, name: "Bank of America", email: "admin@bofa.com", role: "Third Party", status: "Inactive", exchanges: [1, 2, 3, 6, 12], lastLogin: "2024-12-10 11:00", referralSource: "Acme Agency", engagement: { logins: 6, messages: 3, docs: 1 }, marketingTags: ["Newsletter"], superThirdPartyId: 100 },
    { id: 9, name: "Blue Ocean Realty", email: "admin@blueocean.com", role: "Third Party", status: "Active", exchanges: [6, 8, 11], lastLogin: "2024-12-22 14:00", referralSource: "Acme Agency", engagement: { logins: 7, messages: 3, docs: 1 }, marketingTags: ["Newsletter"], superThirdPartyId: 100 },
    { id: 10, name: "Maple Leaf Partners", email: "admin@mapleleaf.com", role: "Third Party", status: "Inactive", exchanges: [7, 3, 12], lastLogin: "2024-12-18 12:00", referralSource: "Acme Agency", engagement: { logins: 5, messages: 2, docs: 1 }, marketingTags: ["Newsletter"], superThirdPartyId: 100 },
    { id: 11, name: "Cedar Ridge LLC", email: "admin@cedarridge.com", role: "Third Party", status: "Active", exchanges: [8, 2, 10], lastLogin: "2024-12-23 10:00", referralSource: "Acme Agency", engagement: { logins: 7, messages: 3, docs: 1 }, marketingTags: ["Newsletter"], superThirdPartyId: 100 },
    { id: 13, name: "Summit Realty Group", email: "admin@summit.com", role: "Third Party", status: "Active", exchanges: [10, 11, 12], lastLogin: "2024-12-25 13:00", referralSource: "Acme Agency", engagement: { logins: 6, messages: 2, docs: 1 }, marketingTags: ["Newsletter"], superThirdPartyId: 100 },
    { id: 16, name: "Pinecrest Partners", email: "client@pinecrest.com", role: "Client", status: "Active", exchanges: [11, 12], lastLogin: "2024-12-26 09:45", referralSource: "Summit Realty Group", engagement: { logins: 5, messages: 2, docs: 1 }, marketingTags: ["Newsletter"], thirdPartyId: 14, superThirdPartyId: 100 },
    { id: 17, name: "Harborview Estates", email: "client@harborview.com", role: "Client", status: "Inactive", exchanges: [12, 1], lastLogin: "2024-12-27 10:15", referralSource: "Pacific Coast Realty", engagement: { logins: 4, messages: 1, docs: 0 }, marketingTags: [], thirdPartyId: 15, superThirdPartyId: 100 }
  ]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalType, setUserModalType] = useState('add');
  const [editingUser, setEditingUser] = useState(null);

  // User management handlers
  const handleAddUser = (user) => {
    setUserList(prev => [
      { ...user, id: prev.length + 1, lastLogin: '-', exchanges: user.exchanges || [], status: user.status || 'Active' },
      ...prev
    ]);
    setShowUserModal(false);
    showSuccess('User added successfully!');
  };
  const handleEditUser = (user) => {
    setUserList(prev => prev.map(u => u.id === user.id ? { ...u, ...user } : u));
    setShowUserModal(false);
    showSuccess('User updated successfully!');
  };
  const handleDeactivateUser = (id) => {
    setUserList(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
    showSuccess('User status updated!');
  };
  const handleAdminAssignExchange = (user, exchangeId) => {
    setUserList(prev => prev.map(u => 
      u.id === user.id 
        ? { ...u, exchanges: [...new Set([...(u.exchanges || []), Number(exchangeId)])] } 
        : u
    ));
    setUserActionMenu(null);
    showSuccess('Exchange assigned!');
  };

  // Add user pin state
  const [userPins, setUserPins] = useState({
    admin: '1234',
    client: '5678',
    sarah: '4321',
    david: '8765',
    maria: '2468',
    mike: '1357',
    'agency-admin': '9999'
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePin, setProfilePin] = useState('');
  const [showWireModal, setShowWireModal] = useState(false);
  const [wireDocName, setWireDocName] = useState('');
  const [wirePinInput, setWirePinInput] = useState('');
  const [wirePinError, setWirePinError] = useState('');

  // Add user details to userPins state for demo
  const [userProfiles, setUserProfiles] = useState({
    admin: { name: 'Peak 1031 Staff', email: 'admin@peak1031.com', role: 'Exchange Coordinator', pin: '1234' },
    client: { name: 'Johnson Family Trust', email: 'johnson@email.com', role: 'Client', pin: '5678' },
    sarah: { name: 'Sarah Johnson', email: 'sarah.johnson@agency.com', role: 'Real Estate Agent', pin: '4321' },
    david: { name: 'David Wilson', email: 'david.wilson@agency.com', role: 'Real Estate Agent', pin: '8765' },
    maria: { name: 'Maria Rodriguez', email: 'maria.rodriguez@agency.com', role: 'Real Estate Agent', pin: '2468' },
    mike: { name: 'Mike Chen', email: 'mike.chen@lawfirm.com', role: 'Attorney', pin: '1357' },
    'agency-admin': { name: 'Pacific Coast Realty', email: 'admin@pacificcoast.com', role: 'Agency Manager', pin: '9999' }
  });
  const [profileEdit, setProfileEdit] = useState({ name: '', email: '', pin: '', role: '' });

  // Handler to open profile modal
  const handleOpenProfile = () => {
    const profile = userProfiles[currentUser.id] || { name: '', email: '', role: '', pin: '' };
    setProfileEdit({ ...profile });
    setShowProfileModal(true);
  };
  const handleSaveProfile = () => {
    setUserProfiles(prev => ({ ...prev, [currentUser.id]: { ...profileEdit } }));
    setShowProfileModal(false);
    showSuccess('Profile updated!');
  };

  // Handler for wire doc view
  const handleWireView = (docName) => {
    setWireDocName(docName);
    setWirePinInput('');
    setWirePinError('');
    setShowWireModal(true);
  };
  const handleWirePinSubmit = (e) => {
    e.preventDefault();
    if (wirePinInput === (userPins[currentUser.id] || '')) {
      setWirePinError('');
      // Simulate showing the doc
      alert(`Showing: ${wireDocName}`);
      setShowWireModal(false);
    } else {
      setWirePinError('Incorrect pin.');
    }
  };

  // Set default selectedUser when Dashboard loads or userList changes
  useEffect(() => {
    if (!selectedUser && userList && userList.length > 0) {
      setSelectedUser(userList[0]);
    }
  }, [userList, selectedUser]);

  // In Peak1031Preview, add:
  const [exchangeSearch, setExchangeSearch] = useState('');
  const [exchangeStatusFilter, setExchangeStatusFilter] = useState('');
  const [exchangeMinValue, setExchangeMinValue] = useState('');
  const [exchangeMaxValue, setExchangeMaxValue] = useState('');

  // Add state and handlers at the top of the component:
  const [userActionMenu, setUserActionMenu] = useState(null);
  const handleSendLoginLink = user => { alert(`Login link sent to ${user.email}`); setUserActionMenu(null); };
  const handleSeeAudit = user => { alert(`Audit log for ${user.name}`); setUserActionMenu(null); };
  const handleChat = user => { alert(`Open chat with ${user.name}`); setUserActionMenu(null); };
  const handleDeactivate = user => { alert(`User ${user.name} deactivated`); setUserActionMenu(null); };
  const handleAdminAssignSuperThirdParty = (user, thirdPartyId) => { alert(`Assigned Super Third Party to ${user.name} (Third Party ID: ${thirdPartyId})`); setUserActionMenu(null); };
  
  // Interactive Timeline Functions
  const handleViewExchangeDetails = (exchange, role) => {
    if (role === 'Exchange Coordinator') {
      alert(`Admin: View Full Exchange Details for ${exchange.clientName}\n- Exchange ID: ${exchange.id}\n- Status: ${exchange.status}\n- Progress: ${exchange.progress}%\n- Value: ${exchange.value}\n- Active Tasks: ${exchange.activeTasks}`);
    } else if (role === 'Client') {
      alert(`Client: View My Exchange Details for ${exchange.clientName}\n- Your Exchange Progress: ${exchange.progress}%\n- Next Deadline: ${exchange.deadline45}\n- Documents Pending: 2\n- Payments Status: Up to date`);
    } else if (role === 'Real Estate Agent') {
      alert(`Exchange Broker: View Client Exchange for ${exchange.clientName}\n- Client: ${exchange.clientName}\n- Exchange Status: ${exchange.status}\n- Your Commission: $${Math.round(parseInt(exchange.value.replace(/[^0-9]/g, '')) * 0.02)}\n- Referral Status: Active`);
    } else if (role === 'Agency Manager') {
      alert(`Exchange Broker Manager: Manage Exchange for ${exchange.clientName}\n- Agent Performance: Excellent\n- Commission Reports: Available\n- Exchange Analytics: 95% success rate\n- Client Satisfaction: High`);
    } else if (role === 'Third Party') {
      alert(`Third Party: View Assigned Exchanges for ${exchange.clientName}\n- Service Status: Active\n- Billing Information: Current\n- Service Level: Premium\n- Next Review: ${exchange.deadline45}`);
    }
  };

  const handleManageParticipants = (exchange) => {
    setShowMemberModal(true);
    setSelectedExchange(exchange);
  };

  const handleCommissionStatus = (exchange, role) => {
    if (role === 'Real Estate Agent') {
      alert(`Commission Status for ${exchange.clientName}:\n- Total Commission: $${Math.round(parseInt(exchange.value.replace(/[^0-9]/g, '')) * 0.02)}\n- Paid: $${Math.round(parseInt(exchange.value.replace(/[^0-9]/g, '')) * 0.01)}\n- Pending: $${Math.round(parseInt(exchange.value.replace(/[^0-9]/g, '')) * 0.01)}\n- Payment Date: ${exchange.deadline45}`);
    } else if (role === 'Agency Manager') {
      alert(`Commission Reports for ${exchange.clientName}:\n- Agent Commission: $${Math.round(parseInt(exchange.value.replace(/[^0-9]/g, '')) * 0.02)}\n- Agency Fee: $${Math.round(parseInt(exchange.value.replace(/[^0-9]/g, '')) * 0.005)}\n- Net Commission: $${Math.round(parseInt(exchange.value.replace(/[^0-9]/g, '')) * 0.015)}\n- Payment Status: Scheduled`);
    }
  };

  const handlePaymentStatus = (exchange) => {
    alert(`Payment Status for ${exchange.clientName}:\n- Exchange Fee: $2,500 (Paid)\n- Document Fees: $500 (Paid)\n- Wire Fees: $150 (Pending)\n- Total Outstanding: $150\n- Due Date: ${exchange.deadline45}`);
  };

  const handleReferralStatus = (exchange) => {
    alert(`Referral Status for ${exchange.clientName}:\n- Referral Date: ${exchange.startDate}\n- Status: Active\n- Commission Rate: 2%\n- Total Value: ${exchange.value}\n- Success Rate: 95%`);
  };

  const handleServiceStatus = (exchange) => {
    alert(`Service Status for ${exchange.clientName}:\n- Service Level: Premium\n- Response Time: < 2 hours\n- Documents Processed: 15/18\n- Client Satisfaction: 5/5 stars\n- Next Review: ${exchange.deadline45}`);
  };

  const handleBillingInformation = (exchange) => {
    alert(`Billing Information for ${exchange.clientName}:\n- Service Fee: $1,200\n- Document Processing: $300\n- Wire Services: $150\n- Total Billed: $1,650\n- Payment Status: Current`);
  };

  const handleAgentPerformance = (exchange) => {
    alert(`Agent Performance for ${exchange.clientName}:\n- Exchange Success Rate: 95%\n- Client Satisfaction: 4.8/5\n- Average Completion Time: 45 days\n- Commission Earned: $${Math.round(parseInt(exchange.value.replace(/[^0-9]/g, '')) * 0.02)}\n- Referral Quality: Excellent`);
  };

  const handleExchangeAnalytics = (exchange) => {
    alert(`Exchange Analytics for ${exchange.clientName}:\n- Market Performance: +12%\n- Client Retention: 87%\n- Average Exchange Value: $2.1M\n- Success Rate: 94%\n- Revenue Growth: +18%`);
  };

  // Member Management Functions
  const handleAddMember = () => {
    if (newMemberEmail && newMemberRole) {
      const newMember = {
        id: Date.now(),
        name: newMemberEmail.split('@')[0],
        email: newMemberEmail,
        role: newMemberRole,
        avatar: newMemberEmail.split('@')[0].charAt(0).toUpperCase(),
        status: 'pending'
      };
      
      // Add to exchange participants
      if (selectedExchange) {
        const updatedParticipants = { ...exchangeParticipants };
        if (!updatedParticipants[selectedExchange.id]) {
          updatedParticipants[selectedExchange.id] = [];
        }
        updatedParticipants[selectedExchange.id].push(newMember);
        setExchangeParticipants(updatedParticipants);
      }
      
      alert(`Invitation sent to ${newMemberEmail} for role: ${newMemberRole}\nLogin link: https://peak1031.com/login?invite=${Date.now()}`);
      setNewMemberEmail('');
      setNewMemberRole('Client');
      setShowAddMemberModal(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    if (selectedExchange) {
      const updatedParticipants = { ...exchangeParticipants };
      if (updatedParticipants[selectedExchange.id]) {
        updatedParticipants[selectedExchange.id] = updatedParticipants[selectedExchange.id].filter(m => m.id !== memberId);
        setExchangeParticipants(updatedParticipants);
      }
    }
  };

  const handleViewUserProfile = (member) => {
    // Convert member to user format for the user management interface
    const userFromMember = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status || 'Active',
      exchanges: member.exchanges || [],
      marketingTags: member.marketingTags || []
    };
    
    // Set the selected user and open the profile drawer (same as user management)
    setSelectedUser(userFromMember);
    setShowProfileDrawer(true);
  };

  const handleDirectChat = (member) => {
    setSelectedUser(member);
    setActiveTab('messages');
    setSelectedExchange(selectedExchange);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white shadow border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                P
              </div>
              <h1 className="text-xl font-bold text-gray-900">Peak 1031</h1>
              <span className="text-sm text-gray-500">V1 Preview</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleOpenChat}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Messages</span>
              </button>
              <div className="relative notification-dropdown">
                <Bell 
                  className="w-6 h-6 text-gray-600 cursor-pointer hover:text-blue-600 transition-colors" 
                  onClick={handleNotificationClick}
                />
                {notifications > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {notifications}
                  </span>
                )}
                {showNotifications && (
                  <div className="absolute right-0 top-8 w-80 bg-white border rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Notifications</h3>
                        <button 
                          onClick={handleClearNotifications}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">New message from Sarah Johnson</p>
                            <p className="text-xs text-gray-600">2 minutes ago</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">Task completed: Review Purchase Agreement</p>
                            <p className="text-xs text-gray-600">5 minutes ago</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                          <div>
                            <p className="text-sm font-medium">PracticePanther sync completed</p>
                            <p className="text-xs text-gray-600">10 minutes ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <User className="w-6 h-6 text-gray-600" />
                <span className="text-sm text-gray-700">Admin User</span>
                <button className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded hover:bg-blue-100" onClick={handleOpenProfile}>Profile</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r min-h-screen">
          <nav className="p-4">
            <div className="space-y-2">
              <button
                onClick={() => setCurrentView('admin')}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  currentView === 'admin' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-3" />
                Admin Dashboard
              </button>
              <button
                onClick={() => setCurrentView('client')}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  currentView === 'client' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4 inline mr-3" />
                Client Portal
              </button>
              <button
                onClick={() => setCurrentView('super-third-party')}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  currentView === 'super-third-party' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4 inline mr-3" />
                Super Third Party
              </button>
              <button
                onClick={() => setCurrentView('third-party')}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  currentView === 'third-party' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4 inline mr-3" />
                Third Party Agent
              </button>
            </div>

            <div className="mt-8 pt-4 border-t">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Key Features Demo
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span>2FA Security</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MessageSquare className="w-4 h-4" />
                  <span>Secure Messaging</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>Document Management</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <RefreshCw className="w-4 h-4" />
                  <span>PracticePanther Sync</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Task Management</span>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {currentView === 'admin' && (
            <Dashboard
              exchanges={exchanges}
              messages={messages}
              currentUser={currentUser}
              exchangeParticipants={exchangeParticipants}
              onSendMessage={handleSendMessage}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              selectedExchange={selectedExchange}
              setSelectedExchange={setSelectedExchange}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tasks={tasks}
              handleTaskComplete={handleTaskComplete}
              auditLogs={auditLogs}
              handleUploadDocument={handleUploadDocument}
              syncStatus={syncStatus}
              handleSyncPP={handleSyncPP}
              documents={documents}
              showDocModal={showDocModal}
              setShowDocModal={setShowDocModal}
              docModalType={docModalType}
              setDocModalType={setDocModalType}
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              thirdParties={thirdParties}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              userExchangeAssignments={userExchangeAssignments}
              userList={userList}
              showUserModal={showUserModal}
              userModalType={userModalType}
              editingUser={editingUser}
              handleAddUser={handleAddUser}
              handleEditUser={handleEditUser}
              handleDeactivateUser={handleDeactivateUser}
              handleAdminAssignExchange={handleAdminAssignExchange}
              showSuccess={showSuccess}
              handleWireView={handleWireView}
              exchangeSearch={exchangeSearch}
              setExchangeSearch={setExchangeSearch}
              exchangeStatusFilter={exchangeStatusFilter}
              setExchangeStatusFilter={setExchangeStatusFilter}
              exchangeMinValue={exchangeMinValue}
              setExchangeMinValue={setExchangeMinValue}
              exchangeMaxValue={exchangeMaxValue}
              setExchangeMaxValue={setExchangeMaxValue}
              getUserExchanges={getUserExchanges}
              handleDirectChat={handleDirectChat}
              handlePaymentStatus={handlePaymentStatus}
              handleViewExchangeDetails={handleViewExchangeDetails}
              handleManageParticipants={handleManageParticipants}
              handleCommissionStatus={handleCommissionStatus}
              handleReferralStatus={handleReferralStatus}
              handleServiceStatus={handleServiceStatus}
              handleBillingInformation={handleBillingInformation}
              handleAgentPerformance={handleAgentPerformance}
              handleExchangeAnalytics={handleExchangeAnalytics}
              handleAddMember={handleAddMember}
              handleRemoveMember={handleRemoveMember}
              handleViewUserProfile={handleViewUserProfile}
            />
          )}
          {currentView === 'client' && (
            <Dashboard
              exchanges={getUserExchanges()}
              messages={messages}
              currentUser={currentUser}
              exchangeParticipants={exchangeParticipants}
              onSendMessage={handleSendMessage}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              selectedExchange={selectedExchange}
              setSelectedExchange={setSelectedExchange}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tasks={tasks}
              handleTaskComplete={handleTaskComplete}
              auditLogs={auditLogs}
              handleUploadDocument={handleUploadDocument}
              syncStatus={syncStatus}
              handleSyncPP={handleSyncPP}
              documents={documents}
              showDocModal={showDocModal}
              setShowDocModal={setShowDocModal}
              docModalType={docModalType}
              setDocModalType={setDocModalType}
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              thirdParties={thirdParties}
              handleWireView={handleWireView}
              userList={userList}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              exchangeSearch={exchangeSearch}
              setExchangeSearch={setExchangeSearch}
              exchangeStatusFilter={exchangeStatusFilter}
              setExchangeStatusFilter={setExchangeStatusFilter}
              exchangeMinValue={exchangeMinValue}
              setExchangeMinValue={setExchangeMinValue}
              exchangeMaxValue={exchangeMaxValue}
              setExchangeMaxValue={setExchangeMaxValue}
              getUserExchanges={getUserExchanges}
              handleDirectChat={handleDirectChat}
              handlePaymentStatus={handlePaymentStatus}
              handleViewExchangeDetails={handleViewExchangeDetails}
              handleManageParticipants={handleManageParticipants}
              handleCommissionStatus={handleCommissionStatus}
              handleReferralStatus={handleReferralStatus}
              handleServiceStatus={handleServiceStatus}
              handleBillingInformation={handleBillingInformation}
              handleAgentPerformance={handleAgentPerformance}
              handleExchangeAnalytics={handleExchangeAnalytics}
              handleAddMember={handleAddMember}
              handleRemoveMember={handleRemoveMember}
              handleViewUserProfile={handleViewUserProfile}
              setShowProfileDrawer={setShowProfileDrawer}
            />
          )}
          {currentView === 'super-third-party' && (
            <Dashboard
              exchanges={getUserExchanges()}
              messages={messages}
              currentUser={currentUser}
              exchangeParticipants={exchangeParticipants}
              onSendMessage={handleSendMessage}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              selectedExchange={selectedExchange}
              setSelectedExchange={setSelectedExchange}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tasks={tasks}
              handleTaskComplete={handleTaskComplete}
              auditLogs={auditLogs}
              handleUploadDocument={handleUploadDocument}
              syncStatus={syncStatus}
              handleSyncPP={handleSyncPP}
              documents={documents}
              showDocModal={showDocModal}
              setShowDocModal={setShowDocModal}
              docModalType={docModalType}
              setDocModalType={setDocModalType}
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              thirdParties={thirdParties}
              handleWireView={handleWireView}
              userList={userList}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              exchangeSearch={exchangeSearch}
              setExchangeSearch={setExchangeSearch}
              exchangeStatusFilter={exchangeStatusFilter}
              setExchangeStatusFilter={setExchangeStatusFilter}
              exchangeMinValue={exchangeMinValue}
              setExchangeMinValue={setExchangeMinValue}
              exchangeMaxValue={exchangeMaxValue}
              setExchangeMaxValue={setExchangeMaxValue}
              getUserExchanges={getUserExchanges}
              handleDirectChat={handleDirectChat}
              handlePaymentStatus={handlePaymentStatus}
              handleViewExchangeDetails={handleViewExchangeDetails}
              handleManageParticipants={handleManageParticipants}
              handleCommissionStatus={handleCommissionStatus}
              handleReferralStatus={handleReferralStatus}
              handleServiceStatus={handleServiceStatus}
              handleBillingInformation={handleBillingInformation}
              handleAgentPerformance={handleAgentPerformance}
              handleExchangeAnalytics={handleExchangeAnalytics}
              handleAddMember={handleAddMember}
              handleRemoveMember={handleRemoveMember}
              handleViewUserProfile={handleViewUserProfile}
              setShowProfileDrawer={setShowProfileDrawer}
            />
          )}
          {currentView === 'third-party' && (
            <Dashboard
              exchanges={getUserExchanges()}
              messages={messages}
              currentUser={currentUser}
              exchangeParticipants={exchangeParticipants}
              onSendMessage={handleSendMessage}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              selectedExchange={selectedExchange}
              setSelectedExchange={setSelectedExchange}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tasks={tasks}
              handleTaskComplete={handleTaskComplete}
              auditLogs={auditLogs}
              handleUploadDocument={handleUploadDocument}
              syncStatus={syncStatus}
              handleSyncPP={handleSyncPP}
              documents={documents}
              showDocModal={showDocModal}
              setShowDocModal={setShowDocModal}
              docModalType={docModalType}
              setDocModalType={setDocModalType}
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              thirdParties={thirdParties}
              handleWireView={handleWireView}
              userList={userList}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              exchangeSearch={exchangeSearch}
              setExchangeSearch={setExchangeSearch}
              exchangeStatusFilter={exchangeStatusFilter}
              setExchangeStatusFilter={setExchangeStatusFilter}
              exchangeMinValue={exchangeMinValue}
              setExchangeMinValue={setExchangeMinValue}
              exchangeMaxValue={exchangeMaxValue}
              setExchangeMaxValue={setExchangeMaxValue}
              getUserExchanges={getUserExchanges}
              handlePaymentStatus={handlePaymentStatus}
              handleViewExchangeDetails={handleViewExchangeDetails}
              handleManageParticipants={handleManageParticipants}
              handleCommissionStatus={handleCommissionStatus}
              handleReferralStatus={handleReferralStatus}
              handleServiceStatus={handleServiceStatus}
              handleBillingInformation={handleBillingInformation}
              handleAgentPerformance={handleAgentPerformance}
              handleExchangeAnalytics={handleExchangeAnalytics}
              handleAddMember={handleAddMember}
              handleRemoveMember={handleRemoveMember}
              handleViewUserProfile={handleViewUserProfile}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t p-4 text-center text-sm text-gray-600">
        <p>Peak 1031 V1 - Interactive System Preview | All features demonstrated with live UI components</p>
      </footer>

      {showWireModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xs relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowWireModal(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4 text-center">Enter Pin to View Wire Instructions</h3>
            <form onSubmit={handleWirePinSubmit} className="flex flex-col items-center">
              <div className="flex space-x-3 mb-4">
                {[0,1,2,3].map(i => (
                  <input
                    key={i}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    className="w-12 h-12 text-center text-2xl border rounded focus:ring-2 focus:ring-blue-500"
                    value={wirePinInput[i] || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (!val) return;
                      const arr = wirePinInput.split('');
                      arr[i] = val;
                      const newPin = arr.join('').slice(0, 4);
                      setWirePinInput(newPin);
                      // Auto-focus next
                      if (e.target.nextSibling) e.target.nextSibling.focus();
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !wirePinInput[i] && i > 0) {
                        const arr = wirePinInput.split('');
                        arr[i-1] = '';
                        setWirePinInput(arr.join(''));
                        if (e.target.previousSibling) e.target.previousSibling.focus();
                      }
                    }}
                  />
                ))}
              </div>
              {wirePinError && <div className="text-red-600 text-xs mb-2 text-center">{wirePinError}</div>}
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded mt-2 disabled:opacity-50" disabled={wirePinInput.length !== 4}>View Document</button>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xs relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowProfileModal(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4">Profile Settings</h3>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mb-3"
              value={profileEdit.name}
              onChange={e => setProfileEdit({ ...profileEdit, name: e.target.value })}
            />
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 mb-3"
              value={profileEdit.email}
              onChange={e => setProfileEdit({ ...profileEdit, email: e.target.value })}
            />
            <label className="block text-sm font-medium mb-1">Role</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mb-3 bg-gray-100 text-gray-500"
              value={profileEdit.role}
              readOnly
            />
            <label className="block text-sm font-medium mb-1">Wire Pin Code</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 mb-3"
              value={profileEdit.pin}
              onChange={e => setProfileEdit({ ...profileEdit, pin: e.target.value })}
            />
            <button className="w-full bg-blue-600 text-white py-2 rounded" onClick={handleSaveProfile}>Save Profile</button>
            <div className="mt-4 text-xs text-gray-400 text-center">Change Password (coming soon)</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Peak1031Preview;

function TimelinePerExchange({ selectedExchange, tasks, auditLogs, documents, exchangeParticipants, setActiveTab, setSelectedExchange, currentUser, setSelectedUser, setShowProfileDrawer, handleViewUserProfile, handleDirectChat, handleRemoveMember, setShowAddMemberModal }) {
  // --- FILTER/SEARCH STATE ---
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // --- EXCHANGE STAGE CALCULATION ---
  const getExchangeStage = (exchange) => {
    const today = new Date();
    const startDate = new Date(exchange.startDate);
    const deadline45 = new Date(exchange.deadline45);
    const deadline180 = new Date(exchange.deadline180);
    
    if (today < startDate) {
      return {
        stage: 'Before Initial',
        color: 'bg-gray-100 text-gray-800',
        borderColor: 'border-gray-300',
        progress: 0
      };
    } else if (today >= startDate && today <= deadline45) {
      const totalDays = (deadline45 - startDate) / (1000 * 60 * 60 * 24);
      const daysElapsed = (today - startDate) / (1000 * 60 * 60 * 24);
      const progress = Math.min((daysElapsed / totalDays) * 100, 100);
      return {
        stage: '45 Days',
        color: 'bg-yellow-100 text-yellow-800',
        borderColor: 'border-yellow-300',
        progress: Math.round(progress)
      };
    } else if (today > deadline45 && today <= deadline180) {
      const totalDays = (deadline180 - deadline45) / (1000 * 60 * 60 * 24);
      const daysElapsed = (today - deadline45) / (1000 * 60 * 60 * 24);
      const progress = Math.min((daysElapsed / totalDays) * 100, 100);
      return {
        stage: '180 Days',
        color: 'bg-orange-100 text-orange-800',
        borderColor: 'border-orange-300',
        progress: Math.round(progress)
      };
    } else {
      return {
        stage: 'Closeup',
        color: 'bg-green-100 text-green-800',
        borderColor: 'border-green-300',
        progress: 100
      };
    }
  };

  const exchangeStage = getExchangeStage(selectedExchange);
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  // --- HEADER SUMMARY ---
  const summary = (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-gradient-to-r from-blue-50 to-white rounded-2xl shadow p-8 border mb-8">
      <div>
        <h2 className="text-3xl font-extrabold mb-2 text-blue-900">{selectedExchange.clientName}</h2>
        
        <div className="flex flex-wrap gap-6 text-base text-gray-700 font-medium mb-4">
          <span>Status: <span className="font-semibold text-blue-700">{selectedExchange.status}</span></span>
          <span>Value: {selectedExchange.value}</span>
          <div className={`inline-flex items-center px-3 py-1 rounded-lg border ${exchangeStage.color} ${exchangeStage.borderColor}`}>
            <span className="text-sm font-semibold">{exchangeStage.stage}</span>
          </div>
        </div>
        
        {/* Unified Timeline with Today's Position */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Exchange Timeline</span>
            <span className="text-xs text-blue-600 font-medium">Today: {today}</span>
          </div>
          <div className="relative bg-gray-200 rounded-full h-4 mb-3">
            <div className={`h-4 rounded-full transition-all duration-300 ${exchangeStage.stage === 'Before Initial' ? 'bg-gray-400' : exchangeStage.stage === '45 Days' ? 'bg-yellow-400' : exchangeStage.stage === '180 Days' ? 'bg-orange-400' : 'bg-green-400'}`} 
                 style={{ width: `${exchangeStage.progress}%` }}></div>
            <div className="absolute top-0 w-2 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm" 
                 style={{ left: `${exchangeStage.progress}%`, transform: 'translateX(-50%)' }}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <div className="text-center">
              <div className="font-medium text-gray-800">Start</div>
              <div>{selectedExchange.startDate}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-yellow-700">45-day</div>
              <div>{selectedExchange.deadline45}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-700">180-day</div>
              <div>{selectedExchange.deadline180}</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center mb-2">
          <span className="inline-flex flex-col items-center bg-green-50 px-3 py-1 rounded-lg border border-green-200">
            <span className="text-xs text-green-700 font-semibold">Active Tasks</span>
            <span className="text-base font-bold text-green-800">{selectedExchange.activeTasks}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-6 text-base text-gray-700 font-medium">
          <span>Unread: {selectedExchange.unreadMessages}</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <svg width="72" height="72" className="mb-1">
          <circle cx="36" cy="36" r="32" fill="none" stroke="#e0e7ef" strokeWidth="8" />
          <circle cx="36" cy="36" r="32" fill="none" stroke="#2563eb" strokeWidth="8" strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - selectedExchange.progress / 100)} strokeLinecap="round" />
        </svg>
        <span className="text-xs text-gray-500">Progress</span>
        <span className="font-bold text-blue-700 text-lg">{selectedExchange.progress}%</span>
      </div>
      <button
        className="mt-4 md:mt-0 bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        onClick={() => {
          if (setActiveTab && setSelectedExchange) {
            setSelectedExchange(selectedExchange);
            setActiveTab('messages');
          }
        }}
      >
        Open Chat
      </button>
    </div>
  );

  // --- GATHER EVENTS ---
  const exchangeId = selectedExchange.id;
  let events = [];
  tasks.filter(t => t.exchangeId === exchangeId || !t.exchangeId).forEach(task => {
    events.push({
      type: 'task',
      date: task.dueDate,
      data: task,
      sortKey: new Date(task.dueDate).getTime() + 1
    });
  });
  documents.filter(doc => doc.exchangeId === exchangeId).forEach(doc => {
    events.push({
      type: 'document',
      date: doc.uploadedAt.split(' ')[0],
      data: doc,
      sortKey: new Date(doc.uploadedAt).getTime() + 2
    });
  });
  auditLogs.filter(log => log.details.includes(selectedExchange.clientName) || log.details.includes(selectedExchange.id)).forEach(log => {
    events.push({
      type: 'audit',
      date: log.timestamp.split(' ')[0],
      data: log,
      sortKey: new Date(log.timestamp).getTime()
    });
  });
  // --- FILTER/SEARCH ---
  if (filter !== 'all') events = events.filter(ev => ev.type === filter);
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    events = events.filter(ev =>
      (ev.type === 'task' && ev.data.title.toLowerCase().includes(s)) ||
      (ev.type === 'document' && ev.data.name.toLowerCase().includes(s)) ||
      (ev.type === 'audit' && ev.data.details.toLowerCase().includes(s))
    );
  }
  // --- SORT/GROUP ---
  events.sort((a, b) => b.sortKey - a.sortKey);
  const grouped = events.reduce((acc, ev) => {
    acc[ev.date] = acc[ev.date] || [];
    acc[ev.date].push(ev);
    return acc;
  }, {});
  const todayStr = new Date().toISOString().split('T')[0];
  const iconMap = {
    task: <CheckCircle className="w-5 h-5 text-green-600" />,
    document: <FileText className="w-5 h-5 text-purple-600" />,
    audit: <BarChart3 className="w-5 h-5 text-blue-600" />
  };
  const colorMap = {
    task: 'border-green-300 bg-green-50',
    document: 'border-purple-300 bg-purple-50',
    audit: 'border-blue-300 bg-blue-50'
  };
  const [expanded, setExpanded] = useState({});
  const toggleExpand = key => setExpanded(e => ({ ...e, [key]: !e[key] }));

  // --- ROLE-SPECIFIC ACTION MENU ---
  const roleActionMenu = (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions for {currentUser?.role}</h3>
      
      {/* Exchange Coordinator (Admin) Actions */}
      {currentUser?.role === 'Exchange Coordinator' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            onClick={() => handleViewExchangeDetails(selectedExchange, 'Exchange Coordinator')}
          >
            <Eye className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-800">View Details</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            onClick={() => handleManageParticipants(selectedExchange)}
          >
            <Users className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-800">Manage Team</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
            onClick={() => setActiveTab('documents')}
          >
            <FileText className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-800">Documents</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
            onClick={() => setActiveTab('audit-log')}
          >
            <BarChart3 className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-800">Audit Trail</span>
          </button>
        </div>
      )}
      
      {/* Client Actions */}
      {currentUser?.role === 'Client' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            onClick={() => handleViewExchangeDetails(selectedExchange, 'Client')}
          >
            <Eye className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-800">My Details</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            onClick={() => setActiveTab('messages')}
          >
            <MessageSquare className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-800">Contact</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
            onClick={() => setActiveTab('documents')}
          >
            <FileText className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-800">Documents</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
            onClick={() => setActiveTab('tasks')}
          >
            <CheckSquare className="w-6 h-6 text-yellow-600 mb-2" />
            <span className="text-sm font-medium text-yellow-800">Tasks</span>
          </button>
        </div>
      )}
      
      {/* Real Estate Agent (Exchange Broker) Actions */}
      {currentUser?.role === 'Real Estate Agent' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            onClick={() => handleViewExchangeDetails(selectedExchange, 'Real Estate Agent')}
          >
            <Eye className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-800">Client Exchange</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            onClick={() => setActiveTab('messages')}
          >
            <MessageSquare className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-800">Contact Client</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
            onClick={() => handleCommissionStatus(selectedExchange, 'Real Estate Agent')}
          >
            <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-800">Commission</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
            onClick={() => handleReferralStatus(selectedExchange)}
          >
            <Star className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-800">Referral</span>
          </button>
        </div>
      )}
      
      {/* Agency Manager (Exchange Broker Manager) Actions */}
      {currentUser?.role === 'Agency Manager' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            onClick={() => handleViewExchangeDetails(selectedExchange, 'Agency Manager')}
          >
            <Settings className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-800">Manage</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            onClick={() => handleAgentPerformance(selectedExchange)}
          >
            <BarChart3 className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-800">Performance</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
            onClick={() => handleCommissionStatus(selectedExchange, 'Agency Manager')}
          >
            <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-800">Reports</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
            onClick={() => handleExchangeAnalytics(selectedExchange)}
          >
            <BarChart3 className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-800">Analytics</span>
          </button>
        </div>
      )}
      
      {/* Third Party Actions */}
      {currentUser?.role === 'Third Party' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            onClick={() => handleViewExchangeDetails(selectedExchange, 'Third Party')}
          >
            <Eye className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-800">Assigned</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            onClick={() => handleServiceStatus(selectedExchange)}
          >
            <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-800">Service</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
            onClick={() => handleBillingInformation(selectedExchange)}
          >
            <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-800">Billing</span>
          </button>
          <button 
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
            onClick={() => setActiveTab('messages')}
          >
            <MessageSquare className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-800">Contact</span>
          </button>
        </div>
      )}
    </div>
  );

  // --- FILTER BAR ---
  const filterBar = (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div className="flex gap-2 items-center">
        <label className="font-semibold">Filter:</label>
        <button className={`px-3 py-1 rounded-full text-sm font-medium border ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`} onClick={() => setFilter('all')}>All</button>
        <button className={`px-3 py-1 rounded-full text-sm font-medium border ${filter === 'task' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`} onClick={() => setFilter('task')}>Tasks</button>
        <button className={`px-3 py-1 rounded-full text-sm font-medium border ${filter === 'document' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 border-purple-600'}`} onClick={() => setFilter('document')}>Documents</button>
        <button className={`px-3 py-1 rounded-full text-sm font-medium border ${filter === 'audit' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`} onClick={() => setFilter('audit')}>Audit</button>
      </div>
      <div className="flex gap-2 items-center">
        <input type="text" className="border rounded px-3 py-1 text-sm w-64" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
    </div>
  );

  // --- MAIN LAYOUT ---
  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="flex-1 min-w-0">
        {summary}
        {roleActionMenu}
        {filterBar}
        <div className="relative pl-10">
          <div className="absolute left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 to-blue-50 rounded-full"></div>
          {Object.keys(grouped).length === 0 && (
            <div className="text-gray-400 text-center py-12">No events found for this exchange.</div>
          )}
          {Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).map(date => (
            <div key={date} className="mb-10">
              <div className={`sticky top-0 z-10 mb-6 flex items-center gap-2 ${date === todayStr ? 'bg-yellow-100 text-yellow-900 px-3 py-1 rounded shadow font-bold' : 'bg-gray-100 text-gray-700 px-3 py-1 rounded'}`}>{date === todayStr ? 'Today' : new Date(date).toLocaleDateString()}</div>
              {grouped[date].map((ev, idx) => {
                const key = `${ev.type}-${ev.data.id || ev.data.timestamp}`;
                return (
                  <div key={key} className="relative mb-8 group">
                    {/* Timeline dot */}
                    <div className={`absolute -left-7 top-4 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-lg z-10 ${ev.type === 'task' ? 'bg-green-500' : ev.type === 'document' ? 'bg-purple-500' : 'bg-blue-500'}`}>{iconMap[ev.type]}</div>
                    {/* Card container */}
                    <div className={`ml-2 rounded-2xl shadow-lg border p-6 transition group-hover:shadow-2xl cursor-pointer ${colorMap[ev.type]} ${ev.type === 'task' && ev.data.status !== 'COMPLETED' && new Date(ev.data.dueDate) < new Date() ? 'border-red-500 bg-red-50 animate-pulse' : ''}`}
                      onClick={() => toggleExpand(key)}>
                      <div className="flex items-center gap-4 mb-2">
                        <span className={`font-semibold text-lg ${ev.type === 'task' ? 'text-green-800' : ev.type === 'document' ? 'text-purple-800' : 'text-blue-800'}`}>{ev.type === 'task' ? `Task: ${ev.data.title}` : ev.type === 'document' ? `Document: ${ev.data.name}` : ev.data.action.replace('_', ' ')}</span>
                        {ev.type === 'task' && <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-bold">{ev.data.status}</span>}
                        {ev.type === 'document' && <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 font-bold">Uploaded</span>}
                        {ev.type === 'audit' && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">Audit</span>}
                        <span className="text-xs text-gray-400 ml-auto">{ev.type === 'task' ? `Due: ${ev.data.dueDate}` : ev.type === 'document' ? `Uploaded: ${ev.data.uploadedAt}` : ev.data.timestamp.split(' ')[1]}</span>
                        {ev.type === 'task' && <span className="text-xs text-gray-400">Priority: {ev.data.priority}</span>}
                      </div>
                      <div className="text-base text-gray-800 mb-1">
                        {ev.type === 'task' && <>Assigned to: {ev.data.assignedTo}</>}
                        {ev.type === 'document' && <>Uploader: {ev.data.uploader}</>}
                        {ev.type === 'audit' && <>{ev.data.details}</>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {ev.type === 'task' && <span className={`px-2 py-1 rounded-full text-xs font-medium ${ev.data.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{ev.data.status}</span>}
                        {ev.type === 'document' && <span>Engagement: {ev.data.engagement.join(', ')}</span>}
                        {ev.type === 'audit' && <><span>By:</span><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">{ev.data.user.split(' ').map(n => n[0]).join('')}</span><span>{ev.data.user}</span><span className="ml-2">IP: {ev.data.ip}</span></>}
                      </div>
                      {/* Expandable details */}
                      <div className="mt-2 flex items-center justify-between">
                        <button className="text-xs text-blue-600 underline" onClick={e => { e.stopPropagation(); toggleExpand(key); }}>{expanded[key] ? 'Hide Details' : 'Show Details'}</button>
                        
                        {/* Role-specific action buttons */}
                        <div className="flex gap-1">
                          {/* Exchange Coordinator (Admin) Actions */}
                          {currentUser?.role === 'Exchange Coordinator' && (
                            <>
                              <button 
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleViewExchangeDetails(selectedExchange, 'Exchange Coordinator'); }}
                                title="View Full Exchange Details"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleManageParticipants(selectedExchange); }}
                                title="Manage Participants"
                              >
                                <Users className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                onClick={e => { e.stopPropagation(); setActiveTab('documents'); }}
                                title="Document Generation"
                              >
                                <FileText className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                                onClick={e => { e.stopPropagation(); setActiveTab('audit-log'); }}
                                title="Audit Trail"
                              >
                                <BarChart3 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          
                          {/* Client Actions */}
                          {currentUser?.role === 'Client' && (
                            <>
                              <button 
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleViewExchangeDetails(selectedExchange, 'Client'); }}
                                title="View My Exchange Details"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                onClick={e => { e.stopPropagation(); setActiveTab('messages'); }}
                                title="Contact Coordinator"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                onClick={e => { e.stopPropagation(); setActiveTab('documents'); }}
                                title="Document Status"
                              >
                                <FileText className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handlePaymentStatus(selectedExchange); }}
                                title="Payment Status"
                              >
                                <DollarSign className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          
                          {/* Real Estate Agent (Exchange Broker) Actions */}
                          {currentUser?.role === 'Real Estate Agent' && (
                            <>
                              <button 
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleViewExchangeDetails(selectedExchange, 'Real Estate Agent'); }}
                                title="View Client Exchange"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                onClick={e => { e.stopPropagation(); setActiveTab('messages'); }}
                                title="Contact Client"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleCommissionStatus(selectedExchange, 'Real Estate Agent'); }}
                                title="Commission Status"
                              >
                                <DollarSign className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleReferralStatus(selectedExchange); }}
                                title="Referral Status"
                              >
                                <Star className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          
                          {/* Agency Manager (Exchange Broker Manager) Actions */}
                          {currentUser?.role === 'Agency Manager' && (
                            <>
                              <button 
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleViewExchangeDetails(selectedExchange, 'Agency Manager'); }}
                                title="Manage Exchange"
                              >
                                <Settings className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleAgentPerformance(selectedExchange); }}
                                title="Agent Performance"
                              >
                                <BarChart3 className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleCommissionStatus(selectedExchange, 'Agency Manager'); }}
                                title="Commission Reports"
                              >
                                <DollarSign className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleExchangeAnalytics(selectedExchange); }}
                                title="Exchange Analytics"
                              >
                                <BarChart3 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          
                          {/* Third Party Actions */}
                          {currentUser?.role === 'Third Party' && (
                            <>
                              <button 
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleViewExchangeDetails(selectedExchange, 'Third Party'); }}
                                title="View Assigned Exchanges"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleServiceStatus(selectedExchange); }}
                                title="Service Status"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                              <button 
                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                onClick={e => { e.stopPropagation(); handleBillingInformation(selectedExchange); }}
                                title="Billing Information"
                              >
                                <DollarSign className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {expanded[key] && (
                        <div className="mt-3 text-sm text-gray-700 border-t pt-2">
                          {ev.type === 'task' && (
                            <>
                              <div><b>Task ID:</b> {ev.data.id}</div>
                              <div><b>Status:</b> {ev.data.status}</div>
                              <div><b>Assigned To:</b> {ev.data.assignedTo}</div>
                              <div><b>Priority:</b> {ev.data.priority}</div>
                            </>
                          )}
                          {ev.type === 'document' && (
                            <>
                              <div><b>Document ID:</b> {ev.data.id}</div>
                              <div><b>Uploader:</b> {ev.data.uploader}</div>
                              <div><b>Engagement:</b> {ev.data.engagement.join(', ')}</div>
                            </>
                          )}
                          {ev.type === 'audit' && (
                            <>
                              <div><b>Action:</b> {ev.data.action}</div>
                              <div><b>User:</b> {ev.data.user}</div>
                              <div><b>IP:</b> {ev.data.ip}</div>
                              <div><b>Details:</b> {ev.data.details}</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Members Panel */}
      <div className="w-full md:w-72 flex-shrink-0">
        <div className="bg-white rounded-xl shadow p-6 border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-blue-900">Members Involved</h3>
            {currentUser?.role === 'Exchange Coordinator' && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                title="Add Member"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <ul className="space-y-2">
            {exchangeParticipants[selectedExchange.id]?.map(member => (
              <li key={member.id} className="bg-blue-50 px-3 py-2 rounded-lg border text-sm flex items-center justify-between group hover:bg-blue-100 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 cursor-pointer hover:bg-blue-200 transition-colors" onClick={() => handleViewUserProfile(member)}>
                    {member.avatar}
                  </span>
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.role}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDirectChat(member)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded transition-colors"
                    title="Direct Chat"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleViewUserProfile(member)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded transition-colors"
                    title="View Profile"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  {currentUser?.role === 'Exchange Coordinator' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-200 rounded transition-colors"
                      title="Remove Member"
                    >
                      <User className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          
          {exchangeParticipants[selectedExchange.id]?.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No members assigned</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}