import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { job_id, encryption_type, date_from, date_to, page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let queryText = `
      SELECT bf.id, bf.original_filename, bf.original_path, bf.file_size_bytes,
             bf.checksum_sha256, bf.encryption_type, bf.is_encrypted,
             bf.upload_status, bf.upload_completed_at, bf.created_at, bf.stored_key,
             bj.name as job_name, bj.id as job_id,
             u.name as user_name
      FROM backup_files bf
      JOIN backup_jobs bj ON bf.job_id = bj.id
      JOIN users u ON bf.user_id = u.id
      WHERE bf.upload_status = 'completed'
    `;

    const params = [];
    let paramCount = 1;

    if (!isAdmin) {
      queryText += ` AND bf.user_id = $${paramCount++}`;
      params.push(userId);
    }

    if (job_id) {
      queryText += ` AND bf.job_id = $${paramCount++}`;
      params.push(job_id);
    }

    if (encryption_type) {
      queryText += ` AND bf.encryption_type = $${paramCount++}`;
      params.push(encryption_type);
    }

    if (date_from) {
      queryText += ` AND bf.created_at >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      queryText += ` AND bf.created_at <= $${paramCount++}`;
      params.push(date_to);
    }

    // Count total
    const countQuery = queryText.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` ORDER BY bf.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    res.json({
      files: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT bf.*, bj.name as job_name, bj.encryption_type as job_encryption_type,
             u.name as user_name, u.email as user_email
      FROM backup_files bf
      JOIN backup_jobs bj ON bf.job_id = bj.id
      JOIN users u ON bf.user_id = u.id
      WHERE bf.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    if (file.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(file);
  } catch (err) {
    console.error('Get file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
