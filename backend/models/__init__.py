from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.mysql import JSON
import uuid

db = SQLAlchemy()

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    auth0_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    picture = db.Column(db.String(500))
    
    # Social Profile Links
    github_username = db.Column(db.String(100))
    leetcode_username = db.Column(db.String(100))
    codeforces_username = db.Column(db.String(100))
    
    # Profile Stats (cached from external APIs)
    github_stats = db.Column(JSON)
    leetcode_stats = db.Column(JSON)
    codeforces_stats = db.Column(JSON)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relationships
    owned_rooms = db.relationship('Room', foreign_keys='Room.created_by', backref='owner', lazy='dynamic')
    room_participations = db.relationship('RoomParticipant', back_populates='user', lazy='dynamic', cascade='all, delete-orphan')
    messages = db.relationship('Message', back_populates='user', lazy='dynamic')
    executions = db.relationship('Execution', back_populates='user', lazy='dynamic')
    
    def __init__(self, auth0_id=None, email=None, name=None, picture=None, is_verified=False, **kwargs):
        """Initialize User with required and optional parameters"""
        super(User, self).__init__(**kwargs)
        if auth0_id:
            self.auth0_id = auth0_id
        if email:
            self.email = email
        if name:
            self.name = name
        if picture:
            self.picture = picture
        self.is_verified = is_verified
        self.is_active = True
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.last_active = datetime.utcnow()
    
    def to_dict(self, include_stats=False):
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'picture': self.picture,
            'github_username': self.github_username,
            'leetcode_username': self.leetcode_username,
            'codeforces_username': self.codeforces_username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active,
            'is_verified': self.is_verified
        }
        
        if include_stats:
            data.update({
                'github_stats': self.github_stats,
                'leetcode_stats': self.leetcode_stats,
                'codeforces_stats': self.codeforces_stats
            })
        
        return data
    
    def __repr__(self):
        return f'<User {self.email}>'

class Room(db.Model):
    __tablename__ = 'rooms'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), nullable=False, index=True)
    description = db.Column(db.Text)
    
    # Room Settings
    is_private = db.Column(db.Boolean, default=False, nullable=False)
    password = db.Column(db.String(255))  # Hashed if private
    max_participants = db.Column(db.Integer, default=10, nullable=False)
    language = db.Column(db.String(50), default='javascript', nullable=False)
    
    # Room Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    current_participants = db.Column(db.Integer, default=0, nullable=False)
    
    # Code Content
    current_content = db.Column(db.Text, default='')
    content_version = db.Column(db.Integer, default=1, nullable=False)
    
    # Owner
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    participants = db.relationship('RoomParticipant', back_populates='room', lazy='dynamic', cascade='all, delete-orphan')
    messages = db.relationship('Message', back_populates='room', lazy='dynamic', cascade='all, delete-orphan')
    executions = db.relationship('Execution', back_populates='room', lazy='dynamic')
    
    def to_dict(self, include_participants=True):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_private': self.is_private,
            'max_participants': self.max_participants,
            'current_participants': self.current_participants,
            'language': self.language,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'content_version': self.content_version
        }
        
        if include_participants:
            data['participants'] = [p.to_dict() for p in self.participants.filter_by(is_active=True)]
        
        return data
    
    def __repr__(self):
        return f'<Room {self.name}>'

class RoomParticipant(db.Model):
    __tablename__ = 'room_participants'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    
    # Foreign Keys
    room_id = db.Column(db.String(36), db.ForeignKey('rooms.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Participant Info
    role = db.Column(db.String(20), default='participant', nullable=False)  # owner, moderator, participant
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Editor State
    cursor_line = db.Column(db.Integer, default=1)
    cursor_column = db.Column(db.Integer, default=1)
    selection_data = db.Column(JSON)  # Store selection coordinates
    
    # Timestamps
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    left_at = db.Column(db.DateTime)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint: one active participation per user per room
    __table_args__ = (
        db.Index('idx_room_user_active', room_id, user_id, is_active),
    )
    
    # Relationships
    user = db.relationship('User', back_populates='room_participations')
    room = db.relationship('Room', back_populates='participants')
    
    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'user_picture': self.user.picture if self.user else None,
            'role': self.role,
            'is_active': self.is_active,
            'cursor_line': self.cursor_line,
            'cursor_column': self.cursor_column,
            'selection_data': self.selection_data,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None
        }
    
    def __repr__(self):
        return f'<RoomParticipant {self.user_id} in {self.room_id}>'

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    
    # Foreign Keys
    room_id = db.Column(db.String(36), db.ForeignKey('rooms.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Message Content
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text', nullable=False)  # text, code, system, file
    
    # Message Features
    is_edited = db.Column(db.Boolean, default=False, nullable=False)
    reply_to = db.Column(db.String(36), db.ForeignKey('messages.id'))  # For threaded replies
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    edited_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', back_populates='messages')
    room = db.relationship('Room', back_populates='messages')
    replies = db.relationship('Message', backref=db.backref('parent_message', remote_side=[id]), lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'user_picture': self.user.picture if self.user else None,
            'content': self.content,
            'message_type': self.message_type,
            'is_edited': self.is_edited,
            'reply_to': self.reply_to,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None
        }
    
    def __repr__(self):
        return f'<Message {self.id} in {self.room_id}>'

class Execution(db.Model):
    __tablename__ = 'executions'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    
    # Foreign Keys
    room_id = db.Column(db.String(36), db.ForeignKey('rooms.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Execution Details
    language = db.Column(db.String(50), nullable=False)
    source_code = db.Column(db.Text, nullable=False)
    input_data = db.Column(db.Text)
    
    # Judge0 Integration
    judge0_token = db.Column(db.String(100))  # Judge0 submission token
    judge0_status = db.Column(db.String(50))  # Judge0 status
    
    # Results
    output = db.Column(db.Text)
    error_output = db.Column(db.Text)
    compile_output = db.Column(db.Text)
    exit_code = db.Column(db.Integer)
    execution_time = db.Column(db.Float)  # in seconds
    memory_usage = db.Column(db.Integer)  # in KB
    
    # Status
    status = db.Column(db.String(20), default='pending', nullable=False)  # pending, running, completed, failed
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', back_populates='executions')
    room = db.relationship('Room', back_populates='executions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'language': self.language,
            'source_code': self.source_code,
            'input_data': self.input_data,
            'output': self.output,
            'error_output': self.error_output,
            'compile_output': self.compile_output,
            'exit_code': self.exit_code,
            'execution_time': self.execution_time,
            'memory_usage': self.memory_usage,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def __repr__(self):
        return f'<Execution {self.id} ({self.language})>'