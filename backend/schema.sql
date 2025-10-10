-- CodeChill Database Schema (Updated for Flask SQLAlchemy Models)
-- MySQL 8.0+ Compatible

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS executions;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS room_participants;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

-- Users table for storing user information
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    auth0_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(500),
    
    -- Social Profile Links
    github_username VARCHAR(100),
    leetcode_username VARCHAR(100),
    codeforces_username VARCHAR(100),
    
    -- Profile Stats (cached from external APIs)
    github_stats JSON,
    leetcode_stats JSON,
    codeforces_stats JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    
    INDEX idx_auth0_id (auth0_id),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rooms table for coding sessions
CREATE TABLE rooms (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Room Settings
    is_private BOOLEAN DEFAULT FALSE NOT NULL,
    password VARCHAR(255), -- Hashed if private
    max_participants INT DEFAULT 10 NOT NULL,
    language VARCHAR(50) DEFAULT 'javascript' NOT NULL,
    
    -- Room Status
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    current_participants INT DEFAULT 0 NOT NULL,
    
    -- Code Content
    current_content LONGTEXT DEFAULT '',
    content_version INT DEFAULT 1 NOT NULL,
    
    -- Owner
    created_by VARCHAR(36) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_created_by (created_by),
    INDEX idx_name (name),
    INDEX idx_is_active (is_active),
    INDEX idx_is_private (is_private),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Room participants - many to many relationship
CREATE TABLE room_participants (
    id VARCHAR(36) PRIMARY KEY,
    
    -- Foreign Keys
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    
    -- Participant Info
    role VARCHAR(20) DEFAULT 'participant' NOT NULL, -- owner, moderator, participant
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Editor State
    cursor_line INT DEFAULT 1,
    cursor_column INT DEFAULT 1,
    selection_data JSON, -- Store selection coordinates
    
    -- Timestamps
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    left_at TIMESTAMP NULL,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_room_id (room_id),
    INDEX idx_user_id (user_id),
    INDEX idx_room_user_active (room_id, user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat messages
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    
    -- Foreign Keys
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    
    -- Message Content
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' NOT NULL, -- text, code, system, file
    
    -- Message Features
    is_edited BOOLEAN DEFAULT FALSE NOT NULL,
    reply_to VARCHAR(36), -- For threaded replies
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    edited_at TIMESTAMP NULL,
    
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reply_to) REFERENCES messages(id),
    INDEX idx_room_id (room_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Code executions for tracking runs via Judge0
CREATE TABLE executions (
    id VARCHAR(36) PRIMARY KEY,
    
    -- Foreign Keys
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    
    -- Execution Details
    language VARCHAR(50) NOT NULL,
    source_code LONGTEXT NOT NULL,
    input_data TEXT,
    
    -- Judge0 Integration
    judge0_token VARCHAR(100), -- Judge0 submission token
    judge0_status VARCHAR(50), -- Judge0 status
    
    -- Results
    output TEXT,
    error_output TEXT,
    compile_output TEXT,
    exit_code INT,
    execution_time DECIMAL(10,6), -- in seconds
    memory_usage INT, -- in KB
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending, running, completed, failed
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_room_id (room_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_judge0_token (judge0_token),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create some views for common queries
CREATE VIEW active_rooms_view AS
SELECT 
    r.*,
    u.name as owner_name,
    u.picture as owner_picture,
    r.current_participants
FROM rooms r
LEFT JOIN users u ON r.created_by = u.id
WHERE r.is_active = TRUE;

CREATE VIEW room_stats_view AS
SELECT 
    r.id,
    r.name,
    r.created_by,
    COUNT(DISTINCT rp.user_id) as total_participants_ever,
    COUNT(DISTINCT CASE WHEN rp.is_active = TRUE THEN rp.user_id END) as current_participants,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT e.id) as total_executions,
    r.created_at,
    r.last_activity
FROM rooms r
LEFT JOIN room_participants rp ON r.id = rp.room_id
LEFT JOIN messages m ON r.id = m.room_id
LEFT JOIN executions e ON r.id = e.room_id
WHERE r.is_active = TRUE
GROUP BY r.id;

-- Insert some sample data for development (optional)
-- Sample users
INSERT INTO users (id, auth0_id, email, name, picture, is_active, is_verified) VALUES
('user-1', 'auth0|sample1', 'john@example.com', 'John Doe', 'https://example.com/avatar1.jpg', TRUE, TRUE),
('user-2', 'auth0|sample2', 'jane@example.com', 'Jane Smith', 'https://example.com/avatar2.jpg', TRUE, TRUE),
('user-3', 'auth0|sample3', 'bob@example.com', 'Bob Wilson', 'https://example.com/avatar3.jpg', TRUE, TRUE);

-- Sample rooms
INSERT INTO rooms (id, name, description, language, created_by, current_content, is_active) VALUES
('room-1', 'JavaScript Playground', 'Learn and practice JavaScript together', 'javascript', 'user-1', 
'// Welcome to CodeChill!\nconsole.log("Hello, World!");\n\n// Your code here\n', TRUE),
('room-2', 'Python Data Science', 'Explore data science with Python', 'python', 'user-2', 
'# Welcome to CodeChill!\nprint("Hello, World!")\n\n# Your code here\n', TRUE),
('room-3', 'C++ Algorithms', 'Practice algorithms in C++', 'cpp', 'user-3', 
'// Welcome to CodeChill!\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    \n    // Your code here\n    return 0;\n}', TRUE);

-- Sample room participants
INSERT INTO room_participants (id, room_id, user_id, role, is_active) VALUES
('part-1', 'room-1', 'user-1', 'owner', TRUE),
('part-2', 'room-1', 'user-2', 'participant', TRUE),
('part-3', 'room-2', 'user-2', 'owner', TRUE),
('part-4', 'room-2', 'user-3', 'participant', TRUE),
('part-5', 'room-3', 'user-3', 'owner', TRUE),
('part-6', 'room-3', 'user-1', 'participant', TRUE);

-- Update room participant counts
UPDATE rooms SET current_participants = 2 WHERE id = 'room-1';
UPDATE rooms SET current_participants = 2 WHERE id = 'room-2';
UPDATE rooms SET current_participants = 2 WHERE id = 'room-3';

-- Sample messages
INSERT INTO messages (id, room_id, user_id, content, message_type) VALUES
('msg-1', 'room-1', 'user-1', 'Welcome to the JavaScript room!', 'text'),
('msg-2', 'room-1', 'user-2', 'Thanks! Excited to learn together.', 'text'),
('msg-3', 'room-2', 'user-2', 'Let\'s explore some data science concepts.', 'text'),
('msg-4', 'room-3', 'user-3', 'Ready to solve some algorithms?', 'text');