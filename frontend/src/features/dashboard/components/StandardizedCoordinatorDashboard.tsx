import React, { useState, useMemo } from "react";
import StandardDashboard from "./StandardDashboard";
import { useAuth } from '../../../hooks/useAuth';
import { useDashboardData } from '../../../shared/hooks/useDashboardData';
import {
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  FunnelIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, addDays, isAfter } from 'date-fns';

const CoordinatorOverview: React.FC = () => {
  const { stats, exchanges, tasks, users, messages, loading } = useDashboardData({ role: 'coordinator' });

  const timeBasedMetrics = useMemo(() => {
    // Early return if data not loaded
    if (!exchanges.length && !tasks.length && !messages.length) {
      return {
        critical48h: { exchanges: [], tasks: [], overdue: [] },
        prepare7d: { exchanges: [], tasks: [] },
        pipeline30d: { exchanges: [], newClients: [], monthlyProgress: { completed: 0, target: 12 } },
        urgentMessages: [],
        recentMessages: [],
        totalCritical: 0
      };
    }

    const now = new Date();
    const nowTime = now.getTime();
    const in48Hours = nowTime + (48 * 60 * 60 * 1000);
    const in7Days = nowTime + (7 * 24 * 60 * 60 * 1000);
    const in30Days = nowTime + (30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = nowTime - (30 * 24 * 60 * 60 * 1000);

    // Pre-process exchanges and tasks with deadline timestamps
    const exchangesWithDeadlines = exchanges.map((ex: any) => ({
      ...ex,
      deadlineTime: ex.targetCloseDate ? new Date(ex.targetCloseDate).getTime() : 
                   ex.deadline ? new Date(ex.deadline).getTime() : null
    })).filter((ex: any) => ex.deadlineTime && ex.status !== 'COMPLETED');

    const tasksWithDeadlines = tasks.map((task: any) => ({
      ...task,
      deadlineTime: task.dueDate ? new Date(task.dueDate).getTime() : 
                   task.due_date ? new Date(task.due_date).getTime() : null
    })).filter((task: any) => task.deadlineTime && task.status !== 'COMPLETED');

    // Single pass filtering
    const critical48h = {
      exchanges: exchangesWithDeadlines.filter((ex: any) => ex.deadlineTime <= in48Hours && ex.deadlineTime >= nowTime),
      tasks: tasksWithDeadlines.filter((task: any) => task.deadlineTime <= in48Hours && task.deadlineTime >= nowTime),
      overdue: [
        ...exchangesWithDeadlines.filter((ex: any) => ex.deadlineTime < nowTime),
        ...tasksWithDeadlines.filter((task: any) => task.deadlineTime < nowTime)
      ]
    };

    const prepare7d = {
      exchanges: exchangesWithDeadlines.filter((ex: any) => ex.deadlineTime > in48Hours && ex.deadlineTime <= in7Days),
      tasks: tasksWithDeadlines.filter((task: any) => task.deadlineTime > in48Hours && task.deadlineTime <= in7Days)
    };

    const pipeline30d = {
      exchanges: exchangesWithDeadlines.filter((ex: any) => ex.deadlineTime > in7Days && ex.deadlineTime <= in30Days),
      newClients: users.filter((user: any) => 
        user.role === 'client' && 
        user.created_at && 
        new Date(user.created_at).getTime() >= thirtyDaysAgo
      ),
      monthlyProgress: {
        completed: exchanges.filter((ex: any) => 
          ex.status === 'COMPLETED' && 
          ex.updated_at && 
          new Date(ex.updated_at).getTime() >= thirtyDaysAgo
        ).length,
        target: 12
      }
    };

    // Optimized message filtering
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'deadline', 'critical', 'immediately'];
    const urgentMessages = messages
      .filter((msg: any) => {
        if (msg.read_by?.includes(msg.recipient_id)) return false;
        const content = (msg.content || '').toLowerCase();
        return urgentKeywords.some(keyword => content.includes(keyword));
      })
      .slice(0, 4);

    const urgentIds = new Set(urgentMessages.map((msg: any) => msg.id));
    const recentMessages = messages
      .filter((msg: any) => !urgentIds.has(msg.id))
      .slice(0, 6);

    return {
      critical48h,
      prepare7d,
      pipeline30d,
      urgentMessages,
      recentMessages,
      totalCritical: critical48h.exchanges.length + critical48h.tasks.length + critical48h.overdue.length
    };
  }, [exchanges, tasks, users, messages]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CRITICAL TIMELINE ALERTS */}
      {timeBasedMetrics.totalCritical > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">
              CRITICAL - {timeBasedMetrics.totalCritical} Items Need Immediate Action
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timeBasedMetrics.critical48h.overdue.map((item: any) => (
              <div key={`overdue-${item.id}`} className="bg-red-100 border border-red-300 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-red-900">OVERDUE</p>
                    <p className="text-sm text-red-800">{item.name || item.title || `Exchange ${item.exchangeNumber}`}</p>
                    <p className="text-xs text-red-600">
                      Due: {new Date(item.targetCloseDate || item.deadline || item.dueDate || item.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <ClockIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            ))}
            {timeBasedMetrics.critical48h.exchanges.map((exchange: any) => (
              <Link 
                key={`critical-ex-${exchange.id}`} 
                to={`/exchanges/${exchange.id}`}
                className="bg-orange-100 border border-orange-300 rounded-lg p-3 hover:bg-orange-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-orange-900">DEADLINE IN 48H</p>
                    <p className="text-sm text-orange-800">{exchange.name || `Exchange ${exchange.exchangeNumber}`}</p>
                    <p className="text-xs text-orange-600">
                      Due: {new Date(exchange.targetCloseDate || exchange.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <DocumentTextIcon className="h-6 w-6 text-orange-600" />
                </div>
              </Link>
            ))}
            {timeBasedMetrics.critical48h.tasks.map((task: any) => (
              <Link 
                key={`critical-task-${task.id}`} 
                to="/tasks"
                className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 hover:bg-yellow-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-yellow-900">TASK DUE 48H</p>
                    <p className="text-sm text-yellow-800">{task.title || task.name}</p>
                    <p className="text-xs text-yellow-600">
                      Due: {new Date(task.dueDate || task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircleIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TIME-BASED WORKFLOW OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NEXT 48 HOURS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            Next 48 Hours - CRITICAL
          </h3>
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-bold text-red-800">ACTION REQUIRED</p>
              <p className="text-2xl font-bold text-red-900">{timeBasedMetrics.totalCritical}</p>
              <p className="text-xs text-red-600">items need immediate attention</p>
            </div>
            {timeBasedMetrics.totalCritical === 0 && (
              <div className="text-center py-4">
                <CheckCircleIcon className="mx-auto h-8 w-8 text-green-400" />
                <p className="text-sm text-green-600 mt-2">All caught up!</p>
                <p className="text-xs text-gray-500">No critical items in next 48h</p>
              </div>
            )}
          </div>
        </div>

        {/* THIS WEEK */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            This Week - PREPARE
          </h3>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-bold text-blue-800">PREP NEEDED</p>
              <p className="text-2xl font-bold text-blue-900">
                {timeBasedMetrics.prepare7d.exchanges.length + timeBasedMetrics.prepare7d.tasks.length}
              </p>
              <p className="text-xs text-blue-600">items need setup/preparation</p>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {timeBasedMetrics.prepare7d.exchanges.slice(0, 3).map((exchange: any) => (
                <Link 
                  key={exchange.id} 
                  to={`/exchanges/${exchange.id}`}
                  className="block text-xs p-2 bg-blue-50 rounded border hover:bg-blue-100"
                >
                  <p className="font-medium text-blue-900">{exchange.name || `Exchange ${exchange.exchangeNumber}`}</p>
                  <p className="text-blue-600">Due: {new Date(exchange.targetCloseDate || exchange.deadline).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* THIS MONTH */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-purple-600" />
            This Month - PIPELINE
          </h3>
          <div className="space-y-3">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm font-bold text-purple-800">MONTHLY GOAL</p>
              <p className="text-2xl font-bold text-purple-900">
                {timeBasedMetrics.pipeline30d.monthlyProgress.completed}/{timeBasedMetrics.pipeline30d.monthlyProgress.target}
              </p>
              <p className="text-xs text-purple-600">
                {Math.round((timeBasedMetrics.pipeline30d.monthlyProgress.completed / timeBasedMetrics.pipeline30d.monthlyProgress.target) * 100)}% progress
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <p className="font-medium text-gray-900">{timeBasedMetrics.pipeline30d.exchanges.length}</p>
                <p className="text-gray-600">In Pipeline</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">{timeBasedMetrics.pipeline30d.newClients.length}</p>
                <p className="text-gray-600">New Clients</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INTEGRATED COMMUNICATION HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* URGENT COMMUNICATIONS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            🚨 URGENT Messages
            {timeBasedMetrics.urgentMessages.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                {timeBasedMetrics.urgentMessages.length}
              </span>
            )}
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {timeBasedMetrics.urgentMessages.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircleIcon className="mx-auto h-8 w-8 text-green-400" />
                <p className="text-sm text-green-600 mt-2">No urgent messages</p>
              </div>
            ) : (
              timeBasedMetrics.urgentMessages.map((msg: any) => (
                <Link
                  key={msg.id}
                  to="/messages"
                  className="block p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-red-900 text-sm">
                        {msg.sender?.firstName || msg.sender?.email || 'Unknown Sender'}
                      </p>
                      <p className="text-red-800 text-xs mt-1 line-clamp-2">
                        {msg.content?.substring(0, 80)}...
                      </p>
                      <p className="text-red-600 text-xs mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-red-600 flex-shrink-0 ml-2" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* RECENT COMMUNICATIONS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
            Recent Messages
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              Live
            </span>
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {timeBasedMetrics.recentMessages.slice(0, 6).map((msg: any) => (
              <Link
                key={msg.id}
                to="/messages"
                className="block p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-xs">
                      {msg.sender?.firstName || msg.sender?.email || 'Unknown'}
                    </p>
                    <p className="text-gray-600 text-xs mt-1 line-clamp-1">
                      {msg.content?.substring(0, 50)}...
                    </p>
                    <p className="text-gray-400 text-xs">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {!msg.read_by?.includes(msg.recipient_id) && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <Link
              to="/messages"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all messages →
            </Link>
          </div>
        </div>

        {/* SMART WORKFLOW INSIGHTS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-green-600" />
            Smart Insights
          </h3>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-bold text-green-800">Efficiency Score</p>
              <p className="text-lg font-bold text-green-900">87%</p>
              <p className="text-xs text-green-600">Above industry average</p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Documents/day avg</span>
                <span className="font-bold text-blue-600">4.2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Client response time</span>
                <span className="font-bold text-orange-600">6.3h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Success rate</span>
                <span className="font-bold text-green-600">96%</span>
              </div>
            </div>
            <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                💡 <strong>Tip:</strong> Wilson exchanges typically need extra time. Start prep 2 days early.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTION DASHBOARD */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-600" />
          Quick Actions & Shortcuts
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link
            to="/exchanges?filter=critical"
            className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-center"
          >
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-red-900">Critical Items</p>
            <p className="text-xs text-red-600">{timeBasedMetrics.totalCritical} urgent</p>
          </Link>
          <Link
            to="/tasks?filter=today"
            className="p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center"
          >
            <CalendarIcon className="h-6 w-6 text-purple-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-purple-900">Today's Tasks</p>
            <p className="text-xs text-purple-600">Focus mode</p>
          </Link>
          <Link
            to="/messages?filter=unread"
            className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-blue-900">Messages</p>
            <p className="text-xs text-blue-600">{timeBasedMetrics.urgentMessages.length} urgent</p>
          </Link>
          <Link
            to="/documents?filter=pending"
            className="p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-center"
          >
            <DocumentTextIcon className="h-6 w-6 text-orange-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-orange-900">Documents</p>
            <p className="text-xs text-orange-600">Pending review</p>
          </Link>
          <Link
            to="/exchanges/new"
            className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center"
          >
            <UserGroupIcon className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-green-900">New Exchange</p>
            <p className="text-xs text-green-600">Create now</p>
          </Link>
        </div>
      </div>

      {/* EXISTING EXCHANGE DATA FOR COORDINATORS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MY RECENT EXCHANGES */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            My Recent Exchanges
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">45D</span>
                <div>
                  <p className="font-medium text-gray-900">Smith Holdings Retail Property</p>
                  <p className="text-sm text-gray-500">2 weeks ago • $450K</p>
                </div>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Delayed</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">✓</span>
                <div>
                  <p className="font-medium text-gray-900">Johnson Trust Apartment</p>
                  <p className="text-sm text-gray-500">2 weeks ago • $325K</p>
                </div>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Complete</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">SIM</span>
                <div>
                  <p className="font-medium text-gray-900">ABC Corp Industrial</p>
                  <p className="text-sm text-gray-500">3 weeks ago • $275K</p>
                </div>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Active</span>
            </div>
            <Link
              to="/exchanges"
              className="block mt-3 text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all my exchanges →
            </Link>
          </div>
        </div>

        {/* COORDINATOR STATS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-green-600" />
            My Performance Stats
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-800">Active Exchanges</p>
                <p className="text-2xl font-bold text-blue-900">8</p>
                <p className="text-xs text-blue-600">Currently managing</p>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm font-medium text-green-800">Completed</p>
                <p className="text-2xl font-bold text-green-900">12</p>
                <p className="text-xs text-green-600">This quarter</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <p className="font-medium text-gray-900">2.0K</p>
                <p className="text-gray-600">Messages</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">20</p>
                <p className="text-gray-600">Avg/Exchange</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">18d</p>
                <p className="text-gray-600">Avg Close</p>
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-bold text-green-800">Efficiency Score</p>
              <p className="text-lg font-bold text-green-900">92%</p>
              <p className="text-xs text-green-600">Above team average (84%)</p>
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY TREND FOR COORDINATOR */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-5 w-5 text-purple-600" />
          My Monthly Progress
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Exchange Completions by Month</p>
            <div className="grid grid-cols-6 gap-2 text-xs">
              <div className="text-center">
                <p className="font-medium text-gray-900">Mar</p>
                <div className="h-16 bg-gray-200 rounded mt-1 flex items-end justify-center">
                  <div className="w-full h-2 bg-gray-300 rounded"></div>
                </div>
                <p className="text-gray-600 mt-1">0</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Apr</p>
                <div className="h-16 bg-gray-200 rounded mt-1 flex items-end justify-center">
                  <div className="w-full h-2 bg-gray-300 rounded"></div>
                </div>
                <p className="text-gray-600 mt-1">0</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">May</p>
                <div className="h-16 bg-gray-200 rounded mt-1 flex items-end justify-center">
                  <div className="w-full h-2 bg-gray-300 rounded"></div>
                </div>
                <p className="text-gray-600 mt-1">0</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Jun</p>
                <div className="h-16 bg-gray-200 rounded mt-1 flex items-end justify-center">
                  <div className="w-full h-2 bg-gray-300 rounded"></div>
                </div>
                <p className="text-gray-600 mt-1">0</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Jul</p>
                <div className="h-16 bg-gray-200 rounded mt-1 flex items-end justify-center">
                  <div className="w-full h-4 bg-blue-400 rounded"></div>
                </div>
                <p className="text-blue-600 mt-1 font-bold">1</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Aug</p>
                <div className="h-16 bg-gray-200 rounded mt-1 flex items-end justify-center">
                  <div className="w-full h-12 bg-green-500 rounded"></div>
                </div>
                <p className="text-green-600 mt-1 font-bold">3</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-bold text-blue-800">Current Month Target</p>
              <p className="text-lg font-bold text-blue-900">5 exchanges</p>
              <p className="text-xs text-blue-600">3 completed, 2 to go</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-bold text-green-800">Personal Best</p>
              <p className="text-lg font-bold text-green-900">6 exchanges</p>
              <p className="text-xs text-green-600">June 2024</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
              <p className="text-sm font-bold text-purple-800">Growth Rate</p>
              <p className="text-lg font-bold text-purple-900">+200%</p>
              <p className="text-xs text-purple-600">vs last month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StandardizedCoordinatorDashboard: React.FC = () => {
  return <StandardDashboard customContent={<CoordinatorOverview />} />;
};

export default StandardizedCoordinatorDashboard;
