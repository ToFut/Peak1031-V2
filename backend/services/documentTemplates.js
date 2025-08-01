const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const Document = require('../models/Document');
const Exchange = require('../models/Exchange');
const Contact = require('../models/Contact');
const User = require('../models/User');

class DocumentTemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.outputDir = path.join(__dirname, '../uploads/generated');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.promises.mkdir(this.templatesDir, { recursive: true });
      await fs.promises.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  /**
   * Get available document templates
   */
  getAvailableTemplates() {
    return [
      {
        id: 'exchange_agreement',
        name: '1031 Exchange Agreement',
        description: 'Standard 1031 exchange agreement document',
        category: 'legal',
        fields: [
          'exchangeId', 'clientName', 'clientAddress', 'exchangeDate',
          'relinquishedProperty', 'replacementProperty', 'exchangeValue'
        ]
      },
      {
        id: 'identification_notice',
        name: '45-Day Identification Notice',
        description: 'Notice of identified replacement properties',
        category: 'notice',
        fields: [
          'exchangeId', 'clientName', 'identificationDate', 'identificationDeadline',
          'replacementProperties', 'exchangeValue'
        ]
      },
      {
        id: 'assignment_agreement',
        name: 'Assignment Agreement',
        description: 'Assignment of exchange agreement',
        category: 'legal',
        fields: [
          'exchangeId', 'clientName', 'assigneeName', 'assignmentDate',
          'originalAgreementDate', 'exchangeValue'
        ]
      },
      {
        id: 'completion_certificate',
        name: 'Exchange Completion Certificate',
        description: 'Certificate of completed 1031 exchange',
        category: 'certificate',
        fields: [
          'exchangeId', 'clientName', 'completionDate', 'relinquishedProperty',
          'replacementProperty', 'exchangeValue', 'coordinatorName'
        ]
      },
      {
        id: 'quarterly_report',
        name: 'Quarterly Exchange Report',
        description: 'Summary report of exchange activity',
        category: 'report',
        fields: [
          'reportPeriod', 'totalExchanges', 'completedExchanges', 'totalValue',
          'clientList', 'coordinatorName'
        ]
      }
    ];
  }

  /**
   * Generate document from template
   */
  async generateDocument(templateId, exchangeId, additionalData = {}) {
    try {
      console.log(`📄 Generating document: ${templateId} for exchange: ${exchangeId}`);
      
      const template = this.getAvailableTemplates().find(t => t.id === templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get exchange data with all relationships
      const exchange = await Exchange.findByPk(exchangeId, {
        include: [
          { model: Contact, as: 'client' },
          { model: User, as: 'coordinator' },
          { model: Contact, as: 'participants' }
        ]
      });

      if (!exchange) {
        throw new Error('Exchange not found');
      }

      // Prepare template data
      const templateData = await this.prepareTemplateData(exchange, additionalData);
      
      // Generate PDF document
      const pdfPath = await this.generatePDF(template, templateData, exchangeId);
      
      // Save document record to database
      const document = await Document.create({
        originalFilename: `${template.name}_${exchange.name}_${Date.now()}.pdf`,
        storedFilename: path.basename(pdfPath),
        filePath: pdfPath,
        fileSize: (await fs.promises.stat(pdfPath)).size,
        mimeType: 'application/pdf',
        exchangeId: exchangeId,
        uploadedBy: null, // System generated
        category: 'generated',
        description: `Auto-generated ${template.name}`,
        isTemplate: false,
        templateId: templateId,
        templateData: templateData
      });

      console.log('✅ Document generated successfully:', document.id);
      
      return {
        success: true,
        document: document,
        templateUsed: template.name,
        filePath: pdfPath
      };

    } catch (error) {
      console.error('❌ Error generating document:', error);
      throw error;
    }
  }

  /**
   * Prepare template data from exchange and additional inputs
   */
  async prepareTemplateData(exchange, additionalData) {
    const client = exchange.client || {};
    const coordinator = exchange.coordinator || {};
    
    return {
      // Exchange data
      exchangeId: exchange.id,
      exchangeName: exchange.name || exchange.exchangeName,
      exchangeStatus: exchange.status || exchange.newStatus,
      exchangeType: exchange.exchangeType,
      exchangeValue: exchange.exchangeValue,
      startDate: exchange.startDate,
      completionDate: exchange.completionDate,
      
      // Client data
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientCompany: client.company,
      clientAddress: client.address,
      
      // Coordinator data
      coordinatorName: coordinator ? `${coordinator.firstName || ''} ${coordinator.lastName || ''}`.trim() : '',
      coordinatorEmail: coordinator?.email,
      coordinatorPhone: coordinator?.phone,
      
      // Property data
      relinquishedProperty: exchange.relinquishedPropertyAddress,
      relinquishedSalePrice: exchange.relinquishedSalePrice,
      relinquishedClosingDate: exchange.relinquishedClosingDate,
      
      // Replacement properties (if any)
      replacementProperties: exchange.replacementProperties || [],
      
      // Dates
      identificationDate: exchange.identificationDate,
      identificationDeadline: exchange.identificationDeadline,
      exchangeDeadline: exchange.exchangeDeadline,
      completionDeadline: exchange.completionDeadline,
      
      // Current date and time
      currentDate: new Date().toLocaleDateString(),
      currentDateTime: new Date().toLocaleString(),
      
      // Company info
      companyName: 'Peak 1031 Exchange Services',
      companyAddress: '123 Exchange Street, Suite 100, Finance City, FC 12345',
      companyPhone: '(555) 123-4567',
      companyEmail: 'info@peak1031.com',
      
      // Additional data passed in
      ...additionalData
    };
  }

  /**
   * Generate PDF document using PDFKit
   */
  async generatePDF(template, data, exchangeId) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `${template.id}_${exchangeId}_${Date.now()}.pdf`;
        const outputPath = path.join(this.outputDir, filename);
        
        const doc = new PDFDocument({
          margin: 50,
          info: {
            Title: template.name,
            Author: 'Peak 1031 Exchange Services',
            Subject: `${template.name} for Exchange ${data.exchangeName}`,
            Creator: 'Peak 1031 Platform'
          }
        });

        doc.pipe(fs.createWriteStream(outputPath));

        // Generate content based on template type
        switch (template.id) {
          case 'exchange_agreement':
            this.generateExchangeAgreement(doc, data);
            break;
          case 'identification_notice':
            this.generateIdentificationNotice(doc, data);
            break;
          case 'assignment_agreement':
            this.generateAssignmentAgreement(doc, data);
            break;
          case 'completion_certificate':
            this.generateCompletionCertificate(doc, data);
            break;
          case 'quarterly_report':
            this.generateQuarterlyReport(doc, data);
            break;
          default:
            this.generateGenericDocument(doc, template, data);
        }

        doc.end();

        doc.on('end', () => {
          resolve(outputPath);
        });

        doc.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Exchange Agreement PDF
   */
  generateExchangeAgreement(doc, data) {
    // Header
    doc.fontSize(20).text('1031 LIKE-KIND EXCHANGE AGREEMENT', { align: 'center' });
    doc.moveDown(2);

    // Agreement details
    doc.fontSize(14).text('AGREEMENT DETAILS', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Exchange ID: ${data.exchangeId}`);
    doc.text(`Date: ${data.currentDate}`);
    doc.text(`Exchange Type: ${data.exchangeType || 'Delayed Exchange'}`);
    doc.moveDown();

    // Parties
    doc.fontSize(14).text('PARTIES TO THE EXCHANGE', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text('EXCHANGER (Client):', { continued: true });
    doc.text(` ${data.clientName}`);
    if (data.clientAddress) {
      doc.text(`Address: ${data.clientAddress}`);
    }
    if (data.clientEmail) {
      doc.text(`Email: ${data.clientEmail}`);
    }
    if (data.clientPhone) {
      doc.text(`Phone: ${data.clientPhone}`);
    }
    doc.moveDown();

    doc.text('QUALIFIED INTERMEDIARY:', { continued: true });
    doc.text(` ${data.companyName}`);
    doc.text(`Address: ${data.companyAddress}`);
    doc.text(`Phone: ${data.companyPhone}`);
    doc.text(`Email: ${data.companyEmail}`);
    doc.moveDown();

    // Property details
    doc.fontSize(14).text('PROPERTY DETAILS', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    if (data.relinquishedProperty) {
      doc.text('RELINQUISHED PROPERTY:', { underline: true });
      doc.text(`Address: ${data.relinquishedProperty}`);
      if (data.relinquishedSalePrice) {
        doc.text(`Sale Price: $${Number(data.relinquishedSalePrice).toLocaleString()}`);
      }
      if (data.relinquishedClosingDate) {
        doc.text(`Closing Date: ${new Date(data.relinquishedClosingDate).toLocaleDateString()}`);
      }
      doc.moveDown();
    }

    // Important dates
    doc.fontSize(14).text('IMPORTANT DATES', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    if (data.identificationDeadline) {
      doc.text(`45-Day Identification Deadline: ${new Date(data.identificationDeadline).toLocaleDateString()}`);
    }
    if (data.exchangeDeadline) {
      doc.text(`180-Day Exchange Deadline: ${new Date(data.exchangeDeadline).toLocaleDateString()}`);
    }
    doc.moveDown();

    // Terms and conditions
    doc.fontSize(14).text('TERMS AND CONDITIONS', { underline: true });
    doc.moveDown();
    
    doc.fontSize(10);
    doc.text('1. This agreement is governed by Section 1031 of the Internal Revenue Code.');
    doc.text('2. The Qualified Intermediary will hold the exchange proceeds in a segregated account.');
    doc.text('3. The Exchanger must identify replacement property within 45 days.');
    doc.text('4. The exchange must be completed within 180 days.');
    doc.text('5. This agreement is legally binding upon execution by all parties.');
    doc.moveDown(2);

    // Signature lines
    doc.fontSize(12);
    doc.text('EXCHANGER SIGNATURE: ____________________________  DATE: __________');
    doc.moveDown();
    doc.text('QI SIGNATURE: ____________________________  DATE: __________');
    
    // Footer
    doc.fontSize(8);
    doc.text(`Generated on ${data.currentDateTime} by Peak 1031 Platform`, 50, doc.page.height - 50);
  }

  /**
   * Generate 45-Day Identification Notice
   */
  generateIdentificationNotice(doc, data) {
    // Header
    doc.fontSize(20).text('45-DAY IDENTIFICATION NOTICE', { align: 'center' });
    doc.moveDown(2);

    // Notice details
    doc.fontSize(14).text('NOTICE DETAILS', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Exchange ID: ${data.exchangeId}`);
    doc.text(`Client: ${data.clientName}`);
    doc.text(`Identification Date: ${data.currentDate}`);
    if (data.identificationDeadline) {
      doc.text(`Identification Deadline: ${new Date(data.identificationDeadline).toLocaleDateString()}`);
    }
    doc.moveDown();

    // Relinquished property
    if (data.relinquishedProperty) {
      doc.fontSize(14).text('RELINQUISHED PROPERTY', { underline: true });
      doc.moveDown();
      
      doc.fontSize(12);
      doc.text(`Address: ${data.relinquishedProperty}`);
      if (data.relinquishedSalePrice) {
        doc.text(`Sale Price: $${Number(data.relinquishedSalePrice).toLocaleString()}`);
      }
      doc.moveDown();
    }

    // Identified replacement properties
    doc.fontSize(14).text('IDENTIFIED REPLACEMENT PROPERTIES', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    if (data.replacementProperties && data.replacementProperties.length > 0) {
      data.replacementProperties.forEach((property, index) => {
        doc.text(`${index + 1}. ${property.address}`);
        if (property.purchasePrice) {
          doc.text(`   Purchase Price: $${Number(property.purchasePrice).toLocaleString()}`);
        }
        if (property.closingDate) {
          doc.text(`   Planned Closing: ${new Date(property.closingDate).toLocaleDateString()}`);
        }
        doc.moveDown(0.5);
      });
    } else {
      doc.text('No replacement properties identified at this time.');
    }
    doc.moveDown();

    // Important notice
    doc.fontSize(10);
    doc.fillColor('red');
    doc.text('IMPORTANT: This identification must be received by the Qualified Intermediary within 45 days of the transfer of the relinquished property to be valid under IRC Section 1031.');
    doc.fillColor('black');
    doc.moveDown(2);

    // Signature
    doc.fontSize(12);
    doc.text('EXCHANGER SIGNATURE: ____________________________  DATE: __________');
    
    // Footer
    doc.fontSize(8);
    doc.text(`Generated on ${data.currentDateTime} by Peak 1031 Platform`, 50, doc.page.height - 50);
  }

  /**
   * Generate Assignment Agreement
   */
  generateAssignmentAgreement(doc, data) {
    doc.fontSize(20).text('ASSIGNMENT AGREEMENT', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text(`Exchange ID: ${data.exchangeId}`);
    doc.text(`Original Exchanger: ${data.clientName}`);
    doc.text(`Assignment Date: ${data.currentDate}`);
    doc.moveDown();

    doc.fontSize(14).text('ASSIGNMENT TERMS', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text('This assignment agreement transfers the rights and obligations of the exchange agreement to the assignee as permitted under IRC Section 1031.');
    doc.moveDown(2);

    doc.text('ORIGINAL EXCHANGER SIGNATURE: ____________________________  DATE: __________');
    doc.moveDown();
    doc.text('ASSIGNEE SIGNATURE: ____________________________  DATE: __________');
    
    // Footer
    doc.fontSize(8);
    doc.text(`Generated on ${data.currentDateTime} by Peak 1031 Platform`, 50, doc.page.height - 50);
  }

  /**
   * Generate Completion Certificate
   */
  generateCompletionCertificate(doc, data) {
    doc.fontSize(20).text('1031 EXCHANGE COMPLETION CERTIFICATE', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).text('CERTIFICATE OF COMPLETION', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Exchange ID: ${data.exchangeId}`);
    doc.text(`Client: ${data.clientName}`);
    doc.text(`Completion Date: ${data.completionDate || data.currentDate}`);
    doc.text(`Coordinator: ${data.coordinatorName}`);
    doc.moveDown();

    doc.text('This certifies that the above-referenced 1031 like-kind exchange has been completed in accordance with IRC Section 1031 and all applicable regulations.');
    doc.moveDown(2);

    if (data.exchangeValue) {
      doc.text(`Total Exchange Value: $${Number(data.exchangeValue).toLocaleString()}`);
      doc.moveDown();
    }

    doc.fontSize(10);
    doc.text('This certificate is issued for record-keeping purposes and does not constitute tax advice. Please consult your tax advisor regarding the tax implications of this exchange.');
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text('QUALIFIED INTERMEDIARY: ____________________________  DATE: __________');
    
    // Footer
    doc.fontSize(8);
    doc.text(`Generated on ${data.currentDateTime} by Peak 1031 Platform`, 50, doc.page.height - 50);
  }

  /**
   * Generate Quarterly Report
   */
  generateQuarterlyReport(doc, data) {
    doc.fontSize(20).text('QUARTERLY EXCHANGE REPORT', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).text('REPORT SUMMARY', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Report Period: ${data.reportPeriod || 'Q1 2024'}`);
    doc.text(`Generated: ${data.currentDate}`);
    doc.text(`Prepared by: ${data.coordinatorName || 'Peak 1031 Team'}`);
    doc.moveDown();

    // Summary statistics
    doc.fontSize(14).text('EXCHANGE STATISTICS', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Total Exchanges: ${data.totalExchanges || 0}`);
    doc.text(`Completed Exchanges: ${data.completedExchanges || 0}`);
    doc.text(`Total Exchange Value: $${Number(data.totalValue || 0).toLocaleString()}`);
    doc.moveDown();

    // Additional report content would go here
    
    // Footer
    doc.fontSize(8);
    doc.text(`Generated on ${data.currentDateTime} by Peak 1031 Platform`, 50, doc.page.height - 50);
  }

  /**
   * Generate generic document for unknown templates
   */
  generateGenericDocument(doc, template, data) {
    doc.fontSize(20).text(template.name.toUpperCase(), { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text(`Exchange ID: ${data.exchangeId}`);
    doc.text(`Client: ${data.clientName}`);
    doc.text(`Generated: ${data.currentDate}`);
    doc.moveDown();

    doc.text('This is a generic document template.');
    
    // Footer
    doc.fontSize(8);
    doc.text(`Generated on ${data.currentDateTime} by Peak 1031 Platform`, 50, doc.page.height - 50);
  }

  /**
   * Bulk generate documents for multiple exchanges
   */
  async bulkGenerateDocuments(templateId, exchangeIds, additionalData = {}) {
    const results = [];
    
    for (const exchangeId of exchangeIds) {
      try {
        const result = await this.generateDocument(templateId, exchangeId, additionalData);
        results.push({
          exchangeId,
          success: true,
          document: result.document
        });
      } catch (error) {
        results.push({
          exchangeId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get generated documents for an exchange
   */
  async getGeneratedDocuments(exchangeId) {
    try {
      const documents = await Document.findAll({
        where: {
          exchangeId,
          category: 'generated'
        },
        order: [['createdAt', 'DESC']]
      });

      return documents;
    } catch (error) {
      console.error('Error fetching generated documents:', error);
      throw error;
    }
  }

  /**
   * Delete generated document
   */
  async deleteGeneratedDocument(documentId) {
    try {
      const document = await Document.findByPk(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      // Delete file from filesystem
      if (fs.existsSync(document.filePath)) {
        await fs.promises.unlink(document.filePath);
      }

      // Delete from database
      await document.destroy();

      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      console.error('Error deleting generated document:', error);
      throw error;
    }
  }
}

module.exports = new DocumentTemplateService();