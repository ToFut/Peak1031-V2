const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');
const databaseService = require('../services/database');

// Get audit log with all social interactions
router.get('/:auditLogId/interactions', authenticateToken, async (req, res) => {
  try {
    const { auditLogId } = req.params;
    
    // Get the audit log
    const auditLog = await databaseService.getAuditLogById(auditLogId);
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Get all interactions for this audit log
    const interactions = await databaseService.getAuditInteractions(auditLogId);
    
    res.json({
      data: {
        auditLog,
        interactions
      }
    });
  } catch (error) {
    console.error('Error fetching audit interactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a comment to an audit log
router.post('/:auditLogId/comments', authenticateToken, async (req, res) => {
  try {
    const { auditLogId } = req.params;
    const { content, parentCommentId, mentions } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify audit log exists
    const auditLog = await databaseService.getAuditLogById(auditLogId);
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Create the comment
    const comment = await databaseService.createAuditComment({
      auditLogId,
      userId,
      content: content.trim(),
      parentCommentId,
      mentions: mentions || []
    });

    // If mentions exist, create tasks for mentioned users
    if (mentions && mentions.length > 0) {
      for (const mentionedUserId of mentions) {
        await databaseService.createTaskFromMention({
          auditLogId,
          mentionedUserId,
          mentionedBy: userId,
          commentContent: content
        });
      }
    }

    res.status(201).json({
      data: comment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a comment
router.put('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Get the comment and verify ownership
    const comment = await databaseService.getAuditCommentById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Update the comment
    const updatedComment = await databaseService.updateAuditComment(commentId, {
      content: content.trim(),
      isEdited: true,
      editedAt: new Date()
    });

    res.json({
      data: updatedComment,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a comment
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Get the comment and verify ownership
    const comment = await databaseService.getAuditCommentById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Delete the comment
    await databaseService.deleteAuditComment(commentId);

    res.json({
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Like/unlike an audit log
router.post('/:auditLogId/like', authenticateToken, async (req, res) => {
  try {
    const { auditLogId } = req.params;
    const { reactionType = 'like' } = req.body;
    const userId = req.user.id;

    // Verify audit log exists
    const auditLog = await databaseService.getAuditLogById(auditLogId);
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Check if user already liked this audit log
    const existingLike = await databaseService.getAuditLike(auditLogId, userId);
    
    if (existingLike) {
      // Unlike if same reaction type, otherwise update reaction
      if (existingLike.reactionType === reactionType) {
        await databaseService.deleteAuditLike(auditLogId, userId);
        res.json({
          data: { liked: false, reactionType: null },
          message: 'Audit log unliked'
        });
      } else {
        await databaseService.updateAuditLike(auditLogId, userId, reactionType);
        res.json({
          data: { liked: true, reactionType },
          message: 'Reaction updated'
        });
      }
    } else {
      // Add new like
      await databaseService.createAuditLike(auditLogId, userId, reactionType);
      res.json({
        data: { liked: true, reactionType },
        message: 'Audit log liked'
      });
    }
  } catch (error) {
    console.error('Error liking audit log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign an audit log to a user
router.post('/:auditLogId/assign', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const { auditLogId } = req.params;
    const { assignedTo, assignmentType, priority, dueDate, notes } = req.body;
    const assignedBy = req.user.id;

    if (!assignedTo) {
      return res.status(400).json({ error: 'Assigned user is required' });
    }

    // Verify audit log exists
    const auditLog = await databaseService.getAuditLogById(auditLogId);
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Verify assigned user exists
    const assignedUser = await databaseService.getUserById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ error: 'Assigned user not found' });
    }

    // Create assignment
    const assignment = await databaseService.createAuditAssignment({
      auditLogId,
      assignedBy,
      assignedTo,
      assignmentType: assignmentType || 'review',
      priority: priority || 'normal',
      dueDate: dueDate ? new Date(dueDate) : null,
      notes
    });

    // Create a task for the assigned user
    await databaseService.createTaskFromAssignment({
      auditLogId,
      assignedTo,
      assignmentType,
      priority,
      dueDate,
      notes
    });

    res.status(201).json({
      data: assignment,
      message: 'Audit log assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning audit log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update assignment status
router.put('/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    // Get the assignment
    const assignment = await databaseService.getAuditAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Verify user can update this assignment
    if (assignment.assignedTo !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own assignments' });
    }

    // Update assignment
    const updatedAssignment = await databaseService.updateAuditAssignment(assignmentId, {
      status,
      notes,
      completedAt: status === 'completed' ? new Date() : null
    });

    res.json({
      data: updatedAssignment,
      message: 'Assignment updated successfully'
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Escalate an audit log
router.post('/:auditLogId/escalate', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const { auditLogId } = req.params;
    const { escalatedTo, reason, priority, escalationLevel } = req.body;
    const escalatedBy = req.user.id;

    if (!escalatedTo || !reason) {
      return res.status(400).json({ error: 'Escalated user and reason are required' });
    }

    // Verify audit log exists
    const auditLog = await databaseService.getAuditLogById(auditLogId);
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Verify escalated user exists
    const escalatedUser = await databaseService.getUserById(escalatedTo);
    if (!escalatedUser) {
      return res.status(404).json({ error: 'Escalated user not found' });
    }

    // Create escalation
    const escalation = await databaseService.createAuditEscalation({
      auditLogId,
      escalatedBy,
      escalatedTo,
      escalationLevel: escalationLevel || 1,
      reason,
      priority: priority || 'normal'
    });

    // Create a high-priority task for the escalated user
    await databaseService.createTaskFromEscalation({
      auditLogId,
      escalatedTo,
      reason,
      priority,
      escalationLevel
    });

    res.status(201).json({
      data: escalation,
      message: 'Audit log escalated successfully'
    });
  } catch (error) {
    console.error('Error escalating audit log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update escalation status
router.put('/escalations/:escalationId', authenticateToken, async (req, res) => {
  try {
    const { escalationId } = req.params;
    const { status, resolutionNotes } = req.body;
    const userId = req.user.id;

    // Get the escalation
    const escalation = await databaseService.getAuditEscalationById(escalationId);
    if (!escalation) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    // Verify user can update this escalation
    if (escalation.escalatedTo !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update escalations assigned to you' });
    }

    // Update escalation
    const updatedEscalation = await databaseService.updateAuditEscalation(escalationId, {
      status,
      resolutionNotes,
      resolvedAt: status === 'resolved' ? new Date() : null
    });

    res.json({
      data: updatedEscalation,
      message: 'Escalation updated successfully'
    });
  } catch (error) {
    console.error('Error updating escalation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all interactions for a user (for dashboard)
router.get('/user/:userId/interactions', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, limit = 20, offset = 0 } = req.query;

    // Verify user can access this data
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const interactions = await databaseService.getUserAuditInteractions(userId, {
      type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      data: interactions
    });
  } catch (error) {
    console.error('Error fetching user interactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Share an audit log
router.post('/share', authenticateToken, async (req, res) => {
  try {
    const { auditLogId, shareType = 'internal' } = req.body;
    const userId = req.user.id;

    if (!auditLogId) {
      return res.status(400).json({ error: 'Audit log ID is required' });
    }

    // Verify audit log exists
    const auditLog = await databaseService.getAuditLogById(auditLogId);
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // For now, we'll just track that the user shared it
    // In a real implementation, you might want to create a shares table
    // or add to audit_interactions table
    
    // For now, just return success
    res.json({
      data: { 
        shared: true, 
        shareType,
        message: 'Audit log shared successfully'
      },
      message: 'Audit log shared successfully'
    });
  } catch (error) {
    console.error('Error sharing audit log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get audit log statistics with social features
router.get('/:auditLogId/stats', authenticateToken, async (req, res) => {
  try {
    const { auditLogId } = req.params;

    const stats = await databaseService.getAuditLogStats(auditLogId);

    res.json({
      data: stats
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

