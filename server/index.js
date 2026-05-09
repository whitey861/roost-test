import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createStorageProvider } from './storage/index.js';
import { SimulatedWasabiProvider } from './storage/SimulatedWasabiProvider.js';
import { authenticateToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import jobsRoutes from './routes/jobs.js';
import uploadRoutes from './routes/upload.js';
import filesRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';
import { getUploadSession, cleanupUploadSession } from './routes/upload.js';
import { createReadStream } from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize storage provider
const storageProvider = createStorageProvider();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/jobs', authenticateToken, jobsRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/files', authenticateToken, filesRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Storage transfer route (for finalizing uploads)
app.post('/api/storage/transfer/:session_id', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.params;
    const session = getUploadSession(session_id);

    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    if (session.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!session.finalPath) {
      return res.status(400).json({ error: 'Upload not completed' });
    }

    // Transfer to storage provider
    const fileStream = createReadStream(session.finalPath);

    await storageProvider.putObject(
      session.storedKey,
      fileStream,
      {
        originalFilename: session.filename,
        userId: session.userId.toString(),
        jobId: session.jobId.toString(),
        fileId: session.fileId.toString()
      }
    );

    // Clean up
    cleanupUploadSession(session_id);

    res.json({ success: true, message: 'File transferred to storage successfully' });
  } catch (err) {
    console.error('Storage transfer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download route (for simulated storage)
app.get('/api/storage/download/:key(*)', authenticateToken, async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);

    // Verify user has access to this file
    const keyParts = key.split('/');
    if (keyParts[0] === 'users' && keyParts[1]) {
      const fileUserId = parseInt(keyParts[1]);
      if (fileUserId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (storageProvider instanceof SimulatedWasabiProvider) {
      const stream = await storageProvider.getObjectStream(key);
      const head = await storageProvider.headObject(key);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', head.size);
      res.setHeader('Content-Disposition', `attachment; filename="${head.metadata.originalFilename || 'download'}"`);

      stream.pipe(res);
    } else {
      const url = await storageProvider.getObjectUrl(key);
      res.redirect(url);
    }
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`VaultSync server running on port ${port}`);
  console.log(`Storage provider: ${process.env.STORAGE_PROVIDER || 'simulated'}`);
});

export default app;
