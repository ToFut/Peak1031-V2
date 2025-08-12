/**
 * Agency Form Component
 * Create or edit agency with user account creation
 */

import React, { useState, useEffect } from 'react';
import { CreateAgencyRequest, Agency } from '../../../services/agencyApi';
import { validateAgencyForm, AgencyFormData, AgencyFormErrors } from '../../../utils/agencyUtils';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AgencyFormProps {
  agency?: Agency | null;
  onSubmit: (data: CreateAgencyRequest | Partial<Agency>) => Promise<void>;
  onClose: () => void;
}

const AgencyForm: React.FC<AgencyFormProps> = ({ agency, onSubmit, onClose }) => {
  const [formData, setFormData] = useState<AgencyFormData>({
    first_name: '',
    last_name: '',
    display_name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    createUser: false,
    userEmail: '',
    userPassword: ''
  });

  const [errors, setErrors] = useState<AgencyFormErrors>({});
  const [loading, setLoading] = useState(false);

  // Load agency data if editing
  useEffect(() => {
    if (agency) {
      setFormData({
        first_name: agency.first_name || '',
        last_name: agency.last_name || '',
        display_name: agency.display_name || '',
        email: agency.email || '',
        company: agency.company || '',
        phone: agency.phone_primary || '',
        address: agency.address || '',
        city: agency.city || '',
        state: agency.state || '',
        zip: agency.zip || '',
        createUser: false,
        userEmail: '',
        userPassword: ''
      });
    }
  }, [agency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateAgencyForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      if (agency) {
        // Update existing agency
        await onSubmit({
          first_name: formData.first_name,
          last_name: formData.last_name,
          display_name: formData.display_name,
          email: formData.email,
          company: formData.company,
          phone_primary: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip
        });
      } else {
        // Create new agency
        const request: CreateAgencyRequest = {
          agencyData: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            display_name: formData.display_name,
            email: formData.email,
            company: formData.company,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip: formData.zip
          }
        };

        if (formData.createUser) {
          request.userData = {
            email: formData.userEmail!,
            first_name: formData.first_name,
            last_name: formData.last_name,
            password: formData.userPassword
          };
        }

        await onSubmit(request);
      }
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {agency ? 'Edit Agency' : 'Create New Agency'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Agency Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Agency Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.first_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.last_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="Optional display name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Address Section */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select State</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.zip ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.zip && (
                  <p className="mt-1 text-xs text-red-600">{errors.zip}</p>
                )}
              </div>
            </div>
          </div>

          {/* User Account Section (only for new agencies) */}
          {!agency && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="createUser"
                  name="createUser"
                  checked={formData.createUser}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="createUser" className="ml-2 text-sm font-medium text-gray-700">
                  Create user account for this agency
                </label>
              </div>

              {formData.createUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User Email *
                    </label>
                    <input
                      type="email"
                      name="userEmail"
                      value={formData.userEmail}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.userEmail ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.userEmail && (
                      <p className="mt-1 text-xs text-red-600">{errors.userEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="userPassword"
                      value={formData.userPassword}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.userPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.userPassword && (
                      <p className="mt-1 text-xs text-red-600">{errors.userPassword}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : (agency ? 'Update Agency' : 'Create Agency')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// US States for dropdown
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

export default AgencyForm;