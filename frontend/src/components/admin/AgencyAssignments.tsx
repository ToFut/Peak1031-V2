import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Assignment {
  id: string;
  agency_contact_id: string;
  third_party_contact_id: string;
  agency_name: string;
  agency_email: string;
  agency_company?: string;
  third_party_name: string;
  third_party_email: string;
  third_party_company?: string;
  assigned_by: string;
  assignment_date: string;
  can_view_performance: boolean;
  performance_score: number;
  created_at: string;
}

interface Contact {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  contact_type: string[];
}

const AgencyAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [agencies, setAgencies] = useState<Contact[]>([]);
  const [thirdParties, setThirdParties] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedThirdParty, setSelectedThirdParty] = useState('');
  const [canViewPerformance, setCanViewPerformance] = useState(true);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load assignments, agencies, and third parties in parallel
      const [assignmentsRes, agenciesRes, thirdPartiesRes] = await Promise.all([
        fetch('/api/agency/assignments', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/agency/contacts?type=agency', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/agency/contacts?type=third_party', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.data || []);
      }

      if (agenciesRes.ok) {
        const agenciesData = await agenciesRes.json();
        setAgencies(agenciesData.data || []);
      }

      if (thirdPartiesRes.ok) {
        const thirdPartiesData = await thirdPartiesRes.json();
        setThirdParties(thirdPartiesData.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignThirdParty = async () => {
    if (!selectedAgency || !selectedThirdParty) {
      alert('Please select both an agency and a third party');
      return;
    }

    try {
      const response = await fetch('/api/agency/assign-third-party', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agency_contact_id: selectedAgency,
          third_party_contact_id: selectedThirdParty,
          can_view_performance: canViewPerformance
        })
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedAgency('');
        setSelectedThirdParty('');
        setCanViewPerformance(true);
        loadData(); // Reload assignments
        alert('Third party assigned successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign third party');
      }
    } catch (error) {
      console.error('Error assigning third party:', error);
      alert('Failed to assign third party');
    }
  };

  const handleRemoveAssignment = async (assignment: Assignment) => {
    if (!window.confirm(`Remove assignment: ${assignment.third_party_name} from ${assignment.agency_name}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/agency/assign-third-party', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agency_contact_id: assignment.agency_contact_id,
          third_party_contact_id: assignment.third_party_contact_id
        })
      });

      if (response.ok) {
        loadData(); // Reload assignments
        alert('Assignment removed successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove assignment');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('Failed to remove assignment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Agency-Third Party Assignments</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage which third parties are assigned to which agencies for performance monitoring
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Assign Third Party
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-2xl font-bold text-gray-900">{agencies.length}</p>
                  <p className="text-sm text-gray-600">Total Agencies</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-2xl font-bold text-gray-900">{thirdParties.length}</p>
                  <p className="text-sm text-gray-600">Third Parties</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
                  <p className="text-sm text-gray-600">Active Assignments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Current Assignments</h2>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
            <p className="mt-1 text-sm text-gray-500">Start by assigning third parties to agencies.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Third Party
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.agency_name}
                        </div>
                        <div className="text-sm text-gray-500">{assignment.agency_email}</div>
                        {assignment.agency_company && (
                          <div className="text-xs text-gray-400">{assignment.agency_company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.third_party_name}
                        </div>
                        <div className="text-sm text-gray-500">{assignment.third_party_email}</div>
                        {assignment.third_party_company && (
                          <div className="text-xs text-gray-400">{assignment.third_party_company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {assignment.can_view_performance ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <span className="text-sm text-gray-900">
                          {assignment.can_view_performance ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        assignment.performance_score >= 80 ? 'bg-green-100 text-green-800' :
                        assignment.performance_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {assignment.performance_score}/100
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.assigned_by}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.assignment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveAssignment(assignment)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove assignment"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assign Third Party to Agency
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Agency
                  </label>
                  <select
                    value={selectedAgency}
                    onChange={(e) => setSelectedAgency(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose an agency...</option>
                    {agencies.map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {agency.display_name || `${agency.first_name} ${agency.last_name}`}
                        {agency.company && ` (${agency.company})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Third Party
                  </label>
                  <select
                    value={selectedThirdParty}
                    onChange={(e) => setSelectedThirdParty(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a third party...</option>
                    {thirdParties.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.display_name || `${tp.first_name} ${tp.last_name}`}
                        {tp.company && ` (${tp.company})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="canViewPerformance"
                    checked={canViewPerformance}
                    onChange={(e) => setCanViewPerformance(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="canViewPerformance" className="ml-2 text-sm text-gray-700">
                    Allow agency to view third party performance data
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignThirdParty}
                  disabled={!selectedAgency || !selectedThirdParty}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyAssignments;