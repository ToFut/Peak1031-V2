import React, { useState, useEffect } from 'react';
import Layout from '@/shared/ui/organisms/Layout';
import { roleBasedApiService } from '@/shared/services/roleBasedApiService';
import { useAuth } from '@/shared/hooks/useAuth';

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

  const filteredContacts = contacts.filter(contact =>
    contact.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'client': return 'bg-blue-100 text-blue-800';
      case 'attorney': return 'bg-purple-100 text-purple-800';
      case 'intermediary': return 'bg-green-100 text-green-800';
      case 'qi': return 'bg-yellow-100 text-yellow-800';
      case 'accommodator': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-20"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          {(user?.role === 'admin' || user?.role === 'coordinator') && (
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Add Contact
            </button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="client">Client</option>
            <option value="attorney">Attorney</option>
            <option value="intermediary">Intermediary</option>
            <option value="qi">QI</option>
            <option value="accommodator">Accommodator</option>
          </select>
        </div>

        {error && (
          <div className={`border rounded-lg p-4 ${
            error.includes('cached') 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`mb-2 ${
              error.includes('cached') ? 'text-yellow-600' : 'text-red-600'
            }`}>{error}</p>
            <button
              onClick={loadContacts}
              className={`px-4 py-2 rounded-md text-white ${
                error.includes('cached') 
                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Refresh
            </button>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredContacts.map((contact) => (
              <li key={contact.id}>
                <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getContactTypeColor(contact.contactType)}`}>
                            {contact.contactType || 'Contact'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <p>{contact.email}</p>
                        {contact.phone && <p>{contact.phone}</p>}
                        {contact.company && <p>{contact.company}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                      View
                    </button>
                    {(user?.role === 'admin' || user?.role === 'coordinator') && (
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {filteredContacts.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new contact.'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Contacts;