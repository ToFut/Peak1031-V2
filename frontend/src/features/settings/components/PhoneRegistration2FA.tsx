import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Shield, 
  Key, 
  Check, 
  X, 
  AlertTriangle, 
  RefreshCw,
  MessageSquare,
  Lock,
  Unlock,
  Bell,
  Settings,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import apiService from '../../../services/api';

interface PhoneRegistration2FAProps {
  onUpdate?: (phoneData: any) => void;
}

interface PhoneVerification {
  phone: string;
  isVerified: boolean;
  verificationCode?: string;
  expiresAt?: string;
}

interface TwoFactorSettings {
  enabled: boolean;
  method: 'sms' | 'app' | 'email';
  backupCodes?: string[];
  lastUsed?: string;
}

export const PhoneRegistration2FA: React.FC<PhoneRegistration2FAProps> = ({ onUpdate }) => {
  const { user, updateUser } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verification, setVerification] = useState<PhoneVerification | null>(null);
  const [twoFactorSettings, setTwoFactorSettings] = useState<TwoFactorSettings>({
    enabled: user?.two_fa_enabled || false,
    method: 'sms',
    backupCodes: [],
    lastUsed: undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUserSettings();
  }, [user?.id]);

  const loadUserSettings = async () => {
    try {
      const response = await apiService.get('/users/me/settings');
      if (response.data) {
        setTwoFactorSettings(prev => ({
          ...prev,
          enabled: response.data.two_fa_enabled || false,
          method: response.data.two_fa_method || 'sms',
          lastUsed: response.data.two_fa_last_used
        }));
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const handlePhoneUpdate = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update phone number
      const response = await apiService.put('/users/me', {
        phone: phoneNumber
      });

      if (response.success) {
        setSuccess('Phone number updated successfully');
        setIsEditing(false);
        
        // Update user context
        await updateUser({ ...user, phone: phoneNumber });
        onUpdate?.({ phone: phoneNumber });

        // Send verification code
        await sendVerificationCode();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update phone number');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/auth/send-verification-code', {
        phone: phoneNumber,
        type: 'phone_verification'
      });

      if (response.success) {
        setVerification({
          phone: phoneNumber,
          isVerified: false,
          expiresAt: response.data.expiresAt
        });
        setIsVerifying(true);
        setSuccess('Verification code sent to your phone');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneNumber = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/auth/verify-phone', {
        phone: phoneNumber,
        code: verificationCode
      });

      if (response.success) {
        setVerification(prev => prev ? { ...prev, isVerified: true } : null);
        setIsVerifying(false);
        setVerificationCode('');
        setSuccess('Phone number verified successfully!');
        
        // Update user context
        await updateUser({ ...user, phone: phoneNumber });
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const toggle2FA = async () => {
    if (!verification?.isVerified && !twoFactorSettings.enabled) {
      setError('Please verify your phone number first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/auth/toggle-2fa', {
        enabled: !twoFactorSettings.enabled,
        method: twoFactorSettings.method
      });

      if (response.success) {
        const newEnabled = !twoFactorSettings.enabled;
        setTwoFactorSettings(prev => ({
          ...prev,
          enabled: newEnabled,
          backupCodes: newEnabled ? response.data.backupCodes : []
        }));
        
        setSuccess(`Two-factor authentication ${newEnabled ? 'enabled' : 'disabled'} successfully`);
        
        // Update user context
        await updateUser({ ...user, two_fa_enabled: newEnabled });
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/auth/generate-backup-codes', {});
      
      if (response.success) {
        setTwoFactorSettings(prev => ({
          ...prev,
          backupCodes: response.data.backupCodes
        }));
        setSuccess('New backup codes generated successfully');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to generate backup codes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Smartphone className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Phone & Security Settings</h3>
          <p className="text-sm text-gray-600">Manage your phone number and two-factor authentication</p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800 text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Phone Number Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-gray-600" />
            Phone Number
          </h4>
          {verification?.isVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              <Check className="w-3 h-3" />
              Verified
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              maxLength={14}
            />
            <div className="flex gap-2">
              <button
                onClick={handlePhoneUpdate}
                disabled={loading || !validatePhoneNumber(phoneNumber)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Save & Verify
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setPhoneNumber(user?.phone || '');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-900">
              {phoneNumber ? formatPhoneNumber(phoneNumber) : 'No phone number set'}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Phone Verification Section */}
      {phoneNumber && !verification?.isVerified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-yellow-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Phone Verification Required
          </h4>

          {!isVerifying ? (
            <div className="space-y-3">
              <p className="text-yellow-800 text-sm">
                Your phone number needs to be verified before enabling two-factor authentication.
              </p>
              <button
                onClick={sendVerificationCode}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Send Verification Code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-yellow-800 text-sm">
                Enter the 6-digit code sent to {formatPhoneNumber(phoneNumber)}:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="px-3 py-2 border border-yellow-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 w-32"
                  maxLength={6}
                />
                <button
                  onClick={verifyPhoneNumber}
                  disabled={loading || verificationCode.length !== 6}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Verify
                </button>
                <button
                  onClick={sendVerificationCode}
                  disabled={loading}
                  className="px-4 py-2 border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-100"
                >
                  Resend
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two-Factor Authentication Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            Two-Factor Authentication
            {twoFactorSettings.enabled ? (
              <Lock className="w-4 h-4 text-green-600" />
            ) : (
              <Unlock className="w-4 h-4 text-gray-400" />
            )}
          </h4>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            twoFactorSettings.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {twoFactorSettings.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Add an extra layer of security to your account with two-factor authentication.
          </p>

          {/* 2FA Method Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Authentication Method:</label>
            <select
              value={twoFactorSettings.method}
              onChange={(e) => setTwoFactorSettings(prev => ({ ...prev, method: e.target.value as 'sms' | 'app' | 'email' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={twoFactorSettings.enabled}
            >
              <option value="sms">SMS Text Message</option>
              <option value="email">Email</option>
              <option value="app">Authenticator App (Coming Soon)</option>
            </select>
          </div>

          {/* Enable/Disable Button */}
          <button
            onClick={toggle2FA}
            disabled={loading || (!verification?.isVerified && !twoFactorSettings.enabled)}
            className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 ${
              twoFactorSettings.enabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:bg-gray-400`}
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {twoFactorSettings.enabled ? 'Disable' : 'Enable'} 2FA
          </button>

          {/* Last Used */}
          {twoFactorSettings.lastUsed && (
            <p className="text-xs text-gray-500">
              Last used: {new Date(twoFactorSettings.lastUsed).toLocaleDateString('en-US')}
            </p>
          )}
        </div>
      </div>

      {/* Backup Codes Section */}
      {twoFactorSettings.enabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-600" />
              Backup Codes
            </h4>
            <button
              onClick={generateBackupCodes}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
              Generate New Codes
            </button>
          </div>

          {twoFactorSettings.backupCodes && twoFactorSettings.backupCodes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Save these backup codes in a secure location. Each code can only be used once:
              </p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-white border border-gray-300 rounded p-3">
                {twoFactorSettings.backupCodes.map((code, index) => (
                  <span key={index} className="text-gray-900">{code}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Backup codes will be generated when you enable 2FA or click "Generate New Codes".
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PhoneRegistration2FA;