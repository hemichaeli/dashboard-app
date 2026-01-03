import { Router, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { query } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// Get dashboard stats
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const usersResult = await query('SELECT COUNT(*) as total FROM users WHERE status = $1', ['active']);
    const totalUsers = parseInt(usersResult.rows[0].total);
    const meetingsResult = await query('SELECT COUNT(*) as total FROM meetings WHERE user_id = $1', [req.user!.id]);
    const totalMeetings = parseInt(meetingsResult.rows[0].total);
    const upcomingResult = await query(`SELECT COUNT(*) as total FROM meetings WHERE user_id = $1 AND status = 'upcoming'`, [req.user!.id]);
    const upcomingMeetings = parseInt(upcomingResult.rows[0].total);
    const completedMeetingsResult = await query(`SELECT COUNT(*) as total FROM meetings WHERE user_id = $1 AND status = 'completed'`, [req.user!.id]);
    const completedMeetings = parseInt(completedMeetingsResult.rows[0].total);
    const totalTasksResult = await query(`SELECT COUNT(*) as total FROM meeting_tasks mt JOIN meetings m ON m.id = mt.meeting_id WHERE m.user_id = $1`, [req.user!.id]);
    const totalTasks = parseInt(totalTasksResult.rows[0].total);
    const completedTasksResult = await query(`SELECT COUNT(*) as total FROM meeting_tasks mt JOIN meetings m ON m.id = mt.meeting_id WHERE m.user_id = $1 AND mt.status = 'completed'`, [req.user!.id]);
    const completedTasks = parseInt(completedTasksResult.rows[0].total);
    const urgentTasksResult = await query(`SELECT COUNT(*) as total FROM meeting_tasks mt JOIN meetings m ON m.id = mt.meeting_id WHERE m.user_id = $1 AND mt.status = 'pending' AND mt.is_urgent = true`, [req.user!.id]);
    const urgentTasks = parseInt(urgentTasksResult.rows[0].total);
    const overdueResult = await query(`SELECT COUNT(*) as total FROM meeting_tasks mt JOIN meetings m ON m.id = mt.meeting_id WHERE m.user_id = $1 AND mt.status = 'pending' AND mt.due_date < CURRENT_DATE`, [req.user!.id]);
    const overdueTasksCount = parseInt(overdueResult.rows[0].total);

    res.json({ totalUsers, totalMeetings, totalTasks, completedTasks, upcomingMeetings, completedMeetings, urgentTasks, overdueTasksCount });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Get meetings by date
router.get('/meetings-by-date', authenticateToken, async (req: AuthRequest, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  try {
    const result = await query(`SELECT to_char(date, 'YYYY-MM-DD') as date, COUNT(*) as count FROM meetings WHERE user_id = $1 AND date >= $2 GROUP BY date ORDER BY date`, [req.user!.id, startDate]);
    res.json(result.rows.map(row => ({ date: row.date, count: parseInt(row.count) })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get meetings data' });
  }
});

// Get task statistics
router.get('/tasks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`SELECT COALESCE(SUM(CASE WHEN mt.status = 'pending' THEN 1 ELSE 0 END), 0) as pending, COALESCE(SUM(CASE WHEN mt.status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress, COALESCE(SUM(CASE WHEN mt.status = 'completed' THEN 1 ELSE 0 END), 0) as completed FROM meeting_tasks mt JOIN meetings m ON m.id = mt.meeting_id WHERE m.user_id = $1`, [req.user!.id]);
    res.json({ pending: parseInt(result.rows[0].pending), in_progress: parseInt(result.rows[0].in_progress), completed: parseInt(result.rows[0].completed) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get task statistics' });
  }
});

// Get user activity
router.get('/user-activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  try {
    const result = await query(`SELECT u.name as user_name, COUNT(DISTINCT m.id) as meetings_count, COUNT(DISTINCT mt.id) as tasks_count FROM users u LEFT JOIN meetings m ON m.user_id = u.id LEFT JOIN meeting_tasks mt ON mt.meeting_id = m.id WHERE u.status = 'active' GROUP BY u.id, u.name ORDER BY meetings_count DESC, tasks_count DESC LIMIT $1`, [limit]);
    res.json(result.rows.map(row => ({ user_name: row.user_name, meetings_count: parseInt(row.meetings_count), tasks_count: parseInt(row.tasks_count) })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user activity' });
  }
});

// Track event
router.post('/track', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { event_type, event_data, page, referrer, session_id } = req.body;
  try {
    await query(`INSERT INTO analytics_events (user_id, event_type, event_data, page, referrer, session_id) VALUES ($1, $2, $3, $4, $5, $6)`, [req.user!.id, event_type, event_data ? JSON.stringify(event_data) : null, page, referrer, session_id]);
    res.status(201).json({ message: 'Event tracked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get recent activity
router.get('/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  try {
    const result = await query(`SELECT al.*, u.name as user_name, u.email as user_email FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE al.user_id = $1 ORDER BY al.created_at DESC LIMIT $2`, [req.user!.id, limit]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity log' });
  }
});

export default router;