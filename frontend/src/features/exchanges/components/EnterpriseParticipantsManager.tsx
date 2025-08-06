import React from 'react';

interface EnterpriseParticipantsManagerProps {
  exchangeId: string;
  isOpen: boolean;
  onClose: () => void;
  onParticipantsChange: () => void;
}

const EnterpriseParticipantsManager: React.FC<EnterpriseParticipantsManagerProps> = ({
  exchangeId,
  isOpen,
  onClose,
  onParticipantsChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-lg">
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Enterprise Participants Manager
            </h3>
            <p className="text-gray-600 mb-4">
              Managing participants for exchange: {exchangeId}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onParticipantsChange();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseParticipantsManager; 