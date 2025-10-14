from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from models import db, Message, Room, RoomParticipant

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

@chat_bp.route('/room/<room_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(room_id):
    """Get messages for a room"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if user is participant
        participation = RoomParticipant.query.filter_by(
            room_id=room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not participation:
            return jsonify({'error': 'Access denied'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Get messages ordered by creation time (newest first for pagination, but reverse for display)
        messages = Message.query.filter_by(room_id=room_id)\
            .order_by(Message.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        # Reverse the order for proper chronological display
        messages_data = [msg.to_dict() for msg in reversed(messages.items)]
        
        return jsonify({
            'messages': messages_data,
            'pagination': {
                'page': page,
                'pages': messages.pages,
                'per_page': per_page,
                'total': messages.total,
                'has_next': messages.has_next,
                'has_prev': messages.has_prev
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get messages error: {str(e)}")
        return jsonify({'error': 'Failed to fetch messages'}), 500

@chat_bp.route('/room/<room_id>/messages', methods=['POST'])
@jwt_required()
def send_message(room_id):
    """Send a message to a room"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        reply_to = data.get('reply_to')
        
        if not content:
            return jsonify({'error': 'Message content is required'}), 400
        
        if len(content) > current_app.config['MAX_MESSAGE_LENGTH']:
            return jsonify({'error': 'Message too long'}), 400
        
        if message_type not in ['text', 'code', 'system', 'file']:
            return jsonify({'error': 'Invalid message type'}), 400
        
        # Check if user is participant
        participation = RoomParticipant.query.filter_by(
            room_id=room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not participation:
            return jsonify({'error': 'Access denied'}), 403
        
        # Validate reply_to if provided
        if reply_to:
            parent_message = Message.query.filter_by(id=reply_to, room_id=room_id).first()
            if not parent_message:
                return jsonify({'error': 'Parent message not found'}), 400
        
        # Create message
        message = Message()
        message.room_id = room_id
        message.user_id = current_user_id
        message.content = content
        message.message_type = message_type
        message.reply_to = reply_to
        
        db.session.add(message)
        
        # Update room last activity
        room = Room.query.get(room_id)
        if room:
            room.last_activity = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Message sent successfully',
            'data': message.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Send message error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to send message'}), 500

@chat_bp.route('/messages/<message_id>', methods=['PUT'])
@jwt_required()
def edit_message(message_id):
    """Edit a message"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        message = Message.query.get(message_id)
        if not message:
            return jsonify({'error': 'Message not found'}), 404
        
        # Check if user owns the message
        if message.user_id != current_user_id:
            return jsonify({'error': 'Can only edit your own messages'}), 403
        
        # Check if user is still participant
        participation = RoomParticipant.query.filter_by(
            room_id=message.room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not participation:
            return jsonify({'error': 'Access denied'}), 403
        
        # Validate new content
        new_content = data.get('content', '').strip()
        if not new_content:
            return jsonify({'error': 'Message content is required'}), 400
        
        if len(new_content) > current_app.config['MAX_MESSAGE_LENGTH']:
            return jsonify({'error': 'Message too long'}), 400
        
        # Update message
        message.content = new_content
        message.is_edited = True
        message.edited_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Message updated successfully',
            'data': message.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Edit message error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to edit message'}), 500

@chat_bp.route('/messages/<message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    """Delete a message (soft delete)"""
    try:
        current_user_id = get_jwt_identity()
        
        message = Message.query.get(message_id)
        if not message:
            return jsonify({'error': 'Message not found'}), 404
        
        # Check if user owns the message or is room owner
        participation = RoomParticipant.query.filter_by(
            room_id=message.room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not participation:
            return jsonify({'error': 'Access denied'}), 403
        
        can_delete = (
            message.user_id == current_user_id or  # Own message
            participation.role in ['owner', 'moderator']  # Room owner/moderator
        )
        
        if not can_delete:
            return jsonify({'error': 'Permission denied'}), 403
        
        # Soft delete: replace content with deletion marker
        message.content = '[Message deleted]'
        message.message_type = 'system'
        message.is_edited = True
        message.edited_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Message deleted successfully'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Delete message error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete message'}), 500

@chat_bp.route('/room/<room_id>/search', methods=['GET'])
@jwt_required()
def search_messages(room_id):
    """Search messages in a room"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if user is participant
        participation = RoomParticipant.query.filter_by(
            room_id=room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not participation:
            return jsonify({'error': 'Access denied'}), 403
        
        query = request.args.get('q', '').strip()
        if not query or len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        
        # Search messages
        messages = Message.query.filter(
            Message.room_id == room_id,
            Message.content.ilike(f'%{query}%')
        ).order_by(Message.created_at.desc())\
         .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'messages': [msg.to_dict() for msg in messages.items],
            'query': query,
            'pagination': {
                'page': page,
                'pages': messages.pages,
                'per_page': per_page,
                'total': messages.total,
                'has_next': messages.has_next,
                'has_prev': messages.has_prev
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Search messages error: {str(e)}")
        return jsonify({'error': 'Failed to search messages'}), 500

# Error handlers
@chat_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@chat_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401

@chat_bp.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'Forbidden'}), 403

@chat_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@chat_bp.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500