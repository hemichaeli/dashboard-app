import { Router, Response } from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { query } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// Get all meetings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  const status = req.query.status as string;
  const search = req.query.search as string;

  try {
    let whereClause = 'WHERE m.user_id = $1';
    const params: any[] = [req.user!.id];
    let paramIndex = 2;

    if (status && status !== 'all') {
      whereClause += ` AND m.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (search) {
      whereClause += ` AND (m.title ILIKE $${paramIndex} OR m.subject ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM meetings m ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT m.*, (SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = m.id) as participant_count, (SELECT COUNT(*) FROM meeting_tasks WHERE meeting_id = m.id) as task_count, (SELECT COUNT(*) FROM meeting_tasks WHERE meeting_id = m.id AND is_urgent = true AND status = 'pending') as urgent_tasks FROM meetings m ${whereClause} ORDER BY m.date DESC, m.time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const meetingsWithDetails = await Promise.all(result.rows.map(async (meeting) => {
      const participants = await query('SELECT * FROM meeting_participants WHERE meeting_id = $1', [meeting.id]);
      const tasks = await query('SELECT * FROM meeting_tasks WHERE meeting_id = $1', [meeting.id]);
      return { ...meeting, participants: participants.rows, tasks: tasks.rows };
    }));

    res.json({ meetings: meetingsWithDetails, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

// Get single meeting
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`SELECT * FROM meetings WHERE id = $1 AND user_id = $2`, [req.params.id, req.user!.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const meeting = result.rows[0];
    const participants = await query('SELECT * FROM meeting_participants WHERE meeting_id = $1', [meeting.id]);
    const tasks = await query('SELECT * FROM meeting_tasks WHERE meeting_id = $1', [meeting.id]);
    res.json({ ...meeting, participants: participants.rows, tasks: tasks.rows });
  } catch (error) {
    console.error('Get single meeting error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

// Create meeting
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { title, subject, date, time, end_time, location, meeting_link, purpose, goals, agenda, things_to_be_aware_of, participant_notes, additional_notes, participants } = req.body;
  
  console.log('Create meeting request:', { title, subject, date, time, userId: req.user?.id });
  
  try {
    const result = await query(
      `INSERT INTO meetings (user_id, title, subject, date, time, end_time, location, meeting_link, purpose, goals, agenda, things_to_be_aware_of, participant_notes, additional_notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [req.user!.id, title, subject || null, date || null, time || null, end_time || null, location || null, meeting_link || null, purpose || null, JSON.stringify(goals || []), JSON.stringify(agenda || []), things_to_be_aware_of || null, participant_notes || null, additional_notes || null]
    );
    const meeting = result.rows[0];
    
    if (participants?.length) {
      for (const p of participants) {
        await query(`INSERT INTO meeting_participants (meeting_id, name, email, role, company, background, notes, added_from_content) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [meeting.id, p.name, p.email || null, p.role || null, p.company || null, p.background || null, p.notes || null, p.added_from_content || false]);
      }
    }
    
    const participantsResult = await query('SELECT * FROM meeting_participants WHERE meeting_id = $1', [meeting.id]);
    console.log('Meeting created successfully:', meeting.id);
    res.status(201).json({ ...meeting, participants: participantsResult.rows, tasks: [] });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting', details: String(error) });
  }
});

// Update meeting
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, subject, date, time, end_time, location, meeting_link, status } = req.body;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const result = await query(`UPDATE meetings SET title = COALESCE($1, title), subject = COALESCE($2, subject), date = COALESCE($3, date), time = COALESCE($4, time), end_time = COALESCE($5, end_time), location = COALESCE($6, location), meeting_link = COALESCE($7, meeting_link), status = COALESCE($8, status), updated_at = NOW() WHERE id = $9 RETURNING *`, [title, subject, date, time, end_time, location, meeting_link, status, id]);
    const participants = await query('SELECT * FROM meeting_participants WHERE meeting_id = $1', [id]);
    const tasks = await query('SELECT * FROM meeting_tasks WHERE meeting_id = $1', [id]);
    res.json({ ...result.rows[0], participants: participants.rows, tasks: tasks.rows });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// Delete meeting
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('DELETE FROM meetings WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user!.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// Update brief
router.put('/:id/brief', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { purpose, goals, agenda, things_to_be_aware_of, participant_notes, additional_notes } = req.body;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const result = await query(`UPDATE meetings SET purpose = COALESCE($1, purpose), goals = COALESCE($2, goals), agenda = COALESCE($3, agenda), things_to_be_aware_of = COALESCE($4, things_to_be_aware_of), participant_notes = COALESCE($5, participant_notes), additional_notes = COALESCE($6, additional_notes), updated_at = NOW() WHERE id = $7 RETURNING *`, [purpose, goals ? JSON.stringify(goals) : null, agenda ? JSON.stringify(agenda) : null, things_to_be_aware_of, participant_notes, additional_notes, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update brief error:', error);
    res.status(500).json({ error: 'Failed to update meeting brief' });
  }
});

// Add participant
router.post('/:id/participants', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role, company, background, notes, added_from_content } = req.body;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const result = await query(`INSERT INTO meeting_participants (meeting_id, name, email, role, company, background, notes, added_from_content) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [id, name, email, role, company, background, notes, added_from_content || false]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

// Update participant
router.put('/:id/participants/:participantId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id, participantId } = req.params;
  const { name, email, role, company, background, notes } = req.body;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const result = await query(`UPDATE meeting_participants SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role), company = COALESCE($4, company), background = COALESCE($5, background), notes = COALESCE($6, notes) WHERE id = $7 AND meeting_id = $8 RETURNING *`, [name, email, role, company, background, notes, participantId, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Participant not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// Delete participant
router.delete('/:id/participants/:participantId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id, participantId } = req.params;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const result = await query('DELETE FROM meeting_participants WHERE id = $1 AND meeting_id = $2 RETURNING id', [participantId, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Participant not found' });
    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Delete participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// Extract participants
router.post('/:id/extract-participants', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const extractedNames = new Set<string>();
    const patterns = [/(?:with|from|to|cc|attendees?:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, /(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 2) extractedNames.add(name);
      }
    }
    const emailPattern = /([A-Za-z]+)\.([A-Za-z]+)@/g;
    let emailMatch;
    while ((emailMatch = emailPattern.exec(content)) !== null) {
      extractedNames.add(`${emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1)} ${emailMatch[2].charAt(0).toUpperCase() + emailMatch[2].slice(1)}`);
    }
    const existingParticipants = await query('SELECT LOWER(name) as name FROM meeting_participants WHERE meeting_id = $1', [id]);
    const existingNames = new Set(existingParticipants.rows.map((p) => p.name));
    const newParticipants: any[] = [];
    for (const name of extractedNames) {
      if (!existingNames.has(name.toLowerCase())) {
        const result = await query(`INSERT INTO meeting_participants (meeting_id, name, added_from_content) VALUES ($1, $2, true) RETURNING *`, [id, name]);
        newParticipants.push(result.rows[0]);
      }
    }
    res.json({ extracted: newParticipants.length, participants: newParticipants });
  } catch (error) {
    console.error('Extract participants error:', error);
    res.status(500).json({ error: 'Failed to extract participants' });
  }
});

// Add task
router.post('/:id/tasks', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, assigned_to, due_date, priority, is_urgent } = req.body;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const result = await query(`INSERT INTO meeting_tasks (meeting_id, title, description, assigned_to, due_date, priority, is_urgent) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [id, title, description, assigned_to, due_date, priority || 'medium', is_urgent || false]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add task error:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Update task
router.put('/:id/tasks/:taskId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id, taskId } = req.params;
  const { title, description, assigned_to, due_date, priority, status, is_urgent } = req.body;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const result = await query(`UPDATE meeting_tasks SET title = COALESCE($1, title), description = COALESCE($2, description), assigned_to = COALESCE($3, assigned_to), due_date = COALESCE($4, due_date), priority = COALESCE($5, priority), status = COALESCE($6, status), is_urgent = COALESCE($7, is_urgent), completed_at = CASE WHEN $6 = 'completed' THEN NOW() ELSE completed_at END, updated_at = NOW() WHERE id = $8 AND meeting_id = $9 RETURNING *`, [title, description, assigned_to, due_date, priority, status, is_urgent, taskId, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id/tasks/:taskId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id, taskId } = req.params;
  try {
    const existing = await query('SELECT id FROM meetings WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    const result = await query('DELETE FROM meeting_tasks WHERE id = $1 AND meeting_id = $2 RETURNING id', [taskId, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Complete meeting
router.post('/:id/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(`UPDATE meetings SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`, [id, req.user!.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Complete meeting error:', error);
    res.status(500).json({ error: 'Failed to complete meeting' });
  }
});

export default router;
