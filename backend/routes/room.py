from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import secrets
import string

from models import db, Room, RoomParticipant, User, Message
from services.room_service import RoomService
from config import DEFAULT_CODE_TEMPLATES, SUPPORTED_LANGUAGES

room_bp = Blueprint('room', __name__, url_prefix='/api/rooms')

@room_bp.route('/', methods=['GET'])
@jwt_required()
def get_rooms():
    """Get public rooms with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        search = request.args.get('search', '').strip()
        language = request.args.get('language', '').strip()
        
        query = Room.query.filter(
            Room.is_active == True,
            Room.is_private == False
        )
        
        if search:
            query = query.filter(
                db.or_(
                    Room.name.ilike(f'%{search}%'),
                    Room.description.ilike(f'%{search}%')
                )
            )
        
        if language and language in SUPPORTED_LANGUAGES:
            query = query.filter(Room.language == language)
        
        # Order by activity (most recent first)
        query = query.order_by(Room.last_activity.desc())
        
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        rooms_data = []
        for room in pagination.items:
            room_dict = room.to_dict()
            # Add owner info
            owner = User.query.get(room.created_by)
            if owner:
                room_dict['owner_name'] = owner.name
                room_dict['owner_picture'] = owner.picture
            rooms_data.append(room_dict)
        
        return jsonify({
            'rooms': rooms_data,
            'pagination': {
                'page': page,
                'pages': pagination.pages,
                'per_page': per_page,
                'total': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get rooms error: {str(e)}")
        return jsonify({'error': 'Failed to fetch rooms'}), 500

@room_bp.route('/', methods=['POST'])
@jwt_required()
def create_room():
    """Create a new room"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        name = data.get('name', '').strip()
        if not name or len(name) < 3:
            return jsonify({'error': 'Room name must be at least 3 characters'}), 400
        
        if len(name) > 100:
            return jsonify({'error': 'Room name must be less than 100 characters'}), 400
        
        description = data.get('description', '').strip()
        if len(description) > 500:
            return jsonify({'error': 'Description must be less than 500 characters'}), 400
        
        language = data.get('language', 'javascript').lower()
        if language not in SUPPORTED_LANGUAGES:
            return jsonify({'error': f'Unsupported language: {language}'}), 400
        
        is_private = data.get('is_private', False)
        password = data.get('password', '').strip() if is_private else None
        max_participants = min(data.get('max_participants', 10), 50)
        
        # Hash password if provided
        hashed_password = None
        if is_private and password:
            if len(password) < 4:
                return jsonify({'error': 'Password must be at least 4 characters'}), 400
            hashed_password = generate_password_hash(password)
        
        # Check if user has reached room limit
        user_rooms_count = Room.query.filter_by(
            created_by=current_user_id, 
            is_active=True
        ).count()
        
        if user_rooms_count >= current_app.config['MAX_ROOMS_PER_USER']:
            return jsonify({'error': 'Maximum number of rooms reached'}), 400
        
        # Create room
        room = Room(
            name=name,
            description=description,
            language=language,
            is_private=is_private,
            password=hashed_password,
            max_participants=max_participants,
            created_by=current_user_id,
            current_content=DEFAULT_CODE_TEMPLATES.get(language, ''),
        )
        
        db.session.add(room)
        db.session.flush()  # Get room ID
        
        # Add creator as first participant
        participant = RoomParticipant(
            room_id=room.id,
            user_id=current_user_id,
            role='owner'
        )
        
        db.session.add(participant)
        room.current_participants = 1
        
        db.session.commit()
        
        return jsonify({
            'message': 'Room created successfully',
            'room': room.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Create room error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create room'}), 500

@room_bp.route('/<room_id>', methods=['GET'])
@jwt_required()
def get_room(room_id):
    """Get room details"""
    try:
        current_user_id = get_jwt_identity()
        
        room = Room.query.filter_by(id=room_id, is_active=True).first()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        # Check if user is participant (required for private rooms)
        participation = RoomParticipant.query.filter_by(
            room_id=room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if room.is_private and not participation:
            return jsonify({'error': 'Access denied'}), 403
        
        room_data = room.to_dict()
        
        # Add owner info
        owner = User.query.get(room.created_by)
        if owner:
            room_data['owner_name'] = owner.name
            room_data['owner_picture'] = owner.picture
        
        # Add current user's participation status
        room_data['is_participant'] = participation is not None
        if participation:
            room_data['user_role'] = participation.role
        
        return jsonify({'room': room_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get room error: {str(e)}")
        return jsonify({'error': 'Failed to fetch room'}), 500

@room_bp.route('/<room_id>/join', methods=['POST'])
@jwt_required()
def join_room(room_id):
    """Join a room"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        room = Room.query.filter_by(id=room_id, is_active=True).first()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        # Check if already a participant
        existing_participation = RoomParticipant.query.filter_by(
            room_id=room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if existing_participation:
            return jsonify({'message': 'Already in room', 'room': room.to_dict()}), 200
        
        # Check room capacity
        if room.current_participants >= room.max_participants:
            return jsonify({'error': 'Room is full'}), 400
        
        # Check password for private rooms
        if room.is_private:
            password = data.get('password', '')
            if not room.password or not check_password_hash(room.password, password):
                return jsonify({'error': 'Invalid password'}), 401
        
        # Create participation
        participant = RoomParticipant(
            room_id=room_id,
            user_id=current_user_id,
            role='participant'
        )
        
        db.session.add(participant)
        room.current_participants += 1
        room.last_activity = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Joined room successfully',
            'room': room.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Join room error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to join room'}), 500

@room_bp.route('/<room_id>/leave', methods=['POST'])
@jwt_required()
def leave_room(room_id):
    """Leave a room"""
    try:
        current_user_id = get_jwt_identity()
        
        participation = RoomParticipant.query.filter_by(
            room_id=room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not participation:
            return jsonify({'error': 'Not in this room'}), 400
        
        room = participation.room
        
        # Owner cannot leave their own room (must delete it instead)
        if participation.role == 'owner':
            return jsonify({'error': 'Room owner cannot leave. Delete the room instead.'}), 400
        
        # Remove participation
        participation.is_active = False
        participation.left_at = datetime.utcnow()
        
        room.current_participants = max(0, room.current_participants - 1)
        room.last_activity = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Left room successfully'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Leave room error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to leave room'}), 500

@room_bp.route('/<room_id>', methods=['PUT'])
@jwt_required()
def update_room(room_id):
    """Update room settings (owner only)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        room = Room.query.filter_by(id=room_id, is_active=True).first()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        # Check if user is owner
        if room.created_by != current_user_id:
            return jsonify({'error': 'Only room owner can update settings'}), 403
        
        # Update allowed fields
        if 'name' in data:
            name = data['name'].strip()
            if not name or len(name) < 3:
                return jsonify({'error': 'Room name must be at least 3 characters'}), 400
            if len(name) > 100:
                return jsonify({'error': 'Room name must be less than 100 characters'}), 400
            room.name = name
        
        if 'description' in data:
            description = data['description'].strip()
            if len(description) > 500:
                return jsonify({'error': 'Description must be less than 500 characters'}), 400
            room.description = description
        
        if 'language' in data:
            language = data['language'].lower()
            if language not in SUPPORTED_LANGUAGES:
                return jsonify({'error': f'Unsupported language: {language}'}), 400
            room.language = language
            # Update content template if language changed
            if room.current_content.strip() == '':
                room.current_content = DEFAULT_CODE_TEMPLATES.get(language, '')
        
        if 'max_participants' in data:
            max_participants = min(data['max_participants'], 50)
            if max_participants < room.current_participants:
                return jsonify({'error': 'Cannot reduce capacity below current participant count'}), 400
            room.max_participants = max_participants
        
        room.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Room updated successfully',
            'room': room.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Update room error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update room'}), 500

@room_bp.route('/<room_id>', methods=['DELETE'])
@jwt_required()
def delete_room(room_id):
    """Delete room (owner only)"""
    try:
        current_user_id = get_jwt_identity()
        
        room = Room.query.filter_by(id=room_id, is_active=True).first()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        # Check if user is owner
        if room.created_by != current_user_id:
            return jsonify({'error': 'Only room owner can delete room'}), 403
        
        # Soft delete room
        room.is_active = False
        room.updated_at = datetime.utcnow()
        
        # Mark all participations as inactive
        participations = RoomParticipant.query.filter_by(room_id=room_id, is_active=True).all()
        for participation in participations:
            participation.is_active = False
            participation.left_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Room deleted successfully'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Delete room error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete room'}), 500

@room_bp.route('/<room_id>/participants', methods=['GET'])
@jwt_required()
def get_participants(room_id):
    """Get room participants"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if user is participant
        user_participation = RoomParticipant.query.filter_by(
            room_id=room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not user_participation:
            return jsonify({'error': 'Access denied'}), 403
        
        participants = RoomParticipant.query.filter_by(
            room_id=room_id,
            is_active=True
        ).join(User).filter(User.is_active == True).all()
        
        participants_data = [p.to_dict() for p in participants]
        
        return jsonify({'participants': participants_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get participants error: {str(e)}")
        return jsonify({'error': 'Failed to fetch participants'}), 500

@room_bp.route('/my-rooms', methods=['GET'])
@jwt_required()
def get_my_rooms():
    """Get current user's rooms"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get rooms where user is participant
        participations = RoomParticipant.query.filter_by(
            user_id=current_user_id,
            is_active=True
        ).join(Room).filter(Room.is_active == True).all()
        
        rooms_data = []
        for participation in participations:
            room_dict = participation.room.to_dict()
            room_dict['user_role'] = participation.role
            room_dict['joined_at'] = participation.joined_at.isoformat() if participation.joined_at else None
            
            # Add owner info
            owner = User.query.get(participation.room.created_by)
            if owner:
                room_dict['owner_name'] = owner.name
                room_dict['owner_picture'] = owner.picture
            
            rooms_data.append(room_dict)
        
        # Sort by last activity
        rooms_data.sort(key=lambda x: x.get('last_activity', ''), reverse=True)
        
        return jsonify({'rooms': rooms_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get my rooms error: {str(e)}")
        return jsonify({'error': 'Failed to fetch rooms'}), 500

# Error handlers
@room_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@room_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401

@room_bp.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'Forbidden'}), 403

@room_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@room_bp.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500