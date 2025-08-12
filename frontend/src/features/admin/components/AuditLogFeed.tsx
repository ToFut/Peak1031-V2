import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  UserCircleIcon,
  ClockIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  AtSymbolIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  ChatBubbleLeftIcon as ChatIconSolid,
  CheckCircleIcon as CheckIconSolid
} from '@heroicons/react/24/solid';

interface AuditPost {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  user_id: string;
  userName: string;
  userEmail: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  severity: string;
  exchangeId?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isShared: boolean;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar: string;
  createdAt: string;
  mentions: string[];
  isEdited: boolean;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
}

export const AuditLogFeed: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<AuditPost[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<AuditPost | null>(null);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadFeedData();
  }, []);

  const loadFeedData = async () => {
    try {
      setLoading(true);
      const [logsResponse, usersResponse] = await Promise.all([
        apiService.getAuditLogs({ limit: 50 }),
        apiService.getUsers()
      ]);

      // Process audit logs into social posts
      const logs = logsResponse?.data || [];
      const processedPosts = logs.map((log: any) => ({
        id: log.id || '',
        action: log.action || '',
        entity_type: log.entity_type || '',
        entity_id: log.entity_id || '',
        details: log.details || {},
        user_id: log.user_id || '',
        userName: log.userName || 'System',
        userEmail: log.userEmail || '',
        ip: log.ip || '',
        userAgent: log.userAgent || '',
        timestamp: log.timestamp || new Date().toISOString(),
        severity: log.severity || 'info',
        exchangeId: log.exchangeId || null,
        likes: Math.floor(Math.random() * 20), // Mock data for now
        comments: Math.floor(Math.random() * 15),
        shares: Math.floor(Math.random() * 8),
        isLiked: false,
        isShared: false
      }));

      setPosts(processedPosts);
      setUsers(usersResponse || []);
    } catch (error) {
      console.error('Failed to load feed data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatActionText = (action: string, details: any, userName: string) => {
    try {
      const actionMap: Record<string, string> = {
        'LOGIN': '🔐 logged into the system',
        'LOGOUT': '🚪 signed out',
        'DOCUMENT_UPLOAD': '📄 uploaded a new document',
        'DOCUMENT_DOWNLOAD': '⬇️ downloaded a document',
        'MESSAGE_SENT': '💬 sent a message',
        'EXCHANGE_CREATED': '🆕 created a new exchange',
        'EXCHANGE_UPDATED': '✏️ updated exchange details',
        'TASK_CREATED': '📋 created a new task',
        'TASK_COMPLETED': '✅ completed a task',
        'USER_INVITED': '👥 invited a new user',
        'PERMISSION_CHANGED': '🔒 updated user permissions',
        'SYNC_COMPLETED': '🔄 synchronized data with PracticePanther',
        'PERFORMANCE_ISSUE': '⚡ system performance alert',
        'APPLICATION_ERROR': '🚨 system error detected',
        'view_report': '📊 viewed a report'
      };

      const actionText = actionMap[action] || `performed ${String(action || '').toLowerCase().replace(/_/g, ' ')}`;
      
      // Add specific details based on action
      let contextText = '';
      if (action === 'DOCUMENT_UPLOAD' && details?.documentName) {
        contextText = `: "${String(details.documentName)}"`;
      } else if (action === 'EXCHANGE_CREATED' && details?.exchangeName) {
        contextText = `: "${String(details.exchangeName)}"`;
      } else if (action === 'MESSAGE_SENT' && details?.exchangeId) {
        contextText = ` in Exchange #${String(details.exchangeId)}`;
      } else if (action === 'TASK_COMPLETED' && details?.taskTitle) {
        contextText = `: "${String(details.taskTitle)}"`;
      } else if (action === 'PERFORMANCE_ISSUE' && details?.duration) {
        contextText = ` (${String(details.duration)}ms response time)`;
      } else if (action === 'APPLICATION_ERROR' && details?.error) {
        contextText = `: ${String(details.error).substring(0, 100)}...`;
      }

      return `${actionText}${contextText}`;
    } catch (error) {
      return `performed ${String(action || 'unknown action')}`;
    }
  };

  const getPostIcon = (action: string, severity: string) => {
    const iconClass = "w-5 h-5";
    
    if (severity === 'error') return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />;
    if (severity === 'warning') return <ExclamationTriangleIcon className={`${iconClass} text-yellow-500`} />;
    
    const iconMap: Record<string, JSX.Element> = {
      'LOGIN': <ShieldCheckIcon className={`${iconClass} text-green-500`} />,
      'LOGOUT': <ShieldCheckIcon className={`${iconClass} text-gray-500`} />,
      'DOCUMENT_UPLOAD': <DocumentTextIcon className={`${iconClass} text-blue-500`} />,
      'DOCUMENT_DOWNLOAD': <EyeIcon className={`${iconClass} text-indigo-500`} />,
      'MESSAGE_SENT': <ChatBubbleLeftIcon className={`${iconClass} text-purple-500`} />,
      'EXCHANGE_CREATED': <CheckCircleIcon className={`${iconClass} text-green-600`} />,
      'TASK_COMPLETED': <CheckIconSolid className={`${iconClass} text-emerald-500`} />,
      'SYNC_COMPLETED': <ArrowPathIcon className={`${iconClass} text-blue-600`} />,
      'PERFORMANCE_ISSUE': <BoltIcon className={`${iconClass} text-orange-500`} />
    };

    return iconMap[action] || <InformationCircleIcon className={`${iconClass} text-gray-500`} />;
  };

  const handleLike = async (postId: string) => {
    try {
      await apiService.likeAuditLog(postId, 'like');
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleShare = async (post: AuditPost) => {
    try {
      // Create a share action
      await apiService.post('/audit-social/share', {
        auditLogId: post.id,
        shareType: 'internal'
      });
      
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === post.id 
            ? { ...p, isShared: !p.isShared, shares: p.isShared ? p.shares - 1 : p.shares + 1 }
            : p
        )
      );
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  };

  const toggleComments = async (postId: string) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    
    if (!comments[postId]) {
      // Load comments for this post
      try {
        const response = await apiService.getAuditLogInteractions(postId);
        setComments(prev => ({ ...prev, [postId]: response.interactions?.comments || [] }));
      } catch (error) {
        console.error('Failed to load comments:', error);
      }
    }
  };

  const handleCommentChange = (value: string) => {
    setNewComment(value);
    
    // Check for @ mentions
    const cursorPos = commentInputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
      setCursorPosition(cursorPos);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (user: User) => {
    const beforeMention = newComment.substring(0, cursorPosition - mentionQuery.length - 1);
    const afterMention = newComment.substring(cursorPosition);
    const newValue = `${beforeMention}@${user.first_name} ${user.last_name}${afterMention}`;
    
    setNewComment(newValue);
    setShowMentionDropdown(false);
    
    // Focus back to textarea
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const submitComment = async (postId: string) => {
    if (!newComment.trim()) return;

    try {
      // Extract mentions
      const mentionRegex = /@(\w+\s+\w+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        const fullName = match[1];
        const mentionedUser = users.find(u => 
          `${u.first_name} ${u.last_name}`.toLowerCase() === fullName.toLowerCase()
        );
        if (mentionedUser) {
          mentions.push(mentionedUser.id);
        }
      }

      await apiService.commentOnAuditLog(postId, newComment, mentions);
      
      // Create tasks for mentioned users
      for (const userId of mentions) {
        await apiService.post('/tasks', {
          title: `Review Audit Log Comment`,
          description: `You were mentioned in a comment on an audit log: "${newComment}"`,
          assigned_to: userId,
          priority: 'medium',
          category: 'audit_review',
          audit_log_id: postId
        });
      }

      setNewComment('');
      
      // Refresh comments
      const response = await apiService.getAuditLogInteractions(postId);
      setComments(prev => ({ ...prev, [postId]: response.interactions?.comments || [] }));
      
      // Update comment count
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, comments: post.comments + 1 }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      error: 'border-l-red-500 bg-red-50',
      warning: 'border-l-yellow-500 bg-yellow-50',
      info: 'border-l-blue-500 bg-blue-50',
      success: 'border-l-green-500 bg-green-50'
    };
    return colors[severity as keyof typeof colors] || 'border-l-gray-500 bg-gray-50';
  };

  const filteredUsers = users.filter(u => 
    mentionQuery ? 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(mentionQuery.toLowerCase()) :
      true
  ).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Feed Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Activity Feed</h1>
        <p className="text-gray-600">Real-time system activity and audit logs</p>
      </div>

      {/* Posts Feed */}
      {posts.map((post) => (
        <div key={post.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${getSeverityColor(post.severity)} hover:shadow-md transition-shadow`}>
          {/* Post Header */}
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <UserCircleIcon className="w-10 h-10 text-gray-400" />
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    {getPostIcon(post.action, post.severity)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{String(post.userName || 'System')}</span>
                    <span className="text-gray-600">{formatActionText(String(post.action || ''), post.details || {}, String(post.userName || ''))}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{formatTimestamp(String(post.timestamp || ''))}</span>
                    {post.ip && (
                      <>
                        <span>•</span>
                        <span>IP: {String(post.ip)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Post Content */}
            {post.details && Object.keys(post.details).length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-700">
                  {post.details.description && (
                    <p className="mb-2">{String(post.details.description)}</p>
                  )}
                  {post.details.path && (
                    <p className="mb-1"><strong>Path:</strong> {String(post.details.path)}</p>
                  )}
                  {post.details.method && (
                    <p className="mb-1"><strong>Method:</strong> <span className="font-mono">{String(post.details.method)}</span></p>
                  )}
                  {post.details.duration && (
                    <p className="mb-1"><strong>Duration:</strong> {String(post.details.duration)}ms</p>
                  )}
                  {post.details.statusCode && (
                    <p className="mb-1"><strong>Status:</strong> <span className={`font-mono ${Number(post.details.statusCode) >= 400 ? 'text-red-600' : 'text-green-600'}`}>{String(post.details.statusCode)}</span></p>
                  )}
                  {post.exchangeId && (
                    <p className="mb-1"><strong>Exchange:</strong> <span className="text-blue-600">#{String(post.exchangeId)}</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Engagement Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-6">
                <button 
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    post.isLiked 
                      ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {post.isLiked ? 
                    <HeartIconSolid className="w-5 h-5" /> : 
                    <HeartIcon className="w-5 h-5" />
                  }
                  <span className="font-medium">{post.likes}</span>
                </button>

                <button 
                  onClick={() => toggleComments(post.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    showComments[post.id] 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  <span className="font-medium">{post.comments}</span>
                </button>

                <button 
                  onClick={() => handleShare(post)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    post.isShared 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ShareIcon className="w-5 h-5" />
                  <span className="font-medium">{post.shares}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  post.severity === 'error' ? 'bg-red-100 text-red-800' :
                  post.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  post.severity === 'success' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {String(post.severity || 'info')}
                </span>
              </div>
            </div>

            {/* Comments Section */}
            {showComments[post.id] && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {/* Existing Comments */}
                <div className="space-y-3 mb-4">
                  {comments[post.id]?.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <UserCircleIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">{String(comment.userName || '')}</span>
                            <span className="text-xs text-gray-500">{formatTimestamp(String(comment.createdAt || ''))}</span>
                          </div>
                          <p className="text-sm text-gray-700">{String(comment.content || '')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* New Comment Input */}
                <div className="relative">
                  <div className="flex space-x-3">
                    <UserCircleIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 relative">
                      <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => handleCommentChange(e.target.value)}
                        placeholder="Write a comment... Use @name to mention users"
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                      
                      {/* Mention Dropdown */}
                      {showMentionDropdown && filteredUsers.length > 0 && (
                        <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg">
                          {filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => insertMention(user)}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                            >
                              <UserCircleIcon className="w-6 h-6 text-gray-400" />
                              <span className="font-medium">{String(user.first_name || '')} {String(user.last_name || '')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <AtSymbolIcon className="w-4 h-4" />
                          <span>Tag users to create tasks</span>
                        </div>
                        <button
                          onClick={() => submitComment(post.id)}
                          disabled={!newComment.trim()}
                          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <PaperAirplaneIcon className="w-4 h-4" />
                          <span>Post</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {posts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No activity to show</p>
        </div>
      )}
    </div>
  );
};

export default AuditLogFeed;