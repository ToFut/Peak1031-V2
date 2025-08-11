const express = require('express');
const cors = require('cors');
const { authenticateToken } = require('./middleware/auth');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/documents/templates', authenticateToken, async (req, res) => {
  try {
    const supabaseService = require('./services/supabase');
    
    console.log('Templates endpoint called by user:', req.user?.email);
    
    // Fetch templates from Supabase
    const templates = await supabaseService.select('document_templates', {
      where: { is_active: true },
      orderBy: { column: 'created_at', ascending: false }
    });
    
    console.log(`Found ${templates?.length || 0} templates`);
    
    res.json(templates || []);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5002; // Different port to avoid conflicts
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/documents/templates`);
});