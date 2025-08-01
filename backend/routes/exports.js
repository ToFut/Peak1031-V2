const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const ExportService = require('../services/exportService');
const AuditService = require('../services/audit');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * POST /api/exports/exchanges/pdf
 * Export exchanges to PDF report
 */
router.post('/exchanges/pdf', [
  authenticateToken,
  checkPermission('exports', 'read'),
  query('status').optional().isIn(['Draft', 'In Progress', '45-Day Period', '180-Day Period', 'Completed', 'Cancelled', 'On Hold']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('coordinatorId').optional().isUUID(),
  query('clientId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      coordinatorId: req.query.coordinatorId,
      clientId: req.query.clientId
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await ExportService.exportExchangesToPDF(filters, req.user.id);

    // Log export activity
    await AuditService.log({
      action: 'EXPORT_PDF_GENERATED',
      entityType: 'export',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exportType: 'exchanges_pdf',
        filters,
        filename: result.filename,
        recordCount: result.recordCount
      }
    });

    res.json({
      success: true,
      message: 'PDF export generated successfully',
      data: {
        filename: result.filename,
        recordCount: result.recordCount,
        fileSize: result.fileSize,
        downloadUrl: `/api/exports/download/${result.filename}`
      }
    });

  } catch (error) {
    console.error('Error generating PDF export:', error);
    res.status(500).json({
      error: 'Failed to generate PDF export',
      message: error.message
    });
  }
});

/**
 * POST /api/exports/exchanges/excel
 * Export exchanges to Excel report
 */
router.post('/exchanges/excel', [
  authenticateToken,
  checkPermission('exports', 'read'),
  query('status').optional().isIn(['Draft', 'In Progress', '45-Day Period', '180-Day Period', 'Completed', 'Cancelled', 'On Hold']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('coordinatorId').optional().isUUID(),
  query('clientId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      coordinatorId: req.query.coordinatorId,
      clientId: req.query.clientId
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await ExportService.exportExchangesToExcel(filters, req.user.id);

    // Log export activity
    await AuditService.log({
      action: 'EXPORT_EXCEL_GENERATED',
      entityType: 'export',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exportType: 'exchanges_excel',
        filters,
        filename: result.filename,
        recordCount: result.recordCount
      }
    });

    res.json({
      success: true,
      message: 'Excel export generated successfully',
      data: {
        filename: result.filename,
        recordCount: result.recordCount,
        fileSize: result.fileSize,
        downloadUrl: `/api/exports/download/${result.filename}`
      }
    });

  } catch (error) {
    console.error('Error generating Excel export:', error);
    res.status(500).json({
      error: 'Failed to generate Excel export',
      message: error.message
    });
  }
});

/**
 * POST /api/exports/audit-logs/excel
 * Export audit logs to Excel report
 */
router.post('/audit-logs/excel', [
  authenticateToken,
  checkPermission('audit', 'read'),
  query('action').optional().isLength({ min: 1, max: 100 }),
  query('entityType').optional().isLength({ min: 1, max: 50 }),
  query('userId').optional().isUUID(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const filters = {
      action: req.query.action,
      entityType: req.query.entityType,
      userId: req.query.userId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await ExportService.exportAuditLogsToExcel(filters, req.user.id);

    // Log export activity
    await AuditService.log({
      action: 'EXPORT_AUDIT_LOGS_GENERATED',
      entityType: 'export',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exportType: 'audit_logs_excel',
        filters,
        filename: result.filename,
        recordCount: result.recordCount
      }
    });

    res.json({
      success: true,
      message: 'Audit logs Excel export generated successfully',
      data: {
        filename: result.filename,
        recordCount: result.recordCount,
        fileSize: result.fileSize,
        downloadUrl: `/api/exports/download/${result.filename}`
      }
    });

  } catch (error) {
    console.error('Error generating audit logs Excel export:', error);
    res.status(500).json({
      error: 'Failed to generate audit logs Excel export',
      message: error.message
    });
  }
});

/**
 * GET /api/exports/download/:filename
 * Download an export file
 */
router.get('/download/:filename', [
  authenticateToken,
  checkPermission('exports', 'read')
], async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'Invalid filename'
      });
    }

    const fileInfo = await ExportService.getExportFile(filename);
    
    if (!fileInfo.exists) {
      return res.status(404).json({
        error: 'Export file not found',
        message: 'The requested export file does not exist or has expired'
      });
    }

    // Log file download
    await AuditService.log({
      action: 'EXPORT_FILE_DOWNLOADED',
      entityType: 'export',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        filename,
        fileSize: fileInfo.size
      }
    });

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileInfo.size);

    // Stream the file
    const fileStream = fs.createReadStream(fileInfo.filepath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming export file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to download export file',
          message: error.message
        });
      }
    });

  } catch (error) {
    console.error('Error downloading export file:', error);
    res.status(500).json({
      error: 'Failed to download export file',
      message: error.message
    });
  }
});

/**
 * GET /api/exports/status
 * Get export service status and available export types
 */
router.get('/status', [
  authenticateToken,
  checkPermission('exports', 'read')
], async (req, res) => {
  try {
    // Clean up old exports
    await ExportService.cleanupOldExports(24);

    res.json({
      success: true,
      data: {
        available_exports: [
          {
            type: 'exchanges_pdf',
            name: 'Exchange Report (PDF)',
            description: 'Comprehensive PDF report of exchanges with summary statistics',
            format: 'PDF',
            endpoint: '/api/exports/exchanges/pdf'
          },
          {
            type: 'exchanges_excel',
            name: 'Exchange Report (Excel)',
            description: 'Detailed Excel workbook with multiple sheets (Summary, Details, Tasks, Documents)',
            format: 'Excel',
            endpoint: '/api/exports/exchanges/excel'
          },
          {
            type: 'audit_logs_excel',
            name: 'Audit Logs (Excel)',
            description: 'Complete audit trail export in Excel format',
            format: 'Excel',
            endpoint: '/api/exports/audit-logs/excel'
          }
        ],
        filters: {
          exchanges: [
            { name: 'status', type: 'select', options: ['Draft', 'In Progress', '45-Day Period', '180-Day Period', 'Completed', 'Cancelled', 'On Hold'] },
            { name: 'priority', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            { name: 'dateFrom', type: 'date', description: 'Filter exchanges created from this date' },
            { name: 'dateTo', type: 'date', description: 'Filter exchanges created to this date' },
            { name: 'coordinatorId', type: 'uuid', description: 'Filter by coordinator ID' },
            { name: 'clientId', type: 'uuid', description: 'Filter by client ID' }
          ],
          audit_logs: [
            { name: 'action', type: 'text', description: 'Filter by audit action' },
            { name: 'entityType', type: 'text', description: 'Filter by entity type' },
            { name: 'userId', type: 'uuid', description: 'Filter by user ID' },
            { name: 'dateFrom', type: 'date', description: 'Filter logs from this date' },
            { name: 'dateTo', type: 'date', description: 'Filter logs to this date' }
          ]
        },
        cleanup_info: {
          max_file_age_hours: 24,
          cleanup_message: 'Export files are automatically cleaned up after 24 hours'
        }
      }
    });

  } catch (error) {
    console.error('Error getting export status:', error);
    res.status(500).json({
      error: 'Failed to get export status',
      message: error.message
    });
  }
});

/**
 * DELETE /api/exports/cleanup
 * Manually trigger cleanup of old export files (admin only)
 */
router.delete('/cleanup', [
  authenticateToken,
  checkPermission('exports', 'write'),
  query('maxAgeHours').optional().isInt({ min: 1, max: 168 }) // Max 1 week
], async (req, res) => {
  try {
    const maxAgeHours = parseInt(req.query.maxAgeHours) || 24;
    
    await ExportService.cleanupOldExports(maxAgeHours);

    // Log cleanup activity
    await AuditService.log({
      action: 'EXPORT_CLEANUP_EXECUTED',
      entityType: 'export',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        maxAgeHours
      }
    });

    res.json({
      success: true,
      message: `Export cleanup completed for files older than ${maxAgeHours} hours`
    });

  } catch (error) {
    console.error('Error cleaning up exports:', error);
    res.status(500).json({
      error: 'Failed to cleanup exports',
      message: error.message
    });
  }
});

module.exports = router;