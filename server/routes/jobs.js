import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, description, encryption_type, key_hint, encryption_key_hash } = req.body;
    const userId = req.user.id;

    const result = await query(
      `INSERT INTO backup_jobs (user_id, name, description, status, encryption_type, encryption_key_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, status, encryption_type, created_at`,
      [userId, name, description, 'queued', encryption_type, encryption_key_hash]
    );

    const job = result.rows[0];

    // If escrow encryption, store the encrypted key
    if (encryption_type === 'aes256_escrow' && req.body.encrypted_key_blob) {
      await query(
        `INSERT INTO escrow_keys (job_id, user_id, encrypted_key_blob, key_hint)
         VALUES ($1, $2, $3, $4)`,
        [job.id, userId, req.body.encrypted_key_blob, key_hint]
      );
    }

    res.json(job);
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    let queryText;
    let params;

    if (req.user.role === 'admin') {
      queryText = `
        SELECT j.*, u.name as user_name, u.email as user_email
        FROM backup_jobs j
        JOIN users u ON j.user_id = u.id
        ORDER BY j.created_at DESC
      `;
      params = [];
    } else {
      queryText = `
        SELECT *
        FROM backup_jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const jobResult = await query(
      'SELECT * FROM backup_jobs WHERE id = $1',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];

    if (job.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get files for this job
    const filesResult = await query(
      `SELECT id, original_filename, original_path, file_size_bytes, checksum_sha256,
              encryption_type, is_encrypted, upload_status, upload_started_at,
              upload_completed_at, created_at
       FROM backup_files
       WHERE job_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      ...job,
      files: filesResult.rows
    });
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const jobResult = await query(
      'SELECT * FROM backup_jobs WHERE id = $1',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];

    if (job.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['queued', 'running'].includes(job.status)) {
      return res.status(400).json({ error: 'Job cannot be cancelled' });
    }

    await query(
      `UPDATE backup_jobs
       SET status = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      ['cancelled', id]
    );

    res.json({ message: 'Job cancelled successfully' });
  } catch (err) {
    console.error('Cancel job error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const jobResult = await query(
      'SELECT * FROM backup_jobs WHERE id = $1',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];

    if (job.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['completed', 'failed', 'cancelled'].includes(job.status)) {
      return res.status(400).json({ error: 'Cannot delete active job' });
    }

    // Delete job (cascades to files and escrow keys)
    await query('DELETE FROM backup_jobs WHERE id = $1', [id]);

    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
