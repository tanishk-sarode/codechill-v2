from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask_jwt_extended import decode_token
from flask import current_app, request
from datetime import datetime
import json

from models import db, Room, RoomParticipant, User, Message, Execution
from services.room_service import RoomService

from services.auth_service import AuthService
from flask import session

def create_socket_handlers(socketio: SocketIO):
    """Create and register Socket.IO event handlers"""
    
    # Store active connections
    active_connections = {}
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle client connection"""
        if not auth or 'token' not in auth:
            current_app.logger.warning(f"Connection attempt from {request.sid} without token. Rejecting.")
            return False  # Reject connection

        token = auth['token']
        try:
            # Use the existing, working AuthService to verify the RS256 token
            payload = AuthService.verify_auth0_token(token)
            if not payload:
                current_app.logger.warning(f"Connection attempt from {request.sid} with an invalid token. Rejecting.")
                return False

            user_id = payload.get('sub')
            session['user_id'] = user_id
            session['user_info'] = payload
            
            # Store connection info
            active_connections[request.sid] = {
                'user_id': user_id,
                'connected_at': datetime.utcnow(),
                'current_room': None
            }
            
            current_app.logger.info(f"Client {user_id} connected successfully with session ID {request.sid}")
            emit('connected', {'message': 'Connected successfully'})

        except Exception as e:
            # Log the specific error for easier debugging
            current_app.logger.error(f"Socket.IO connection failed for {request.sid} due to token validation error: {e}")
            return False # Reject connection
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        try:
            connection_info = active_connections.get(request.sid)
            if connection_info:
                user_id = connection_info['user_id']
                current_room = connection_info.get('current_room')
                
                if current_room:
                    # Leave current room
                    leave_room(current_room)
                    
                    # Update participant status
                    RoomService.update_participant_activity(current_room, user_id)
                    
                    # Notify other participants
                    emit('user_left', {
                        'user_id': user_id,
                        'room_id': current_room
                    }, room=current_room, include_self=False)
                
                del active_connections[request.sid]
                current_app.logger.info(f'User {user_id} disconnected')
            
        except Exception as e:
            current_app.logger.error(f'Disconnect error: {str(e)}')
    
    @socketio.on('join_room')
    def handle_join_room(data):
        """Handle joining a room"""
        try:
            connection_info = active_connections.get(request.sid)
            if not connection_info:
                emit('error', {'message': 'Not authenticated'})
                return
            
            user_id = connection_info['user_id']
            room_id = data.get('room_id')
            
            if not room_id:
                emit('error', {'message': 'Room ID required'})
                return
            
            # Verify user has access to room
            if not RoomService.validate_room_access(room_id, user_id):
                emit('error', {'message': 'Access denied'})
                return
            
            # Leave current room if any
            current_room = connection_info.get('current_room')
            if current_room and current_room != room_id:
                leave_room(current_room)
                emit('user_left', {
                    'user_id': user_id,
                    'room_id': current_room
                }, room=current_room, include_self=False)
            
            # Join new room
            join_room(room_id)
            connection_info['current_room'] = room_id
            
            # Update participant activity
            RoomService.update_participant_activity(room_id, user_id)
            RoomService.update_room_activity(room_id)
            
            # Get room and user info
            room = Room.query.get(room_id)
            user = User.query.get(user_id)
            
            if room and user:
                # Send current room state to joining user
                emit('room_joined', {
                    'room_id': room_id,
                    'room_data': room.to_dict(),
                    'current_content': room.current_content,
                    'content_version': room.content_version
                })
                
                # Notify other participants
                emit('user_joined', {
                    'user_id': user_id,
                    'user_name': user.name,
                    'user_picture': user.picture,
                    'room_id': room_id
                }, room=room_id, include_self=False)
            
        except Exception as e:
            current_app.logger.error(f'Join room error: {str(e)}')
            emit('error', {'message': 'Failed to join room'})
    
    @socketio.on('leave_room')
    def handle_leave_room(data):
        """Handle leaving a room"""
        try:
            connection_info = active_connections.get(request.sid)
            if not connection_info:
                return
            
            user_id = connection_info['user_id']
            room_id = data.get('room_id') or connection_info.get('current_room')
            
            if room_id:
                leave_room(room_id)
                
                # Update participant activity
                RoomService.update_participant_activity(room_id, user_id)
                
                # Notify other participants
                emit('user_left', {
                    'user_id': user_id,
                    'room_id': room_id
                }, room=room_id, include_self=False)
                
                if connection_info.get('current_room') == room_id:
                    connection_info['current_room'] = None
                
                emit('room_left', {'room_id': room_id})
            
        except Exception as e:
            current_app.logger.error(f'Leave room error: {str(e)}')
    
    @socketio.on('code_change')
    def handle_code_change(data):
        """Handle real-time code changes"""
        try:
            connection_info = active_connections.get(request.sid)
            if not connection_info:
                emit('error', {'message': 'Not authenticated'})
                return
            
            user_id = connection_info['user_id']
            room_id = connection_info.get('current_room')
            
            if not room_id:
                emit('error', {'message': 'Not in a room'})
                return
            
            # Validate data
            required_fields = ['content', 'version']
            if not all(field in data for field in required_fields):
                emit('error', {'message': 'Invalid code change data'})
                return
            
            content = data['content']
            version = data['version']
            cursor_position = data.get('cursor_position', {})
            
            # Update room content
            room = Room.query.get(room_id)
            if room:
                # Simple version check to prevent conflicts
                if version >= room.content_version:
                    room.current_content = content
                    room.content_version = version + 1
                    room.last_activity = datetime.utcnow()
                    db.session.commit()
                    
                    # Update participant cursor position
                    RoomService.update_participant_activity(room_id, user_id, cursor_position)
                    
                    # Broadcast to other participants
                    emit('code_updated', {
                        'content': content,
                        'version': room.content_version,
                        'user_id': user_id,
                        'cursor_position': cursor_position
                    }, room=room_id, include_self=False)
                    
                    emit('code_change_ack', {
                        'version': room.content_version,
                        'success': True
                    })
                else:
                    # Version conflict - send current content
                    emit('code_conflict', {
                        'current_content': room.current_content,
                        'current_version': room.content_version
                    })
            
        except Exception as e:
            current_app.logger.error(f'Code change error: {str(e)}')
            emit('error', {'message': 'Failed to update code'})
    
    @socketio.on('cursor_update')
    def handle_cursor_update(data):
        """Handle cursor position updates"""
        try:
            connection_info = active_connections.get(request.sid)
            if not connection_info:
                return
            
            user_id = connection_info['user_id']
            room_id = connection_info.get('current_room')
            
            if not room_id:
                return
            
            cursor_position = data.get('cursor_position', {})
            
            # Update participant cursor position
            RoomService.update_participant_activity(room_id, user_id, cursor_position)
            
            # Broadcast cursor position to other participants
            emit('cursor_moved', {
                'user_id': user_id,
                'cursor_position': cursor_position
            }, room=room_id, include_self=False)
            
        except Exception as e:
            current_app.logger.error(f'Cursor update error: {str(e)}')
    
    @socketio.on('send_message')
    def handle_send_message(data):
        """Handle chat messages"""
        try:
            connection_info = active_connections.get(request.sid)
            if not connection_info:
                emit('error', {'message': 'Not authenticated'})
                return
            
            user_id = connection_info['user_id']
            room_id = connection_info.get('current_room')
            
            if not room_id:
                emit('error', {'message': 'Not in a room'})
                return
            
            content = data.get('content', '').strip()
            message_type = data.get('type', 'text')
            
            if not content or len(content) > current_app.config['MAX_MESSAGE_LENGTH']:
                emit('error', {'message': 'Invalid message content'})
                return
            
            # Create message
            message = Message(
                room_id=room_id,
                user_id=user_id,
                content=content,
                message_type=message_type
            )
            
            db.session.add(message)
            db.session.commit()
            
            # Update room activity
            RoomService.update_room_activity(room_id)
            
            # Broadcast message to all participants
            emit('new_message', message.to_dict(), room=room_id)
            
        except Exception as e:
            current_app.logger.error(f'Send message error: {str(e)}')
            emit('error', {'message': 'Failed to send message'})
    
    @socketio.on('execute_code')
    def handle_execute_code(data):
        """Handle code execution requests"""
        try:
            connection_info = active_connections.get(request.sid)
            if not connection_info:
                emit('error', {'message': 'Not authenticated'})
                return
            
            user_id = connection_info['user_id']
            room_id = connection_info.get('current_room')
            
            if not room_id:
                emit('error', {'message': 'Not in a room'})
                return
            
            source_code = data.get('source_code', '').strip()
            language = data.get('language', 'javascript')
            input_data = data.get('input', '')
            
            if not source_code:
                emit('error', {'message': 'No code to execute'})
                return
            
            if len(source_code) > current_app.config['MAX_CODE_LENGTH']:
                emit('error', {'message': 'Code too long'})
                return
            
            # Create execution record
            execution = Execution(
                room_id=room_id,
                user_id=user_id,
                language=language,
                source_code=source_code,
                input_data=input_data,
                status='pending'
            )
            
            db.session.add(execution)
            db.session.commit()
            
            # Update room activity
            RoomService.update_room_activity(room_id)
            
            # Notify all participants that execution started
            emit('execution_started', {
                'execution_id': execution.id,
                'user_id': user_id,
                'language': language
            }, room=room_id)
            
            # TODO: Implement actual code execution with Judge0 API
            # For now, just simulate execution
            emit('execution_queued', {
                'execution_id': execution.id,
                'message': 'Execution queued'
            })
            
        except Exception as e:
            current_app.logger.error(f'Execute code error: {str(e)}')
            emit('error', {'message': 'Failed to execute code'})
    
    @socketio.on('get_room_state')
    def handle_get_room_state(data):
        """Get current room state"""
        try:
            connection_info = active_connections.get(request.sid)
            if not connection_info:
                emit('error', {'message': 'Not authenticated'})
                return
            
            room_id = data.get('room_id') or connection_info.get('current_room')
            
            if not room_id:
                emit('error', {'message': 'No room specified'})
                return
            
            room = Room.query.get(room_id)
            if not room or not room.is_active:
                emit('error', {'message': 'Room not found'})
                return
            
            # Get active participants
            participants = RoomParticipant.query.filter_by(
                room_id=room_id,
                is_active=True
            ).join(User).all()
            
            # Get recent messages
            recent_messages = Message.query.filter_by(room_id=room_id)\
                .order_by(Message.created_at.desc())\
                .limit(50).all()
            
            emit('room_state', {
                'room': room.to_dict(),
                'content': room.current_content,
                'version': room.content_version,
                'participants': [p.to_dict() for p in participants],
                'recent_messages': [m.to_dict() for m in reversed(recent_messages)]
            })
            
        except Exception as e:
            current_app.logger.error(f'Get room state error: {str(e)}')
            emit('error', {'message': 'Failed to get room state'})
    
    return socketio