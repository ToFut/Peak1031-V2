import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface ImportProgress {
  sync_id: string;
  sync_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  start_time: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  statistics: {
    total_records: number;
    progress_percentage: number;
    estimated_completion: string | null;
    current_page: number;
    metadata: {
      duplicateErrors: number;
      lastProcessedId: string | null;
    };
  };
}

export const PPImportProgress: React.FC = () => {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('practice_partner_syncs')
        .select('*')
        .eq('sync_id', 'continuous_contacts_import')
        .single();

      if (error) throw error;
      setProgress(data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="animate-spin text-blue-500" size={20} />;
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'paused':
        return <Clock className="text-yellow-500" size={20} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">PracticePanther Import</h3>
        <p className="text-gray-600">No import in progress</p>
      </div>
    );
  }

  const stats = progress.statistics;
  const percentage = stats.progress_percentage || 0;
  const elapsedTime = new Date().getTime() - new Date(progress.start_time).getTime();
  const rate = progress.records_processed / (elapsedTime / 1000);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">PracticePanther Import Progress</h3>
        {getStatusIcon(progress.status)}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{progress.records_processed.toLocaleString()} / {stats.total_records.toLocaleString()} contacts</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              progress.status === 'completed' ? 'bg-green-500' :
              progress.status === 'failed' ? 'bg-red-500' :
              progress.status === 'paused' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          >
            <div className="h-full bg-white opacity-25 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-green-600">
            {progress.records_created.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Created</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-blue-600">
            {progress.records_updated.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Updated</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-600">
            {progress.records_failed.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-yellow-600">
            {stats.metadata?.duplicateErrors || 0}
          </div>
          <div className="text-sm text-gray-600">Duplicates</div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className="font-medium capitalize">{progress.status}</span>
        </div>
        <div className="flex justify-between">
          <span>Started:</span>
          <span>{new Date(progress.start_time).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Elapsed Time:</span>
          <span>{formatTime(elapsedTime)}</span>
        </div>
        <div className="flex justify-between">
          <span>Processing Rate:</span>
          <span>{rate.toFixed(1)} contacts/sec</span>
        </div>
        {stats.estimated_completion && progress.status === 'running' && (
          <div className="flex justify-between">
            <span>Estimated Completion:</span>
            <span>{new Date(stats.estimated_completion).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {progress.status === 'running' && (
        <button
          className="mt-4 w-full py-2 px-4 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
          onClick={() => {
            // You would implement pause functionality here
            console.log('Pause import');
          }}
        >
          Pause Import
        </button>
      )}
      
      {progress.status === 'paused' && (
        <button
          className="mt-4 w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          onClick={() => {
            // You would implement resume functionality here
            console.log('Resume import');
          }}
        >
          Resume Import
        </button>
      )}
      
      {(progress.status === 'completed' || progress.status === 'failed') && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-center text-sm text-gray-600">
          Import {progress.status} • {progress.records_processed.toLocaleString()} contacts processed
        </div>
      )}
    </div>
  );
};