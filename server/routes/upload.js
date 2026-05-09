import express from 'express';
import { query } from '../db/index.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const router = express.Router();

const uploadSessions = new Map();

router.post('/init', async (req, res) => {
  try {
    const { job_id, filename, original_path, file_size, checksum_sha256, encryption_type } = req.body;
    const userId = req.user.id;

    // Verify job belongs to user
    const jobResult = await query(
      'SELECT id, user_id FROM backup_jobs WHERE id = $1',
      [job_id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobResult.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    const storedKey = `users/${userId}/jobs/${job_id}/${sessionId}_${filename}`;

    // Create backup_files record
    const fileResult = await query(
      `INSERT INTO backup_files (job_id, user_id, original_filename, original_path, stored_key, file_size_bytes, checksum_sha256, encryption_type, is_encrypted, upload_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [job_id, userId, filename, original_path, storedKey, file_size, checksum_sha256, encryption_type, encryption_type !== 'none', 'pending']
    );

    const fileId = fileResult.rows[0].id;

    // Create upload session
    const chunksDir = path.join('/tmp', 'vaultsync_chunks', sessionId);
    await fs.mkdir(chunksDir, { recursive: true });

    uploadSessions.set(sessionId, {
      fileId,
      jobId: job_id,
      userId,
      filename,
      storedKey,
      fileSize: file_size,
      checksum: checksum_sha256,
      chunksDir,
      chunks: [],
      createdAt: Date.now()
    });

    res.json({ upload_session_id: sessionId, file_id: fileId });
  } catch (err) {
    console.error('Upload init error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:session_id/chunk/:chunk_index', async (req, res) => {
  try {
    const { session_id, chunk_index } = req.params;
    const session = uploadSessions.get(session_id);

    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    if (session.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chunkPath = path.join(session.chunksDir, `chunk_${chunk_index}`);
    const writeStream = createWriteStream(chunkPath);

    await pipeline(req, writeStream);

    session.chunks.push(parseInt(chunk_index));

    res.json({ success: true, chunk_index: parseInt(chunk_index) });
  } catch (err) {
    console.error('Chunk upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:session_id/complete', async (req, res) => {
  try {
    const { session_id } = req.params;
    const session = uploadSessions.get(session_id);

    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    if (session.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update file status
    await query(
      'UPDATE backup_files SET upload_status = $1, upload_started_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['uploading', session.fileId]
    );

    // Sort chunks
    session.chunks.sort((a, b) => a - b);

    // Concatenate chunks into single file
    const finalPath = path.join(session.chunksDir, 'final');
    const finalStream = createWriteStream(finalPath);

    for (const chunkIndex of session.chunks) {
      const chunkPath = path.join(session.chunksDir, `chunk_${chunkIndex}`);
      const chunkStream = createReadStream(chunkPath);
      await pipeline(chunkStream, finalStream, { end: false });
    }

    finalStream.end();

    await new Promise((resolve, reject) => {
      finalStream.on('finish', resolve);
      finalStream.on('error', reject);
    });

    // Hand off to storage provider (will be done by the storage route handler)
    // For now, mark as completed
    await query(
      'UPDATE backup_files SET upload_status = $1, upload_completed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', session.fileId]
    );

    // Update job progress
    await query(
      `UPDATE backup_jobs
       SET completed_files = completed_files + 1,
           completed_bytes = completed_bytes + $1
       WHERE id = $2`,
      [session.fileSize, session.jobId]
    );

    // Store final path in session for storage provider
    session.finalPath = finalPath;

    res.json({
      success: true,
      file_id: session.fileId,
      message: 'Upload complete, transferring to storage...'
    });

    // Clean up chunks in background (keep final file for storage provider)
    setImmediate(async () => {
      try {
        for (const chunkIndex of session.chunks) {
          const chunkPath = path.join(session.chunksDir, `chunk_${chunkIndex}`);
          await fs.unlink(chunkPath).catch(() => {});
        }
      } catch (err) {
        console.error('Chunk cleanup error:', err);
      }
    });

  } catch (err) {
    console.error('Upload complete error:', err);

    // Mark as failed
    const session = uploadSessions.get(req.params.session_id);
    if (session) {
      await query(
        'UPDATE backup_files SET upload_status = $1 WHERE id = $2',
        ['failed', session.fileId]
      );
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:session_id/abort', async (req, res) => {
  try {
    const { session_id } = req.params;
    const session = uploadSessions.get(session_id);

    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    if (session.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark as failed
    await query(
      'UPDATE backup_files SET upload_status = $1 WHERE id = $2',
      ['failed', session.fileId]
    );

    // Clean up
    await fs.rm(session.chunksDir, { recursive: true, force: true });
    uploadSessions.delete(session_id);

    res.json({ success: true });
  } catch (err) {
    console.error('Upload abort error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upload session (for storage provider access)
export function getUploadSession(sessionId) {
  return uploadSessions.get(sessionId);
}

// Clean up upload session
export function cleanupUploadSession(sessionId) {
  const session = uploadSessions.get(sessionId);
  if (session) {
    fs.rm(session.chunksDir, { recursive: true, force: true }).catch(() => {});
    uploadSessions.delete(sessionId);
  }
}

export default router;
