-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Backup jobs table
CREATE TABLE IF NOT EXISTS backup_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    encryption_type VARCHAR(20) NOT NULL CHECK (encryption_type IN ('none', 'aes256_local', 'aes256_escrow')),
    encryption_key_hash VARCHAR(255),
    total_files INTEGER DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    completed_files INTEGER DEFAULT 0,
    completed_bytes BIGINT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup files table
CREATE TABLE IF NOT EXISTS backup_files (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES backup_jobs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(500) NOT NULL,
    original_path TEXT,
    stored_key VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64),
    encryption_type VARCHAR(20) NOT NULL CHECK (encryption_type IN ('none', 'aes256_local', 'aes256_escrow')),
    is_encrypted BOOLEAN DEFAULT FALSE,
    upload_status VARCHAR(20) NOT NULL CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    upload_started_at TIMESTAMP,
    upload_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Escrow keys table
CREATE TABLE IF NOT EXISTS escrow_keys (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES backup_jobs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    encrypted_key_blob TEXT NOT NULL,
    key_hint VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_user_id ON backup_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_files_job_id ON backup_files(job_id);
CREATE INDEX IF NOT EXISTS idx_backup_files_user_id ON backup_files(user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_keys_job_id ON escrow_keys(job_id);
