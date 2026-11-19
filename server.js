const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/imgtodoc', require('./src/routes/imgtodoc'));
app.use('/api/txttodoc', require('./src/routes/txttodoc'));
app.use('/api/duplexprint', require('./src/routes/duplexprint'));
app.use('/api/docprinter', require('./src/routes/docprinter'));
app.use('/api/printer', require('./src/routes/printer'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Catch-all: serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🖨️  MyPrinter is running at http://localhost:${PORT}\n`);
  console.log('Systems available:');
  console.log('  📸 System A - ImgToDoc (Image to Document)');
  console.log('  📝 System B - TxtToDoc (Text to Document)');
  console.log('  📄 System C - DuplexPrint (Double-sided Printing)');
  console.log('  🖨️  System D - DocPrinter (Document Printer)');
  console.log('');
});
