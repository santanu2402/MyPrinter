const fs = require('fs');
const path = require('path');
const { generateSessionId, ensureDir, removeDir } = require('../utils/helpers');

const SESSIONS_DIR = path.join(__dirname, '..', '..', 'sessions');

// Active sessions tracking
const activeSessions = new Map();

/**
 * System name prefix mapping
 */
const SYSTEM_PREFIXES = {
  imgtodoc: 'ImgToDoc',
  txttodoc: 'TxtToDoc',
  duplexprint: 'DuplexPrint',
  docprinter: 'DocPrinter',
};

/**
 * Delete all previous sessions of the same system (both from memory and disk)
 * Fulfills user request: "once new session created delete old session of same system"
 */
function cleanupOldSessionsForSystem(systemType) {
  if (!systemType) return;
  const sysLower = systemType.toLowerCase();
  const prefix = SYSTEM_PREFIXES[sysLower] || systemType;

  // 1. In-memory cleanup for same system
  for (const [id, sess] of activeSessions.entries()) {
    if (sess.systemType && sess.systemType.toLowerCase() === sysLower) {
      removeDir(sess.baseDir);
      activeSessions.delete(id);
      console.log(`[Session] Deleted old in-memory session: ${id}`);
    }
  }

  // 2. On-disk cleanup in sessions/ directory
  if (fs.existsSync(SESSIONS_DIR)) {
    try {
      const entries = fs.readdirSync(SESSIONS_DIR);
      let deletedCount = 0;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const entry of entries) {
        const fullPath = path.join(SESSIONS_DIR, entry);
        try {
          if (fs.statSync(fullPath).isDirectory()) {
            // Match same system prefix (e.g. "ImgToDoc_...") or legacy UUID directories
            const isSameSystem = entry.startsWith(`${prefix}_`) || entry.toLowerCase().startsWith(`${sysLower}_`);
            const isLegacyUuid = uuidRegex.test(entry);

            if (isSameSystem || isLegacyUuid) {
              removeDir(fullPath);
              deletedCount++;
              console.log(`[Session] Deleted old session folder: ${entry}`);
            }
          }
        } catch (e) {
          // Skip if already removed
        }
      }
      if (deletedCount > 0) {
        console.log(`[Session] Purged ${deletedCount} old session(s) on creating new ${systemType} session`);
      }
    } catch (err) {
      console.warn(`[Session] Warning during old session cleanup:`, err.message);
    }
  }
}

/**
 * Create a new session with dedicated folders
 * Automatically deletes any old sessions of the same system
 */
function createSession(systemType) {
  // Purge any existing sessions of the same system
  cleanupOldSessionsForSystem(systemType);

  let sessionId = generateSessionId(systemType);
  if (activeSessions.has(sessionId) || fs.existsSync(path.join(SESSIONS_DIR, sessionId))) {
    const ms = String(new Date().getMilliseconds()).padStart(3, '0');
    sessionId += `_${ms}`;
  }
  const sessionDir = path.join(SESSIONS_DIR, sessionId);
  
  const session = {
    id: sessionId,
    systemType,
    createdAt: new Date().toISOString(),
    inputDir: ensureDir(path.join(sessionDir, 'input')),
    outputDir: ensureDir(path.join(sessionDir, 'output')),
    workspaceDir: ensureDir(path.join(sessionDir, 'workspace')),
    baseDir: sessionDir,
    status: 'active',
  };
  
  activeSessions.set(sessionId, session);
  console.log(`[Session] Created session ${sessionId} for ${systemType}`);
  return session;
}

/**
 * Get a session by ID
 */
function getSession(sessionId) {
  return activeSessions.get(sessionId) || null;
}

/**
 * End a session - clean up input and workspace, keep output
 */
function endSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  
  // Clean up input and workspace directories
  removeDir(session.inputDir);
  removeDir(session.workspaceDir);
  
  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  
  console.log(`[Session] Ended session ${sessionId} - cleaned input & workspace`);
  return true;
}

/**
 * Fully delete a session including output
 */
function deleteSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    removeDir(session.baseDir);
    activeSessions.delete(sessionId);
    console.log(`[Session] Deleted session ${sessionId}`);
  }
  return true;
}

/**
 * List all active sessions
 */
function listSessions() {
  return Array.from(activeSessions.values());
}

/**
 * Get session output directory
 */
function getOutputDir(sessionId) {
  const session = activeSessions.get(sessionId);
  return session ? session.outputDir : null;
}

module.exports = {
  createSession,
  getSession,
  endSession,
  deleteSession,
  listSessions,
  getOutputDir,
  cleanupOldSessionsForSystem,
  SESSIONS_DIR,
};
