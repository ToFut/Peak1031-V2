import React, { useState, useEffect } from 'react';
import { roleBasedApiService } from '../../../services/roleBasedApiService';
import { useAuth } from '../../../hooks/useAuth';

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    // Only load contacts if user is authenticated
    if (user) {
    loadContacts();
    }
  }, [filter, user]);

  const loadContacts = async () => {
    if (!user) return;
    
    try {
    setLoading(true);
    setError(null);
    
    const response = await roleBasedApiService.getContacts({
      userContext: {
        id: user.id,
        email: user.email,
        role: user.role as any,
        company: user.company || ''
      }
    });
    const contactsData = response.contacts || [];
    setContacts(Array.isArray(contactsData) ? contactsData : []);
    
    // Show message if using fallback data
    if (contactsData.some((c: any) => c._isFallback)) {
      setError('Using cached data - backend connection unavailable');
    }
    } catch (err: any) {
    console.error('Error loading contacts:', err);
    setError(err.message || 'Failed to load contacts');
    } finally {
    setLoading(false);
    }
  };

  // Filter contacts based on search and filter
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchTerm || 
    contact.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
    (filter === 'active' && contact.status === 'active') ||
    (filter === 'inactive' && contact.status !== 'active');
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
    
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    
    );
  }

  if (error && !error.includes('cached')) {
    return (
    
      <div className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Contacts</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadContacts}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    
    );
  }

  return (
    
    <div className="p-6">
      {/* Warning for cached data */}
      {error && error.includes('cached') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">{filteredContacts.length} contacts</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contacts..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Contacts</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Grid */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Contacts Found</h3>
          <p className="text-gray-500">
            {searchTerm || filter !== 'all' 
              ? "No contacts match your current filters."
              : "No contacts have been created yet."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {contact.firstName?.[0]}{contact.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">{contact.email}</p>
                  {contact.company && (
                    <p className="text-sm text-gray-500 truncate">{contact.company}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  contact.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {contact.status || 'active'}
                </span>
                
                {contact.phone && (
                  <span className="text-sm text-gray-500">{contact.phone}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    
  );
};

export default Contacts;