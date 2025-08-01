const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const Exchange = require('../models/Exchange');
const Contact = require('../models/Contact');
const User = require('../models/User');
const Task = require('../models/Task');
const Document = require('../models/Document');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');

class ExportService {
  constructor() {
    this.exportDir = path.join(__dirname, '../exports');
    this.ensureExportDirectory();
  }

  async ensureExportDirectory() {
    try {
      await fs.promises.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error('Error creating export directory:', error);
    }
  }

  /**
   * Export exchanges to PDF report
   */
  async exportExchangesToPDF(filters = {}, userId) {
    try {
      console.log('📊 Generating PDF export for exchanges...');
      
      const filename = `exchanges_report_${Date.now()}.pdf`;
      const filepath = path.join(this.exportDir, filename);

      // Fetch exchange data
      const exchanges = await this.getExchangeData(filters);
      
      // Generate PDF
      await this.generateExchangePDF(exchanges, filepath, filters);
      
      console.log('✅ PDF export completed:', filename);
      
      return {
        success: true,
        filename,
        filepath,
        recordCount: exchanges.length,
        fileSize: (await fs.promises.stat(filepath)).size
      };

    } catch (error) {
      console.error('❌ Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Export exchanges to Excel report
   */
  async exportExchangesToExcel(filters = {}, userId) {
    try {
      console.log('📊 Generating Excel export for exchanges...');
      
      const filename = `exchanges_report_${Date.now()}.xlsx`;
      const filepath = path.join(this.exportDir, filename);

      // Fetch exchange data
      const exchanges = await this.getExchangeData(filters);
      
      // Generate Excel workbook
      await this.generateExchangeExcel(exchanges, filepath, filters);
      
      console.log('✅ Excel export completed:', filename);
      
      return {
        success: true,
        filename,
        filepath,
        recordCount: exchanges.length,
        fileSize: (await fs.promises.stat(filepath)).size
      };

    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      throw error;
    }
  }

  /**
   * Get exchange data with filters
   */
  async getExchangeData(filters = {}) {
    const whereClause = {};
    
    // Apply filters
    if (filters.status) {
      whereClause.status = filters.status;
    }
    
    if (filters.priority) {
      whereClause.priority = filters.priority;
    }
    
    if (filters.dateFrom) {
      whereClause.createdAt = {
        [Op.gte]: new Date(filters.dateFrom)
      };
    }
    
    if (filters.dateTo) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.lte]: new Date(filters.dateTo)
      };
    }
    
    if (filters.coordinatorId) {
      whereClause.coordinatorId = filters.coordinatorId;
    }
    
    if (filters.clientId) {
      whereClause.clientId = filters.clientId;
    }

    const exchanges = await Exchange.findAll({
      where: whereClause,
      include: [
        {
          model: Contact,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'company', 'phone']
        },
        {
          model: User,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Task,
          as: 'tasks',
          where: { isActive: true },
          required: false
        },
        {
          model: Document,
          as: 'exchangeDocuments',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'originalFilename', 'category', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return exchanges;
  }

  /**
   * Generate PDF report
   */
  async generateExchangePDF(exchanges, filepath, filters) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          info: {
            Title: 'Exchange Report',
            Author: 'Peak 1031 Platform',
            Subject: 'Exchange Data Export',
            Creator: 'Peak 1031 Platform'
          }
        });

        doc.pipe(fs.createWriteStream(filepath));

        // Header
        doc.fontSize(20).text('EXCHANGE REPORT', { align: 'center' });
        doc.moveDown();

        // Report metadata
        doc.fontSize(12);
        doc.text(`Generated: ${new Date().toLocaleString()}`);
        doc.text(`Total Records: ${exchanges.length}`);
        
        if (filters.status) doc.text(`Status Filter: ${filters.status}`);
        if (filters.priority) doc.text(`Priority Filter: ${filters.priority}`);
        if (filters.dateFrom) doc.text(`Date From: ${new Date(filters.dateFrom).toLocaleDateString()}`);
        if (filters.dateTo) doc.text(`Date To: ${new Date(filters.dateTo).toLocaleDateString()}`);
        
        doc.moveDown(2);

        // Summary statistics
        const stats = this.calculateExchangeStats(exchanges);
        doc.fontSize(14).text('SUMMARY STATISTICS', { underline: true });
        doc.moveDown();
        
        doc.fontSize(12);
        doc.text(`Active Exchanges: ${stats.active}`);
        doc.text(`Completed Exchanges: ${stats.completed}`);
        doc.text(`Total Value: $${stats.totalValue.toLocaleString()}`);
        doc.text(`Average Value: $${stats.averageValue.toLocaleString()}`);
        doc.moveDown(2);

        // Exchange details
        doc.fontSize(14).text('EXCHANGE DETAILS', { underline: true });
        doc.moveDown();

        exchanges.forEach((exchange, index) => {
          if (index > 0 && index % 3 === 0) {
            doc.addPage();
          }

          doc.fontSize(12);
          doc.text(`${index + 1}. ${exchange.name || exchange.exchangeName}`, { underline: true });
          doc.fontSize(10);
          doc.text(`ID: ${exchange.id}`);
          doc.text(`Status: ${exchange.status || exchange.newStatus}`);
          doc.text(`Priority: ${exchange.priority}`);
          doc.text(`Client: ${exchange.client ? `${exchange.client.firstName} ${exchange.client.lastName}` : 'N/A'}`);
          doc.text(`Coordinator: ${exchange.coordinator ? `${exchange.coordinator.firstName} ${exchange.coordinator.lastName}` : 'N/A'}`);
          doc.text(`Created: ${exchange.createdAt.toLocaleDateString()}`);
          
          if (exchange.exchangeValue) {
            doc.text(`Value: $${Number(exchange.exchangeValue).toLocaleString()}`);
          }
          
          if (exchange.tasks && exchange.tasks.length > 0) {
            doc.text(`Active Tasks: ${exchange.tasks.length}`);
          }
          
          if (exchange.exchangeDocuments && exchange.exchangeDocuments.length > 0) {
            doc.text(`Documents: ${exchange.exchangeDocuments.length}`);
          }
          
          doc.moveDown();
        });

        // Footer
        doc.fontSize(8);
        doc.text(`Report generated by Peak 1031 Platform on ${new Date().toLocaleString()}`, 50, doc.page.height - 50);

        doc.end();
        doc.on('end', resolve);
        doc.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Excel report
   */
  async generateExchangeExcel(exchanges, filepath, filters) {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.createSummarySheet(summarySheet, exchanges, filters);
    
    // Exchange details sheet
    const detailsSheet = workbook.addWorksheet('Exchange Details');
    this.createExchangeDetailsSheet(detailsSheet, exchanges);
    
    // Tasks sheet
    const tasksSheet = workbook.addWorksheet('Tasks');
    this.createTasksSheet(tasksSheet, exchanges);
    
    // Documents sheet
    const documentsSheet = workbook.addWorksheet('Documents');
    this.createDocumentsSheet(documentsSheet, exchanges);

    await workbook.xlsx.writeFile(filepath);
  }

  /**
   * Create summary sheet in Excel
   */
  createSummarySheet(sheet, exchanges, filters) {
    const stats = this.calculateExchangeStats(exchanges);
    
    // Title
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'EXCHANGE REPORT SUMMARY';
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // Metadata
    sheet.getCell('A3').value = 'Generated:';
    sheet.getCell('B3').value = new Date().toLocaleString();
    sheet.getCell('A4').value = 'Total Records:';
    sheet.getCell('B4').value = exchanges.length;
    
    let row = 6;
    if (filters.status) {
      sheet.getCell(`A${row}`).value = 'Status Filter:';
      sheet.getCell(`B${row}`).value = filters.status;
      row++;
    }
    if (filters.priority) {
      sheet.getCell(`A${row}`).value = 'Priority Filter:';
      sheet.getCell(`B${row}`).value = filters.priority;
      row++;
    }
    
    // Statistics
    row += 2;
    sheet.getCell(`A${row}`).value = 'STATISTICS';
    sheet.getCell(`A${row}`).font = { bold: true };
    row++;
    
    sheet.getCell(`A${row}`).value = 'Active Exchanges:';
    sheet.getCell(`B${row}`).value = stats.active;
    row++;
    
    sheet.getCell(`A${row}`).value = 'Completed Exchanges:';
    sheet.getCell(`B${row}`).value = stats.completed;
    row++;
    
    sheet.getCell(`A${row}`).value = 'Total Value:';
    sheet.getCell(`B${row}`).value = stats.totalValue;
    sheet.getCell(`B${row}`).numFmt = '$#,##0.00';
    row++;
    
    sheet.getCell(`A${row}`).value = 'Average Value:';
    sheet.getCell(`B${row}`).value = stats.averageValue;
    sheet.getCell(`B${row}`).numFmt = '$#,##0.00';
    
    // Status breakdown
    row += 2;
    sheet.getCell(`A${row}`).value = 'STATUS BREAKDOWN';
    sheet.getCell(`A${row}`).font = { bold: true };
    row++;
    
    const statusBreakdown = stats.statusBreakdown;
    Object.keys(statusBreakdown).forEach(status => {
      sheet.getCell(`A${row}`).value = status;
      sheet.getCell(`B${row}`).value = statusBreakdown[status];
      row++;
    });
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  /**
   * Create exchange details sheet in Excel
   */
  createExchangeDetailsSheet(sheet, exchanges) {
    // Headers
    const headers = [
      'ID', 'Name', 'Status', 'Priority', 'Type', 'Client Name', 'Client Email',
      'Coordinator Name', 'Exchange Value', 'Created Date', 'Start Date',
      'Identification Deadline', 'Exchange Deadline', 'Active Tasks', 'Documents'
    ];
    
    sheet.addRow(headers);
    
    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    // Add data
    exchanges.forEach(exchange => {
      const client = exchange.client;
      const coordinator = exchange.coordinator;
      
      sheet.addRow([
        exchange.id,
        exchange.name || exchange.exchangeName,
        exchange.status || exchange.newStatus,
        exchange.priority,
        exchange.exchangeType,
        client ? `${client.firstName} ${client.lastName}` : '',
        client?.email || '',
        coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : '',
        exchange.exchangeValue || 0,
        exchange.createdAt,
        exchange.startDate,
        exchange.identificationDeadline,
        exchange.exchangeDeadline,
        exchange.tasks?.length || 0,
        exchange.exchangeDocuments?.length || 0
      ]);
    });
    
    // Format columns
    sheet.getColumn('I').numFmt = '$#,##0.00'; // Exchange Value
    sheet.getColumn('J').numFmt = 'mm/dd/yyyy'; // Created Date
    sheet.getColumn('K').numFmt = 'mm/dd/yyyy'; // Start Date
    sheet.getColumn('L').numFmt = 'mm/dd/yyyy'; // Identification Deadline
    sheet.getColumn('M').numFmt = 'mm/dd/yyyy'; // Exchange Deadline
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  /**
   * Create tasks sheet in Excel
   */
  createTasksSheet(sheet, exchanges) {
    // Headers
    const headers = [
      'Exchange ID', 'Exchange Name', 'Task ID', 'Task Title', 'Status', 'Priority',
      'Assigned To', 'Due Date', 'Created Date', 'Description'
    ];
    
    sheet.addRow(headers);
    
    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    // Add task data
    exchanges.forEach(exchange => {
      if (exchange.tasks && exchange.tasks.length > 0) {
        exchange.tasks.forEach(task => {
          sheet.addRow([
            exchange.id,
            exchange.name || exchange.exchangeName,
            task.id,
            task.title,
            task.status,
            task.priority,
            task.assignedUser ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}` : '',
            task.dueDate,
            task.createdAt,
            task.description
          ]);
        });
      }
    });
    
    // Format date columns
    sheet.getColumn('H').numFmt = 'mm/dd/yyyy'; // Due Date
    sheet.getColumn('I').numFmt = 'mm/dd/yyyy'; // Created Date
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  /**
   * Create documents sheet in Excel
   */
  createDocumentsSheet(sheet, exchanges) {
    // Headers
    const headers = [
      'Exchange ID', 'Exchange Name', 'Document ID', 'Filename', 'Category',
      'Upload Date', 'File Size', 'Uploader'
    ];
    
    sheet.addRow(headers);
    
    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    // Add document data
    exchanges.forEach(exchange => {
      if (exchange.exchangeDocuments && exchange.exchangeDocuments.length > 0) {
        exchange.exchangeDocuments.forEach(doc => {
          sheet.addRow([
            exchange.id,
            exchange.name || exchange.exchangeName,
            doc.id,
            doc.originalFilename,
            doc.category,
            doc.createdAt,
            doc.fileSize || 0,
            doc.uploader ? `${doc.uploader.firstName} ${doc.uploader.lastName}` : ''
          ]);
        });
      }
    });
    
    // Format columns
    sheet.getColumn('F').numFmt = 'mm/dd/yyyy'; // Upload Date
    sheet.getColumn('G').numFmt = '#,##0'; // File Size
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  /**
   * Calculate exchange statistics
   */
  calculateExchangeStats(exchanges) {
    const stats = {
      total: exchanges.length,
      active: 0,
      completed: 0,
      totalValue: 0,
      averageValue: 0,
      statusBreakdown: {}
    };
    
    exchanges.forEach(exchange => {
      const status = exchange.status || exchange.newStatus;
      
      // Count by status
      stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;
      
      // Count active/completed
      if (status === 'Completed') {
        stats.completed++;
      } else {
        stats.active++;
      }
      
      // Sum values
      if (exchange.exchangeValue) {
        stats.totalValue += Number(exchange.exchangeValue);
      }
    });
    
    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
    
    return stats;
  }

  /**
   * Export audit logs to Excel
   */
  async exportAuditLogsToExcel(filters = {}, userId) {
    try {
      console.log('📊 Generating audit log Excel export...');
      
      const filename = `audit_logs_${Date.now()}.xlsx`;
      const filepath = path.join(this.exportDir, filename);

      // Fetch audit log data
      const auditLogs = await this.getAuditLogData(filters);
      
      // Generate Excel workbook
      await this.generateAuditLogExcel(auditLogs, filepath, filters);
      
      console.log('✅ Audit log Excel export completed:', filename);
      
      return {
        success: true,
        filename,
        filepath,
        recordCount: auditLogs.length,
        fileSize: (await fs.promises.stat(filepath)).size
      };

    } catch (error) {
      console.error('❌ Error exporting audit logs to Excel:', error);
      throw error;
    }
  }

  /**
   * Get audit log data with filters
   */
  async getAuditLogData(filters = {}) {
    const whereClause = {};
    
    if (filters.action) {
      whereClause.action = filters.action;
    }
    
    if (filters.entityType) {
      whereClause.entityType = filters.entityType;
    }
    
    if (filters.userId) {
      whereClause.userId = filters.userId;
    }
    
    if (filters.dateFrom) {
      whereClause.createdAt = {
        [Op.gte]: new Date(filters.dateFrom)
      };
    }
    
    if (filters.dateTo) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.lte]: new Date(filters.dateTo)
      };
    }

    const auditLogs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5000 // Limit for performance
    });

    return auditLogs;
  }

  /**
   * Generate audit log Excel report
   */
  async generateAuditLogExcel(auditLogs, filepath, filters) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Audit Logs');
    
    // Headers
    const headers = [
      'ID', 'Action', 'Entity Type', 'Entity ID', 'User Name', 'User Email',
      'IP Address', 'User Agent', 'Date/Time', 'Details'
    ];
    
    sheet.addRow(headers);
    
    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    // Add data
    auditLogs.forEach(log => {
      sheet.addRow([
        log.id,
        log.action,
        log.entityType,
        log.entityId,
        log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        log.user?.email || '',
        log.ipAddress,
        log.userAgent,
        log.createdAt,
        JSON.stringify(log.details)
      ]);
    });
    
    // Format date column
    sheet.getColumn('I').numFmt = 'mm/dd/yyyy hh:mm:ss';
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // Wrap text for details column
    sheet.getColumn('J').alignment = { wrapText: true };
    sheet.getColumn('J').width = 30;

    await workbook.xlsx.writeFile(filepath);
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(maxAgeHours = 24) {
    try {
      const files = await fs.promises.readdir(this.exportDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
      
      for (const file of files) {
        const filepath = path.join(this.exportDir, file);
        const stats = await fs.promises.stat(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.promises.unlink(filepath);
          console.log(`🗑️ Cleaned up old export file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old exports:', error);
    }
  }

  /**
   * Get export file info
   */
  async getExportFile(filename) {
    const filepath = path.join(this.exportDir, filename);
    
    try {
      const stats = await fs.promises.stat(filepath);
      return {
        exists: true,
        filepath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        exists: false,
        filepath: null
      };
    }
  }
}

module.exports = new ExportService();