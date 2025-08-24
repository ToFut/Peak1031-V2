import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Layout from '../../../components/Layout';
import {
  Save,
  ArrowLeft,
  User,
  Building,
  DollarSign,
  Calendar,
  MapPin,
  FileText,
  Phone,
  Mail,
  CreditCard,
  Briefcase,
  Home,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface ExchangeFormData {
  // Basic Exchange Information
  exchangeName: string;
  exchangeType: 'LIKE_KIND' | 'REVERSE' | 'BUILD_TO_SUIT' | 'CONSTRUCTION';
  status: 'PENDING' | 'DRAFT' | '45D' | '180D' | 'COMPLETED';
  exchangeValue: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  
  // Client Information
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  
  // Relinquished Property
  relinquishedAddress: string;
  relinquishedCity: string;
  relinquishedState: string;
  relinquishedZip: string;
  relinquishedValue: string;
  relinquishedLoanAmount: string;
  relinquishedEquity: string;
  
  // Replacement Property
  replacementAddress: string;
  replacementCity: string;
  replacementState: string;
  replacementZip: string;
  replacementValue: string;
  replacementLoanAmount: string;
  
  // Timeline
  identificationDeadline: string;
  completionDeadline: string;
  
  // Financial Details
  proceedsAmount: string;
  bootReceived: string;
  bootPaid: string;
  
  // Professional Contacts
  escrowOfficerName: string;
  escrowOfficerEmail: string;
  escrowOfficerPhone: string;
  escrowCompany: string;
  
  attorneyName: string;
  attorneyEmail: string;
  attorneyPhone: string;
  
  realtorName: string;
  realtorEmail: string;
  realtorPhone: string;
  
  // Notes and Tags
  clientNotes: string;
  internalNotes: string;
  tags: string;
  
  // Coordinator Assignment
  coordinatorId: string;
}

const EMPTY_FORM: ExchangeFormData = {
  exchangeName: '',
  exchangeType: 'LIKE_KIND',
  status: 'DRAFT',
  exchangeValue: '',
  priority: 'MEDIUM',
  clientFirstName: '',
  clientLastName: '',
  clientEmail: '',
  clientPhone: '',
  clientAddress: '',
  clientCity: '',
  clientState: '',
  clientZip: '',
  relinquishedAddress: '',
  relinquishedCity: '',
  relinquishedState: '',
  relinquishedZip: '',
  relinquishedValue: '',
  relinquishedLoanAmount: '',
  relinquishedEquity: '',
  replacementAddress: '',
  replacementCity: '',
  replacementState: '',
  replacementZip: '',
  replacementValue: '',
  replacementLoanAmount: '',
  identificationDeadline: '',
  completionDeadline: '',
  proceedsAmount: '',
  bootReceived: '',
  bootPaid: '',
  escrowOfficerName: '',
  escrowOfficerEmail: '',
  escrowOfficerPhone: '',
  escrowCompany: '',
  attorneyName: '',
  attorneyEmail: '',
  attorneyPhone: '',
  realtorName: '',
  realtorEmail: '',
  realtorPhone: '',
  clientNotes: '',
  internalNotes: '',
  tags: '',
  coordinatorId: ''
};

export const ExchangeCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<ExchangeFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'client' | 'properties' | 'financial' | 'contacts' | 'notes'>('basic');

  // Auto-calculate identification deadline (45 days from creation)
  const calculateDeadlines = useCallback(() => {
    const now = new Date();
    const id45 = new Date(now);
    id45.setDate(now.getDate() + 45);
    const completion180 = new Date(now);
    completion180.setDate(now.getDate() + 180);
    
    setFormData(prev => ({
      ...prev,
      identificationDeadline: id45.toISOString().split('T')[0],
      completionDeadline: completion180.toISOString().split('T')[0]
    }));
  }, []);

  // Auto-calculate equity
  const calculateEquity = useCallback(() => {
    const value = parseFloat(formData.relinquishedValue) || 0;
    const loan = parseFloat(formData.relinquishedLoanAmount) || 0;
    const equity = value - loan;
    setFormData(prev => ({
      ...prev,
      relinquishedEquity: equity.toString()
    }));
  }, [formData.relinquishedValue, formData.relinquishedLoanAmount]);

  React.useEffect(() => {
    calculateEquity();
  }, [calculateEquity]);

  React.useEffect(() => {
    if (!formData.identificationDeadline && !formData.completionDeadline) {
      calculateDeadlines();
    }
  }, [formData.identificationDeadline, formData.completionDeadline, calculateDeadlines]);

  const handleInputChange = (field: keyof ExchangeFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.exchangeName.trim()) newErrors.exchangeName = 'Exchange name is required';
    if (!formData.clientFirstName.trim()) newErrors.clientFirstName = 'Client first name is required';
    if (!formData.clientLastName.trim()) newErrors.clientLastName = 'Client last name is required';
    if (!formData.clientEmail.trim()) newErrors.clientEmail = 'Client email is required';
    if (!formData.relinquishedAddress.trim()) newErrors.relinquishedAddress = 'Relinquished property address is required';
    if (!formData.exchangeValue.trim()) newErrors.exchangeValue = 'Exchange value is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.clientEmail && !emailRegex.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
    }

    // Phone validation (basic)
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    if (formData.clientPhone && !phoneRegex.test(formData.clientPhone)) {
      newErrors.clientPhone = 'Please enter a valid phone number';
    }

    // Value validation
    if (formData.exchangeValue && isNaN(parseFloat(formData.exchangeValue))) {
      newErrors.exchangeValue = 'Exchange value must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Format data for API
      const exchangeData = {
        name: formData.exchangeName,
        exchangeNumber: `EX-${Date.now()}`, // Generate exchange number
        exchangeType: formData.exchangeType,
        status: formData.status,
        exchangeValue: parseFloat(formData.exchangeValue),
        priority: formData.priority,
        
        // Client info
        client: {
          firstName: formData.clientFirstName,
          lastName: formData.clientLastName,
          email: formData.clientEmail,
          phone: formData.clientPhone,
          address: {
            street: formData.clientAddress,
            city: formData.clientCity,
            state: formData.clientState,
            zip: formData.clientZip
          }
        },
        
        // Properties
        relinquishedProperty: {
          address: formData.relinquishedAddress,
          city: formData.relinquishedCity,
          state: formData.relinquishedState,
          zip: formData.relinquishedZip,
          value: parseFloat(formData.relinquishedValue) || 0,
          loanAmount: parseFloat(formData.relinquishedLoanAmount) || 0,
          equity: parseFloat(formData.relinquishedEquity) || 0
        },
        
        replacementProperty: {
          address: formData.replacementAddress,
          city: formData.replacementCity,
          state: formData.replacementState,
          zip: formData.replacementZip,
          value: parseFloat(formData.replacementValue) || 0,
          loanAmount: parseFloat(formData.replacementLoanAmount) || 0
        },
        
        // Deadlines
        identificationDeadline: formData.identificationDeadline,
        completionDeadline: formData.completionDeadline,
        
        // Financial
        proceedsAmount: parseFloat(formData.proceedsAmount) || 0,
        bootReceived: parseFloat(formData.bootReceived) || 0,
        bootPaid: parseFloat(formData.bootPaid) || 0,
        
        // Professional contacts
        professionals: {
          escrowOfficer: {
            name: formData.escrowOfficerName,
            email: formData.escrowOfficerEmail,
            phone: formData.escrowOfficerPhone,
            company: formData.escrowCompany
          },
          attorney: {
            name: formData.attorneyName,
            email: formData.attorneyEmail,
            phone: formData.attorneyPhone
          },
          realtor: {
            name: formData.realtorName,
            email: formData.realtorEmail,
            phone: formData.realtorPhone
          }
        },
        
        // Notes and metadata
        clientNotes: formData.clientNotes,
        internalNotes: formData.internalNotes,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        coordinatorId: formData.coordinatorId || user?.id,
        createdBy: user?.id,
        manuallyCreated: true
      };

      const response = await fetch('/api/exchanges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(exchangeData)
      });

      if (response.ok) {
        const newExchange = await response.json();
        navigate(`/exchanges/${newExchange.id}`, {
          state: { message: 'Exchange created successfully!' }
        });
      } else {
        const error = await response.text();
        throw new Error(error || 'Failed to create exchange');
      }
    } catch (error) {
      console.error('Error creating exchange:', error);
      alert('Failed to create exchange. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'client', label: 'Client', icon: User },
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'contacts', label: 'Professionals', icon: Briefcase },
    { id: 'notes', label: 'Notes & Tags', icon: FileText }
  ] as const;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/exchanges')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Exchanges
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Exchange</h1>
              <p className="text-gray-600">Fill out the form below to manually create a new 1031 exchange</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-lg shadow border p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Basic Exchange Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exchange Name *
                    </label>
                    <input
                      type="text"
                      value={formData.exchangeName}
                      onChange={(e) => handleInputChange('exchangeName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.exchangeName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter exchange name"
                    />
                    {errors.exchangeName && (
                      <p className="mt-1 text-sm text-red-600">{errors.exchangeName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exchange Type
                    </label>
                    <select
                      value={formData.exchangeType}
                      onChange={(e) => handleInputChange('exchangeType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LIKE_KIND">Like-Kind Exchange</option>
                      <option value="REVERSE">Reverse Exchange</option>
                      <option value="BUILD_TO_SUIT">Build-to-Suit</option>
                      <option value="CONSTRUCTION">Construction Exchange</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exchange Value *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={formData.exchangeValue}
                        onChange={(e) => handleInputChange('exchangeValue', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.exchangeValue ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                    </div>
                    {errors.exchangeValue && (
                      <p className="mt-1 text-sm text-red-600">{errors.exchangeValue}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING">Pending</option>
                      <option value="45D">45-Day Period</option>
                      <option value="180D">180-Day Period</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'client' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.clientFirstName}
                      onChange={(e) => handleInputChange('clientFirstName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientFirstName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="John"
                    />
                    {errors.clientFirstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.clientFirstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.clientLastName}
                      onChange={(e) => handleInputChange('clientLastName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientLastName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Doe"
                    />
                    {errors.clientLastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.clientLastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.clientEmail ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="john@example.com"
                      />
                    </div>
                    {errors.clientEmail && (
                      <p className="mt-1 text-sm text-red-600">{errors.clientEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.clientPhone}
                        onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.clientPhone ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    {errors.clientPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.clientPhone}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.clientAddress}
                        onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123 Main Street"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.clientCity}
                      onChange={(e) => handleInputChange('clientCity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Los Angeles"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.clientState}
                      onChange={(e) => handleInputChange('clientState', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="CA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.clientZip}
                      onChange={(e) => handleInputChange('clientZip', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="90210"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="space-y-8">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Property Information
                </h3>

                {/* Relinquished Property */}
                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <h4 className="text-md font-medium text-red-800 mb-4">Relinquished Property (Selling)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={formData.relinquishedAddress}
                        onChange={(e) => handleInputChange('relinquishedAddress', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.relinquishedAddress ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="123 Property Street"
                      />
                      {errors.relinquishedAddress && (
                        <p className="mt-1 text-sm text-red-600">{errors.relinquishedAddress}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.relinquishedCity}
                        onChange={(e) => handleInputChange('relinquishedCity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.relinquishedState}
                        onChange={(e) => handleInputChange('relinquishedState', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="CA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={formData.relinquishedZip}
                        onChange={(e) => handleInputChange('relinquishedZip', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="90210"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Value
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.relinquishedValue}
                          onChange={(e) => handleInputChange('relinquishedValue', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Amount
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.relinquishedLoanAmount}
                          onChange={(e) => handleInputChange('relinquishedLoanAmount', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Equity (Calculated)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.relinquishedEquity}
                          readOnly
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replacement Property */}
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h4 className="text-md font-medium text-green-800 mb-4">Replacement Property (Buying)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.replacementAddress}
                        onChange={(e) => handleInputChange('replacementAddress', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="456 New Property Avenue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.replacementCity}
                        onChange={(e) => handleInputChange('replacementCity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.replacementState}
                        onChange={(e) => handleInputChange('replacementState', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="CA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={formData.replacementZip}
                        onChange={(e) => handleInputChange('replacementZip', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="90210"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Value
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.replacementValue}
                          onChange={(e) => handleInputChange('replacementValue', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Amount
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.replacementLoanAmount}
                          onChange={(e) => handleInputChange('replacementLoanAmount', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="text-md font-medium text-blue-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Important Deadlines
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        45-Day Identification Deadline
                      </label>
                      <input
                        type="date"
                        value={formData.identificationDeadline}
                        onChange={(e) => handleInputChange('identificationDeadline', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        180-Day Completion Deadline
                      </label>
                      <input
                        type="date"
                        value={formData.completionDeadline}
                        onChange={(e) => handleInputChange('completionDeadline', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proceeds Amount
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={formData.proceedsAmount}
                        onChange={(e) => handleInputChange('proceedsAmount', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Boot Received
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={formData.bootReceived}
                        onChange={(e) => handleInputChange('bootReceived', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Boot Paid
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={formData.bootPaid}
                        onChange={(e) => handleInputChange('bootPaid', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="space-y-8">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Professional Contacts
                </h3>

                {/* Escrow Officer */}
                <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                  <h4 className="text-md font-medium text-purple-800 mb-4">Escrow Officer</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.escrowOfficerName}
                        onChange={(e) => handleInputChange('escrowOfficerName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Smith"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={formData.escrowCompany}
                        onChange={(e) => handleInputChange('escrowCompany', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ABC Escrow Company"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.escrowOfficerEmail}
                        onChange={(e) => handleInputChange('escrowOfficerEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="john@abcescrow.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.escrowOfficerPhone}
                        onChange={(e) => handleInputChange('escrowOfficerPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>

                {/* Attorney */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="text-md font-medium text-blue-800 mb-4">Attorney</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.attorneyName}
                        onChange={(e) => handleInputChange('attorneyName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Jane Attorney"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.attorneyEmail}
                        onChange={(e) => handleInputChange('attorneyEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="jane@lawfirm.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.attorneyPhone}
                        onChange={(e) => handleInputChange('attorneyPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(555) 987-6543"
                      />
                    </div>
                  </div>
                </div>

                {/* Realtor */}
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h4 className="text-md font-medium text-green-800 mb-4">Realtor</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.realtorName}
                        onChange={(e) => handleInputChange('realtorName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Bob Realtor"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.realtorEmail}
                        onChange={(e) => handleInputChange('realtorEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="bob@realty.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.realtorPhone}
                        onChange={(e) => handleInputChange('realtorPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(555) 456-7890"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes & Tags
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Notes
                    </label>
                    <textarea
                      value={formData.clientNotes}
                      onChange={(e) => handleInputChange('clientNotes', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Notes visible to client..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Internal Notes
                    </label>
                    <textarea
                      value={formData.internalNotes}
                      onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Internal notes for staff only..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => handleInputChange('tags', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="urgent, commercial, repeat-client (comma separated)"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Separate tags with commas
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/exchanges')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>

            <div className="flex items-center gap-3">
              {/* Validation Summary */}
              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{Object.keys(errors).length} field(s) need attention</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex items-center gap-2 px-6 py-2 rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                  isSubmitting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Exchange
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ExchangeCreate;