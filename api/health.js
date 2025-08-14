// Vercel serverless function for health check
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'peak1031-api' 
  });
}