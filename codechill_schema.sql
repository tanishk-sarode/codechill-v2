
-- CodeChill Database Schema
-- MySQL 8.0+ Compatible

-- Users table for storing user information
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auth0_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    github_username VARCHAR(100),
    leetcode_username VARCHAR(100),
    codeforces_username VARCHAR(100),
    theme_preference ENUM('light', 'dark') DEFAULT 'dark',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_auth0_id (auth0_id),
    INDEX idx_email (email),
    INDEX idx_github_username (github_username)
);

-- Rooms table for coding sessions
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INT NOT NULL,
    language VARCHAR(50) DEFAULT 'javascript',
    is_public BOOLEAN DEFAULT true,
    max_participants INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room_code (room_code),
    INDEX idx_owner_id (owner_id),
    INDEX idx_is_active (is_active)
);

-- Room participants - many to many relationship
CREATE TABLE room_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'moderator', 'participant') DEFAULT 'participant',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,

    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_user (room_id, user_id),
    INDEX idx_room_id (room_id),
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active)
);

-- Code sessions for storing current code state
CREATE TABLE code_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    content LONGTEXT,
    language VARCHAR(50) DEFAULT 'javascript',
    version INT DEFAULT 1,
    last_modified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_room_id (room_id),
    INDEX idx_updated_at (updated_at)
);

-- Chat messages
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'system', 'code_share') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,

    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_deleted (is_deleted)
);

-- Code executions for tracking runs via Judge0
CREATE TABLE code_executions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    code LONGTEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    stdin TEXT,
    expected_output TEXT,
    judge0_token VARCHAR(100),
    status VARCHAR(50),
    stdout TEXT,
    stderr TEXT,
    compile_output TEXT,
    execution_time DECIMAL(10,6),
    memory_used INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_user_id (user_id),
    INDEX idx_judge0_token (judge0_token),
    INDEX idx_created_at (created_at)
);

-- User profiles cache for external API data
CREATE TABLE user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    platform ENUM('github', 'leetcode', 'codeforces') NOT NULL,
    profile_data JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_platform (user_id, platform),
    INDEX idx_user_id (user_id),
    INDEX idx_platform (platform),
    INDEX idx_last_updated (last_updated)
);

-- Session tracking for active users in rooms
CREATE TABLE active_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    socket_id VARCHAR(100) NOT NULL,
    cursor_position JSON,
    is_typing BOOLEAN DEFAULT false,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_socket (socket_id),
    INDEX idx_user_id (user_id),
    INDEX idx_room_id (room_id),
    INDEX idx_last_activity (last_activity)
);

-- Leaderboard/challenge tracking (for future expansion)
CREATE TABLE challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    problem_statement LONGTEXT,
    test_cases JSON,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    tags JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_difficulty (difficulty),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
);

-- Challenge submissions (for future expansion)
CREATE TABLE challenge_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    user_id INT NOT NULL,
    code LONGTEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status ENUM('pending', 'accepted', 'wrong_answer', 'time_limit', 'runtime_error') DEFAULT 'pending',
    execution_time DECIMAL(10,6),
    memory_used INT,
    score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_challenge_id (challenge_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Audit log for tracking important events
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    room_id INT,
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_room_id (room_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Views for common queries
CREATE VIEW active_rooms AS
SELECT 
    r.*,
    u.name as owner_name,
    u.avatar_url as owner_avatar,
    COUNT(rp.id) as participant_count
FROM rooms r
LEFT JOIN users u ON r.owner_id = u.id
LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.is_active = true
WHERE r.is_active = true
GROUP BY r.id;

CREATE VIEW user_stats AS
SELECT 
    u.*,
    COUNT(DISTINCT r.id) as rooms_created,
    COUNT(DISTINCT rp.id) as rooms_joined,
    COUNT(DISTINCT ce.id) as code_executions
FROM users u
LEFT JOIN rooms r ON u.id = r.owner_id
LEFT JOIN room_participants rp ON u.id = rp.user_id
LEFT JOIN code_executions ce ON u.id = ce.user_id
GROUP BY u.id;
