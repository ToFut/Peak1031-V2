/**
 * Interactive Task Completion Wizard
 * Guides users through completing tasks with smart suggestions and actions
 */

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  SparklesIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useEnhancedTasks } from '../../hooks/useEnhancedTasks';

interface TaskCompletionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  onTaskCompleted?: (task: any) => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  required?: boolean;
  completed?: boolean;
}

export const TaskCompletionWizard: React.FC<TaskCompletionWizardProps> = ({
  isOpen,
  onClose,
  task,
  onTaskCompleted
}) => {
  const { updateTask, getAutoCompleteActions, loading } = useEnhancedTasks();
  const [currentStep, setCurrentStep] = useState(0);
  const [completionData, setCompletionData] = useState<Record<string, any>>({});
  const [autoActions, setAutoActions] = useState<any[]>([]);

  // Define wizard steps based on task type and context
  const [steps, setSteps] = useState<WizardStep[]>([]);

  useEffect(() => {
    if (task) {
      generateWizardSteps();
      loadAutoActions();
    }
  }, [task]);

  const generateWizardSteps = () => {
    const baseSteps: WizardStep[] = [
      {
        id: 'review',
        title: 'Review Task',
        description: 'Review the task details and confirm completion criteria',
        component: ReviewStep,
        required: true
      },
      {
        id: 'execution',
        title: 'Complete Actions',
        description: 'Execute the required actions for this task',
        component: ExecutionStep,
        required: true
      },
      {
        id: 'verification',
        title: 'Verify Completion',
        description: 'Verify that all requirements have been met',
        component: VerificationStep,
        required: true
      },
      {
        id: 'documentation',
        title: 'Add Notes',
        description: 'Add completion notes and any relevant information',
        component: DocumentationStep
      }
    ];

    // Customize steps based on task category
    if (task.category === 'document' || task.metadata?.templateKey === 'document_upload') {
      baseSteps.splice(2, 0, {
        id: 'document_review',
        title: 'Document Review',
        description: 'Review and approve uploaded documents',
        component: DocumentReviewStep,
        required: true
      });
    }

    if (task.category === 'communication' || task.metadata?.templateKey === 'client_contact') {
      baseSteps.splice(2, 0, {
        id: 'communication',
        title: 'Record Communication',
        description: 'Log the communication details and outcome',
        component: CommunicationStep,
        required: true
      });
    }

    setSteps(baseSteps);
  };

  const loadAutoActions = async () => {
    if (task.id) {
      try {
        const result = await getAutoCompleteActions(task.id);
        if (result?.autoActions) {
          setAutoActions(result.autoActions);
        }
      } catch (error) {
        console.error('Error loading auto actions:', error);
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepData = (stepId: string, data: any) => {
    setCompletionData(prev => ({
      ...prev,
      [stepId]: data
    }));
  };

  const handleComplete = async () => {
    try {
      const updatedTask = await updateTask(task.id, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        completion_notes: completionData.documentation?.notes,
        metadata: {
          ...task.metadata,
          completion_data: completionData,
          completed_via: 'wizard'
        }
      });

      onTaskCompleted?.(updatedTask);
      onClose();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const canProceed = () => {
    const currentStepData = steps[currentStep];
    if (currentStepData?.required) {
      return completionData[currentStepData.id]?.completed;
    }
    return true;
  };

  if (!task) return null;

  const CurrentStepComponent = steps[currentStep]?.component;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <SparklesIcon className="h-6 w-6" />
                      <Dialog.Title className="text-lg font-semibold">
                        Task Completion Wizard
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="mt-2">
                    <h2 className="text-xl font-bold">{task.title}</h2>
                    <p className="text-blue-100 text-sm mt-1">{task.description}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-gray-50 px-6 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                  </div>
                  
                  {/* Step Indicators */}
                  <div className="flex justify-between mt-3">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            index <= currentStep
                              ? 'bg-blue-600'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className="text-xs text-gray-500 mt-1 text-center max-w-20">
                          {step.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step Content */}
                <div className="p-6">
                  {steps[currentStep] && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {steps[currentStep].title}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {steps[currentStep].description}
                      </p>
                    </div>
                  )}

                  {CurrentStepComponent && (
                    <CurrentStepComponent
                      task={task}
                      onStepData={(data: any) => handleStepData(steps[currentStep].id, data)}
                      stepData={completionData[steps[currentStep].id]}
                      autoActions={autoActions}
                    />
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                  <button
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  <div className="flex space-x-3">
                    {currentStep === steps.length - 1 ? (
                      <button
                        onClick={handleComplete}
                        disabled={loading || !canProceed()}
                        className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Complete Task</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Next</span>
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Step Components

const ReviewStep: React.FC<any> = ({ task, onStepData }) => {
  useEffect(() => {
    onStepData({ completed: true });
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Task Overview</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Priority:</span>
            <span className="ml-2 capitalize">{task.priority}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className="ml-2">{task.status}</span>
          </div>
          {task.due_date && (
            <div>
              <span className="font-medium text-gray-700">Due Date:</span>
              <span className="ml-2">{new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
          {task.assigned_to && (
            <div>
              <span className="font-medium text-gray-700">Assigned To:</span>
              <span className="ml-2">{task.assignedTo || 'Unknown'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center text-green-800">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">Ready to complete this task</span>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Review the task details above and proceed to complete the required actions.
        </p>
      </div>
    </div>
  );
};

const ExecutionStep: React.FC<any> = ({ task, onStepData, autoActions }) => {
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  const handleActionComplete = (actionId: string) => {
    const newCompleted = new Set(completedActions);
    newCompleted.add(actionId);
    setCompletedActions(newCompleted);
    
    onStepData({
      completed: autoActions.length === 0 || newCompleted.size >= autoActions.length,
      completedActions: Array.from(newCompleted)
    });
  };

  return (
    <div className="space-y-4">
      {autoActions.length > 0 ? (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-3 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              Suggested Actions
            </h4>
            <div className="space-y-2">
              {autoActions.map((action: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-yellow-800">{action.label || action.type}</span>
                  <button
                    onClick={() => handleActionComplete(`action-${index}`)}
                    disabled={completedActions.has(`action-${index}`)}
                    className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-green-600"
                  >
                    {completedActions.has(`action-${index}`) ? 'Completed' : 'Execute'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No specific actions required. Mark as completed when done.</p>
          <button
            onClick={() => handleActionComplete('manual-complete')}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Mark Actions Complete
          </button>
        </div>
      )}
    </div>
  );
};

const VerificationStep: React.FC<any> = ({ task, onStepData }) => {
  const [verificationChecks, setVerificationChecks] = useState<Record<string, boolean>>({
    requirements_met: false,
    quality_check: false,
    no_issues: false
  });

  const handleCheckChange = (checkId: string, checked: boolean) => {
    const updated = { ...verificationChecks, [checkId]: checked };
    setVerificationChecks(updated);
    
    const allChecked = Object.values(updated).every(Boolean);
    onStepData({ completed: allChecked, checks: updated });
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-3">Verification Checklist</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={verificationChecks.requirements_met}
              onChange={(e) => handleCheckChange('requirements_met', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-green-800">All task requirements have been met</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={verificationChecks.quality_check}
              onChange={(e) => handleCheckChange('quality_check', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-green-800">Quality check passed</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={verificationChecks.no_issues}
              onChange={(e) => handleCheckChange('no_issues', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-green-800">No outstanding issues or blockers</span>
          </label>
        </div>
      </div>
    </div>
  );
};

const DocumentationStep: React.FC<any> = ({ onStepData }) => {
  const [notes, setNotes] = useState('');

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onStepData({ completed: true, notes: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Completion Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
          placeholder="Add any notes about the completion of this task..."
        />
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center text-blue-800">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">Documentation Complete</span>
        </div>
        <p className="text-blue-700 text-sm mt-1">
          Notes will be saved with the task completion record.
        </p>
      </div>
    </div>
  );
};

const DocumentReviewStep: React.FC<any> = ({ task, onStepData }) => {
  const [reviewStatus, setReviewStatus] = useState('pending');

  const handleReviewComplete = (status: string) => {
    setReviewStatus(status);
    onStepData({ completed: status === 'approved', reviewStatus: status });
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-900 mb-3 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Document Review Required
        </h4>
        <p className="text-purple-800 text-sm mb-3">
          This task involves document handling. Please review any associated documents before completion.
        </p>
        
        <div className="flex space-x-2">
          <button
            onClick={() => handleReviewComplete('approved')}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Approve Documents
          </button>
          <button
            onClick={() => handleReviewComplete('needs_revision')}
            className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
          >
            Needs Revision
          </button>
        </div>
        
        {reviewStatus !== 'pending' && (
          <div className="mt-3 text-sm">
            <span className="font-medium">Status: </span>
            <span className={reviewStatus === 'approved' ? 'text-green-600' : 'text-yellow-600'}>
              {reviewStatus === 'approved' ? 'Approved' : 'Needs Revision'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const CommunicationStep: React.FC<any> = ({ task, onStepData }) => {
  const [communicationData, setCommunicationData] = useState({
    method: '',
    outcome: '',
    notes: '',
    followUpRequired: false
  });

  const handleDataChange = (field: string, value: any) => {
    const updated = { ...communicationData, [field]: value };
    setCommunicationData(updated);
    
    const isComplete = updated.method && updated.outcome;
    onStepData({ completed: isComplete, communication: updated });
  };

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h4 className="font-medium text-indigo-900 mb-3 flex items-center">
          <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
          Communication Details
        </h4>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Communication Method *
            </label>
            <select
              value={communicationData.method}
              onChange={(e) => handleDataChange('method', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select method...</option>
              <option value="phone">Phone Call</option>
              <option value="email">Email</option>
              <option value="meeting">In-Person Meeting</option>
              <option value="video">Video Call</option>
              <option value="message">Message/Chat</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outcome *
            </label>
            <select
              value={communicationData.outcome}
              onChange={(e) => handleDataChange('outcome', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select outcome...</option>
              <option value="successful">Successful Contact</option>
              <option value="no_response">No Response</option>
              <option value="callback_requested">Callback Requested</option>
              <option value="information_provided">Information Provided</option>
              <option value="issue_resolved">Issue Resolved</option>
              <option value="follow_up_needed">Follow-up Needed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={communicationData.notes}
              onChange={(e) => handleDataChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional details about the communication..."
            />
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={communicationData.followUpRequired}
              onChange={(e) => handleDataChange('followUpRequired', e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">Follow-up action required</span>
          </label>
        </div>
      </div>
    </div>
  );
};