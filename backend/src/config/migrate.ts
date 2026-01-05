import pool from './database';

const migrate = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatar VARCHAR(500),
        status VARCHAR(50) DEFAULT 'active',
        phone VARCHAR(50),
        department VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      );
    `);

    // Audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Meetings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        subject VARCHAR(500),
        date DATE,
        time TIME,
        end_time TIME,
        location VARCHAR(500),
        meeting_link VARCHAR(1000),
        status VARCHAR(50) DEFAULT 'upcoming',
        purpose TEXT,
        goals JSONB DEFAULT '[]'::jsonb,
        agenda JSONB DEFAULT '[]'::jsonb,
        things_to_be_aware_of TEXT,
        participant_notes TEXT,
        additional_notes JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Alter existing meetings table to allow NULL date
    await client.query(`
      ALTER TABLE meetings ALTER COLUMN date DROP NOT NULL;
    `);

    // Alter additional_notes to JSONB if it's TEXT
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'meetings' 
          AND column_name = 'additional_notes' 
          AND data_type = 'text'
        ) THEN
          ALTER TABLE meetings ALTER COLUMN additional_notes TYPE JSONB USING COALESCE(additional_notes::jsonb, '{}'::jsonb);
        END IF;
      END $$;
    `);

    // Meeting participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(100),
        company VARCHAR(255),
        background TEXT,
        notes TEXT,
        added_from_content BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Meeting tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        assigned_to VARCHAR(255),
        due_date DATE,
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'pending',
        is_urgent BOOLEAN DEFAULT false,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Analytics events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        page VARCHAR(255),
        referrer VARCHAR(500),
        session_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Dashboard stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS dashboard_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stat_type VARCHAR(100) NOT NULL,
        stat_value JSONB NOT NULL,
        period VARCHAR(50),
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
      CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
      CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
      CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
      CREATE INDEX IF NOT EXISTS idx_meeting_tasks_meeting_id ON meeting_tasks(meeting_id);
      CREATE INDEX IF NOT EXISTS idx_meeting_tasks_status ON meeting_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_meeting_tasks_due_date ON meeting_tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default migrate;
