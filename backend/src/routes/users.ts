import { Router, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all users
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search as string;
  const role = req.query.role as string;
  const status = req.query.status as string;

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT id, email, name, role, avatar, status, department, created_at, last_login FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({ users: result.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get single user
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, avatar, phone, department, status, created_at, last_login FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Create user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { email, password, name, role = 'user', department, phone } = req.body;
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password, name, role, department, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role, department, phone, status, created_at`,
      [email, hashedPassword, name, role, department, phone]
    );

    await query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, 'create_user', 'user', $2, $3)`, [req.user!.id, result.rows[0].id, JSON.stringify({ email, name, role })]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, role, status, department, phone, avatar } = req.body;

  if (req.user!.id !== id && req.user!.role !== 'admin') return res.status(403).json({ error: 'Cannot update other users' });
  if (role && req.user!.role !== 'admin') return res.status(403).json({ error: 'Only admins can change roles' });

  try {
    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), status = COALESCE($3, status), department = COALESCE($4, department), phone = COALESCE($5, phone), avatar = COALESCE($6, avatar), updated_at = NOW() WHERE id = $7 RETURNING id, email, name, role, avatar, phone, department, status`,
      [name, role, status, department, phone, avatar, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (req.user!.id === id) return res.status(400).json({ error: 'Cannot delete yourself' });

  try {
    const userResult = await query('SELECT email, name FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await query('DELETE FROM users WHERE id = $1', [id]);
    await query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, 'delete_user', 'user', $2, $3)`, [req.user!.id, id, JSON.stringify(userResult.rows[0])]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;