-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'viewer', 'editor', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cases table
CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Files table
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_url VARCHAR(255) NOT NULL, -- S3 URL
  file_type VARCHAR(50),
  file_size BIGINT,
  metadata JSONB,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  case_id INTEGER REFERENCES cases(id),
  uploaded_by INTEGER REFERENCES users(id)
);

-- User Case Access table
CREATE TABLE user_case_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  case_id INTEGER REFERENCES cases(id),
  access_level VARCHAR(50) NOT NULL, -- 'read', 'write', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_case UNIQUE (user_id, case_id)
);

-- Internal-External Case Mapping table
CREATE TABLE internal_external_case_mapping (
  id SERIAL PRIMARY KEY,
  internal_case_id INTEGER REFERENCES cases(id),
  external_case_id VARCHAR(255) NOT NULL,
  external_system VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table (new addition)
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(255) NOT NULL, -- e.g., 'upload_file', 'grant_access'
  entity_type VARCHAR(50), -- e.g., 'case', 'file'
  entity_id INTEGER,
  details JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);