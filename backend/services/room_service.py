from flask import current_app
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import secrets
import string

from models import db, Room, RoomParticipant, User, Message, Execution

class RoomService:
    """Service for room-related operations"""
    
    @staticmethod
    def cleanup_inactive_rooms():
        """Clean up inactive rooms and participants"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(
                seconds=current_app.config['ROOM_INACTIVITY_TIMEOUT']
            )
            
            # Find rooms with no activity
            inactive_rooms = Room.query.filter(
                Room.is_active == True,
                Room.last_activity < cutoff_time,
                Room.current_participants == 0
            ).all()
            
            for room in inactive_rooms:
                room.is_active = False
                current_app.logger.info(f"Deactivated inactive room: {room.id}")
            
            # Clean up stale participants
            stale_participants = RoomParticipant.query.filter(
                RoomParticipant.is_active == True,
                RoomParticipant.last_seen < cutoff_time
            ).all()
            
            for participant in stale_participants:
                participant.is_active = False
                participant.left_at = datetime.utcnow()
                
                # Update room participant count
                room = participant.room
                if room and room.is_active:
                    room.current_participants = max(0, room.current_participants - 1)
                
                current_app.logger.info(f"Removed stale participant: {participant.id}")
            
            db.session.commit()
            return len(inactive_rooms) + len(stale_participants)
            
        except Exception as e:
            current_app.logger.error(f"Failed to cleanup inactive rooms: {str(e)}")
            db.session.rollback()
            return 0
    
    @staticmethod
    def generate_room_invite_code(room_id: str) -> str:
        """Generate a unique invite code for a room"""
        # Generate a 8-character alphanumeric code
        alphabet = string.ascii_uppercase + string.digits
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        
        # In a real implementation, you'd store this in a separate table
        # with expiration time. For now, we'll just return the code.
        return code
    
    @staticmethod
    def validate_room_access(room_id: str, user_id: str) -> bool:
        """Check if user has access to room"""
        try:
            room = Room.query.filter_by(id=room_id, is_active=True).first()
            if not room:
                return False
            
            # Public rooms are accessible to all
            if not room.is_private:
                return True
            
            # Check if user is participant in private room
            participation = RoomParticipant.query.filter_by(
                room_id=room_id,
                user_id=user_id,
                is_active=True
            ).first()
            
            return participation is not None
            
        except Exception as e:
            current_app.logger.error(f"Failed to validate room access: {str(e)}")
            return False
    
    @staticmethod
    def update_room_activity(room_id: str):
        """Update room's last activity timestamp"""
        try:
            room = Room.query.get(room_id)
            if room and room.is_active:
                room.last_activity = datetime.utcnow()
                db.session.commit()
                
        except Exception as e:
            current_app.logger.error(f"Failed to update room activity: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def update_participant_activity(room_id: str, user_id: str, cursor_data: Optional[Dict] = None):
        """Update participant's activity and cursor position"""
        try:
            participation = RoomParticipant.query.filter_by(
                room_id=room_id,
                user_id=user_id,
                is_active=True
            ).first()
            
            if participation:
                participation.last_seen = datetime.utcnow()
                
                if cursor_data:
                    participation.cursor_line = cursor_data.get('line', participation.cursor_line)
                    participation.cursor_column = cursor_data.get('column', participation.cursor_column)
                    participation.selection_data = cursor_data.get('selection')
                
                db.session.commit()
                
        except Exception as e:
            current_app.logger.error(f"Failed to update participant activity: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def get_room_statistics(room_id: str) -> Dict[str, Any]:
        """Get detailed room statistics"""
        try:
            room = Room.query.get(room_id)
            if not room:
                return {}
            
            # Get participant stats
            total_participants = RoomParticipant.query.filter_by(room_id=room_id).count()
            active_participants = RoomParticipant.query.filter_by(
                room_id=room_id, 
                is_active=True
            ).count()
            
            # Get message stats
            total_messages = Message.query.filter_by(room_id=room_id).count()
            recent_messages = Message.query.filter_by(room_id=room_id).filter(
                Message.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).count()
            
            # Get execution stats
            total_executions = Execution.query.filter_by(room_id=room_id).count()
            successful_executions = Execution.query.filter_by(
                room_id=room_id, 
                status='completed'
            ).count()
            
            return {
                'room_id': room_id,
                'total_participants_ever': total_participants,
                'current_active_participants': active_participants,
                'total_messages': total_messages,
                'messages_last_24h': recent_messages,
                'total_executions': total_executions,
                'successful_executions': successful_executions,
                'success_rate': (successful_executions / total_executions * 100) if total_executions > 0 else 0,
                'room_age_hours': (datetime.utcnow() - room.created_at).total_seconds() / 3600,
                'last_activity': room.last_activity.isoformat() if room.last_activity else None
            }
            
        except Exception as e:
            current_app.logger.error(f"Failed to get room statistics: {str(e)}")
            return {}
    
    @staticmethod
    def get_trending_rooms(limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending public rooms based on activity"""
        try:
            # Calculate trending score based on recent activity
            recent_time = datetime.utcnow() - timedelta(hours=24)
            
            rooms = db.session.query(Room).filter(
                Room.is_active == True,
                Room.is_private == False,
                Room.last_activity >= recent_time
            ).order_by(
                Room.current_participants.desc(),
                Room.last_activity.desc()
            ).limit(limit).all()
            
            trending_data = []
            for room in rooms:
                room_dict = room.to_dict()
                
                # Add trending metrics
                recent_messages = Message.query.filter_by(room_id=room.id).filter(
                    Message.created_at >= recent_time
                ).count()
                
                recent_executions = Execution.query.filter_by(room_id=room.id).filter(
                    Execution.created_at >= recent_time
                ).count()
                
                room_dict['trending_score'] = (
                    room.current_participants * 10 +
                    recent_messages * 2 +
                    recent_executions * 5
                )
                room_dict['recent_activity'] = {
                    'messages': recent_messages,
                    'executions': recent_executions
                }
                
                # Add owner info
                owner = User.query.get(room.created_by)
                if owner:
                    room_dict['owner_name'] = owner.name
                    room_dict['owner_picture'] = owner.picture
                
                trending_data.append(room_dict)
            
            return trending_data
            
        except Exception as e:
            current_app.logger.error(f"Failed to get trending rooms: {str(e)}")
            return []
    
    @staticmethod
    def search_rooms(query: str, language: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Search rooms by name, description, or language"""
        try:
            room_query = Room.query.filter(
                Room.is_active == True,
                Room.is_private == False
            )
            
            if query:
                room_query = room_query.filter(
                    db.or_(
                        Room.name.ilike(f'%{query}%'),
                        Room.description.ilike(f'%{query}%')
                    )
                )
            
            if language:
                room_query = room_query.filter(Room.language == language)
            
            rooms = room_query.order_by(
                Room.current_participants.desc(),
                Room.last_activity.desc()
            ).limit(limit).all()
            
            results = []
            for room in rooms:
                room_dict = room.to_dict()
                
                # Add owner info
                owner = User.query.get(room.created_by)
                if owner:
                    room_dict['owner_name'] = owner.name
                    room_dict['owner_picture'] = owner.picture
                
                results.append(room_dict)
            
            return results
            
        except Exception as e:
            current_app.logger.error(f"Failed to search rooms: {str(e)}")
            return []
    
    @staticmethod
    def transfer_room_ownership(room_id: str, current_owner_id: str, new_owner_id: str) -> bool:
        """Transfer room ownership to another participant"""
        try:
            room = Room.query.filter_by(id=room_id, created_by=current_owner_id).first()
            if not room:
                return False
            
            # Check if new owner is active participant
            new_owner_participation = RoomParticipant.query.filter_by(
                room_id=room_id,
                user_id=new_owner_id,
                is_active=True
            ).first()
            
            if not new_owner_participation:
                return False
            
            # Update room ownership
            room.created_by = new_owner_id
            room.updated_at = datetime.utcnow()
            
            # Update current owner role
            current_owner_participation = RoomParticipant.query.filter_by(
                room_id=room_id,
                user_id=current_owner_id,
                is_active=True
            ).first()
            
            if current_owner_participation:
                current_owner_participation.role = 'participant'
            
            # Update new owner role
            new_owner_participation.role = 'owner'
            
            db.session.commit()
            return True
            
        except Exception as e:
            current_app.logger.error(f"Failed to transfer room ownership: {str(e)}")
            db.session.rollback()
            return False