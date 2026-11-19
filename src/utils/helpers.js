const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

/**
 * Generate a meaningful, human-readable session ID with system name and datetime:
 * Format: <SystemName>_<YYYY-MM-DD>_<HH-mm-ss>
 * Example: ImgToDoc_2026-10-20_12-58-30
 */
function generateSessionId(systemType = "session") {
  const systemNames = {
    imgtodoc: "ImgToDoc",
    txttodoc: "TxtToDoc",
    duplexprint: "DuplexPrint",
    docprinter: "DocPrinter",
  };
  const sys = systemNames[systemType.toLowerCase()] || systemType;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return `${sys}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Ensure a directory exists, create if not
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Delete a directory and all its contents
 */
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Get file extension
 */
function getFileExt(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Check if file is an image
 */
function isImageFile(filename) {
  const ext = getFileExt(filename);
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'].includes(ext);
}

/**
 * Check if file is a PDF
 */
function isPdfFile(filename) {
  return getFileExt(filename) === '.pdf';
}

/**
 * Check if file is a document
 */
function isDocFile(filename) {
  const ext = getFileExt(filename);
  return ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'].includes(ext);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\-\.]/gi, '_').substring(0, 100);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateSessionId,
  ensureDir,
  removeDir,
  getFileExt,
  isImageFile,
  isPdfFile,
  isDocFile,
  formatFileSize,
  sanitizeFilename,
  sleep,
};
