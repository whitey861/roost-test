import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, u.last_login,
             COUNT(DISTINCT bf.id) as files_count,
             COALESCE(SUM(bf.file_size_bytes), 0) as storage_bytes
      FROM users u
      LEFT JOIN backup_files bf ON u.id = bf.user_id AND bf.upload_status = 'completed'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;

    if (!email || !name || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, name, password_hash, role, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, name, passwordHash, role, req.user.id, true]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, name, role, is_active, created_at, last_login`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting own account
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate own account' });
    }

    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id/files', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT bf.id, bf.original_filename, bf.original_path, bf.file_size_bytes,
             bf.checksum_sha256, bf.encryption_type, bf.is_encrypted,
             bf.upload_status, bf.upload_completed_at, bf.created_at,
             bj.name as job_name, bj.id as job_id
      FROM backup_files bf
      JOIN backup_jobs bj ON bf.job_id = bj.id
      WHERE bf.user_id = $1
      ORDER BY bf.created_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get user files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM backup_jobs) as total_jobs,
        (SELECT COALESCE(SUM(file_size_bytes), 0) FROM backup_files WHERE upload_status = 'completed') as total_bytes,
        (SELECT COUNT(*) FROM backup_jobs WHERE status = 'running') as active_jobs
    `);

    const userStats = await query(`
      SELECT u.id, u.name, u.email,
             COUNT(DISTINCT bf.id) as files_count,
             COALESCE(SUM(bf.file_size_bytes), 0) as storage_bytes
      FROM users u
      LEFT JOIN backup_files bf ON u.id = bf.user_id AND bf.upload_status = 'completed'
      WHERE u.is_active = true
      GROUP BY u.id
      ORDER BY storage_bytes DESC
    `);

    res.json({
      platform: stats.rows[0],
      users: userStats.rows
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
