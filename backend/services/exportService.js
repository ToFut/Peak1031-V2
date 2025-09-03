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
   * Generate Exchange Summary PDF
   */
  async generateExchangeSummaryPDF(exchange) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('EXCHANGE SUMMARY', { align: 'center' });
      doc.fontSize(12).text(`Exchange #${exchange.exchange_number || exchange.id}`, { align: 'center' });
      doc.moveDown();

      // Exchange Details
      doc.fontSize(14).text('Exchange Information', { underline: true });
      doc.fontSize(10);
      doc.text(`Status: ${exchange.status}`);
      doc.text(`Created: ${new Date(exchange.created_at).toLocaleDateString()}`);
      doc.text(`Contract Value: $${(exchange.proceeds || 0).toLocaleString()}`);
      doc.text(`Boot Received: $${(exchange.boot_received || 0).toLocaleString()}`);
      doc.text(`Boot Paid: $${(exchange.boot_paid || 0).toLocaleString()}`);
      doc.moveDown();

      // Client Information
      if (exchange.client_name) {
        doc.fontSize(14).text('Client Information', { underline: true });
        doc.fontSize(10);
        doc.text(`Name: ${exchange.client_name}`);
        doc.text(`Email: ${exchange.client_email || 'N/A'}`);
        doc.text(`Phone: ${exchange.client_phone || 'N/A'}`);
        doc.moveDown();
      }

      doc.end();
    });
  }

  /**
   * Generate Timeline PDF
   */
  async generateTimelinePDF(exchange) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('EXCHANGE TIMELINE', { align: 'center' });
      doc.fontSize(12).text(`Exchange #${exchange.exchange_number || exchange.id}`, { align: 'center' });
      doc.moveDown();

      // Add timeline events here
      doc.fontSize(10);
      doc.text(`Exchange Created: ${new Date(exchange.created_at).toLocaleDateString()}`);
      if (exchange.identification_deadline) {
        doc.text(`45-Day Identification: ${new Date(exchange.identification_deadline).toLocaleDateString()}`);
      }
      if (exchange.completion_deadline) {
        doc.text(`180-Day Completion: ${new Date(exchange.completion_deadline).toLocaleDateString()}`);
      }
      
      doc.end();
    });
  }

  /**
   * Generate Tax Documents PDF
   */
  async generateTaxDocumentsPDF(exchange) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('TAX DOCUMENTS', { align: 'center' });
      doc.fontSize(12).text(`Exchange #${exchange.exchange_number || exchange.id}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text('1031 Exchange Tax Information', { underline: true });
      doc.fontSize(10);
      doc.text(`Exchange ID: ${exchange.id}`);
      doc.text(`Tax Year: ${new Date(exchange.created_at).getFullYear()}`);
      doc.text(`Relinquished Property Value: $${(exchange.rel_value || 0).toLocaleString()}`);
      doc.text(`Replacement Property Value: $${(exchange.rep_value || 0).toLocaleString()}`);
      doc.text(`Boot Received: $${(exchange.boot_received || 0).toLocaleString()}`);
      doc.text(`Boot Paid: $${(exchange.boot_paid || 0).toLocaleString()}`);
      
      doc.end();
    });
  }

  /**
   * Generate Closing Statement PDF
   */
  async generateClosingStatementPDF(exchange) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('CLOSING STATEMENT', { align: 'center' });
      doc.fontSize(12).text(`Exchange #${exchange.exchange_number || exchange.id}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text('Financial Summary', { underline: true });
      doc.fontSize(10);
      doc.text(`Total Proceeds: $${(exchange.proceeds || 0).toLocaleString()}`);
      doc.text(`Boot Received: $${(exchange.boot_received || 0).toLocaleString()}`);
      doc.text(`Boot Paid: $${(exchange.boot_paid || 0).toLocaleString()}`);
      doc.text(`Net Exchange Value: $${((exchange.proceeds || 0) - (exchange.boot_received || 0) + (exchange.boot_paid || 0)).toLocaleString()}`);
      doc.moveDown();

      doc.fontSize(14).text('Exchange Details', { underline: true });
      doc.fontSize(10);
      doc.text(`Exchange Number: ${exchange.exchange_number || exchange.id}`);
      doc.text(`Status: ${exchange.status}`);
      doc.text(`Closed Date: ${exchange.completed_at ? new Date(exchange.completed_at).toLocaleDateString() : 'Pending'}`);
      
      doc.end();
    });
  }

  /**
   * Generate Full Exchange PDF
   */
  async generateFullExchangePDF(exchange) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title Page
      doc.fontSize(24).text('1031 EXCHANGE REPORT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text(`Exchange #${exchange.exchange_number || exchange.id}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      
      // New page for content
      doc.addPage();
      
      // Exchange Overview
      doc.fontSize(16).text('Exchange Overview', { underline: true });
      doc.fontSize(10);
      doc.text(`Status: ${exchange.status}`);
      doc.text(`Priority: ${exchange.priority || 'Normal'}`);
      doc.text(`Created: ${new Date(exchange.created_at).toLocaleDateString()}`);
      doc.text(`Progress: ${exchange.progress || 0}%`);
      doc.moveDown();

      // Financial Information
      doc.fontSize(16).text('Financial Information', { underline: true });
      doc.fontSize(10);
      doc.text(`Contract Value: $${(exchange.proceeds || 0).toLocaleString()}`);
      doc.text(`Boot Received: $${(exchange.boot_received || 0).toLocaleString()}`);
      doc.text(`Boot Paid: $${(exchange.boot_paid || 0).toLocaleString()}`);
      doc.text(`Net Exchange: $${((exchange.proceeds || 0) - (exchange.boot_received || 0) + (exchange.boot_paid || 0)).toLocaleString()}`);
      doc.moveDown();

      // Property Information
      if (exchange.rel_property_address) {
        doc.fontSize(16).text('Relinquished Property', { underline: true });
        doc.fontSize(10);
        doc.text(`Address: ${exchange.rel_property_address}`);
        doc.text(`Value: $${(exchange.rel_value || 0).toLocaleString()}`);
        doc.moveDown();
      }

      if (exchange.rep_1_property_address) {
        doc.fontSize(16).text('Replacement Property', { underline: true });
        doc.fontSize(10);
        doc.text(`Address: ${exchange.rep_1_property_address}`);
        doc.text(`Value: $${(exchange.rep_1_value || 0).toLocaleString()}`);
        doc.moveDown();
      }

      // Participants
      doc.fontSize(16).text('Participants', { underline: true });
      doc.fontSize(10);
      doc.text(`Client: ${exchange.client_name || 'N/A'}`);
      doc.text(`Coordinator: ${exchange.coordinator_name || 'N/A'}`);
      
      doc.end();
    });
  }

  /**
   * Generate Account Statement PDF
   */
  async generateAccountStatementPDF(exchange) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('ACCOUNT STATEMENT', { align: 'center' });
      doc.fontSize(12).text(`Exchange #${exchange.exchange_number || exchange.id}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Statement Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      // Account Summary
      doc.fontSize(14).text('Account Summary', { underline: true });
      doc.fontSize(10);
      doc.text(`Exchange Number: ${exchange.exchange_number || exchange.id}`);
      doc.text(`Client: ${exchange.client_name || 'N/A'}`);
      doc.text(`Status: ${exchange.status}`);
      doc.moveDown();

      // Financial Summary
      doc.fontSize(14).text('Financial Summary', { underline: true });
      doc.fontSize(10);
      doc.text(`Opening Balance: $${(exchange.proceeds || 0).toLocaleString()}`);
      doc.text(`Boot Received: $${(exchange.boot_received || 0).toLocaleString()}`);
      doc.text(`Boot Paid: $${(exchange.boot_paid || 0).toLocaleString()}`);
      doc.text(`Current Balance: $${((exchange.proceeds || 0) - (exchange.boot_received || 0) + (exchange.boot_paid || 0)).toLocaleString()}`);
      doc.moveDown();

      // Transaction History (placeholder for future implementation)
      doc.fontSize(14).text('Transaction History', { underline: true });
      doc.fontSize(10);
      doc.text('Date       | Description                | Amount        | Balance');
      doc.text('--------------------------------------------------------------');
      doc.text(`${new Date(exchange.created_at).toLocaleDateString()} | Initial Deposit            | $${(exchange.proceeds || 0).toLocaleString()} | $${(exchange.proceeds || 0).toLocaleString()}`);
      
      doc.end();
    });
  }

  /**
   * Generate Proof of Funds PDF
   */
  async generateProofOfFundsPDF(exchange) {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('PROOF OF FUNDS', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      // Letter Content
      doc.fontSize(12);
      doc.text('To Whom It May Concern,');
      doc.moveDown();
      
      doc.text(`This letter serves as proof that funds in the amount of $${(exchange.proceeds || 0).toLocaleString()} are currently held in a Qualified Intermediary account for Exchange #${exchange.exchange_number || exchange.id}.`);
      doc.moveDown();
      
      doc.text('These funds are designated for the completion of a 1031 tax-deferred exchange pursuant to Section 1031 of the Internal Revenue Code.');
      doc.moveDown();

      // Fund Details
      doc.fontSize(14).text('Fund Details:', { underline: true });
      doc.fontSize(10);
      doc.text(`Exchange Number: ${exchange.exchange_number || exchange.id}`);
      doc.text(`Exchanger: ${exchange.client_name || 'N/A'}`);
      doc.text(`Funds Available: $${(exchange.proceeds || 0).toLocaleString()}`);
      doc.text(`Date Funds Received: ${exchange.date_proceeds_received ? new Date(exchange.date_proceeds_received).toLocaleDateString() : 'N/A'}`);
      doc.moveDown();

      doc.fontSize(12);
      doc.text('These funds are held in accordance with all applicable regulations and are available for the acquisition of replacement property as part of the exchange.');
      doc.moveDown();
      
      doc.text('Sincerely,');
      doc.moveDown();
      doc.text('Peak 1031 Exchange Services');
      
      doc.end();
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