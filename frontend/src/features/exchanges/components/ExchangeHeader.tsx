import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, ChevronRight, UserCheck, UserPlus } from 'lucide-react';
import { EnterpriseExchange } from '../types';
import { User } from '../../../types';
import { canManageExchange, canAdvanceStage } from '../../../utils/permission.utils';

interface ExchangeHeaderProps {
  exchange: EnterpriseExchange;
  user: User | null;
  onViewDetails: () => void;
  onAdvanceStage: () => void;
  onShowParticipantsManager: () => void;
  onShowAddMemberModal: () => void;
  advancingStage: boolean;
}

export const ExchangeHeader: React.FC<ExchangeHeaderProps> = ({
  exchange,
  user,
  onViewDetails,
  onAdvanceStage,
  onShowParticipantsManager,
  onShowAddMemberModal,
  advancingStage
}) => {
  const navigate = useNavigate();
  const canManage = canManageExchange(user);
  const canAdvance = canAdvanceStage(user);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/exchanges')}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exchange.name}</h1>
          <p className="text-gray-600">Exchange Details</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button
          onClick={onViewDetails}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span>View Details</span>
        </button>
        
        {canManage && (
          <div className="flex items-center space-x-2">
            {exchange?.lifecycle_stage && exchange.lifecycle_stage !== 'COMPLETION' && canAdvance && (
              <button
                onClick={onAdvanceStage}
                disabled={advancingStage}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>{advancingStage ? 'Advancing...' : 'Advance Stage'}</span>
              </button>
            )}
            <button
              onClick={onShowParticipantsManager}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>Team Management</span>
            </button>
            <button
              onClick={onShowAddMemberModal}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};