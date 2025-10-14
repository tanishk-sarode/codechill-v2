from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from models import db, User, Room, RoomParticipant
from services.user_service import UserService

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_current_user_profile():
    """Get current user's profile with stats"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get additional stats
        room_count = Room.query.filter_by(created_by=current_user_id, is_active=True).count()
        participation_count = RoomParticipant.query.filter_by(user_id=current_user_id, is_active=True).count()
        
        profile_data = user.to_dict(include_stats=True)
        profile_data['rooms_created'] = room_count
        profile_data['rooms_joined'] = participation_count
        
        return jsonify({'profile': profile_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get current user profile error: {str(e)}")
        return jsonify({'error': 'Failed to get profile'}), 500

@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_current_user_profile():
    """Update current user's profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'name' in data:
            name = data['name'].strip()
            if not name or len(name) < 2:
                return jsonify({'error': 'Name must be at least 2 characters'}), 400
            if len(name) > 255:
                return jsonify({'error': 'Name too long'}), 400
            user.name = name
        
        if 'github_username' in data:
            github_username = data['github_username'].strip() if data['github_username'] else None
            if github_username and len(github_username) > 100:
                return jsonify({'error': 'GitHub username too long'}), 400
            user.github_username = github_username
        
        if 'leetcode_username' in data:
            leetcode_username = data['leetcode_username'].strip() if data['leetcode_username'] else None
            if leetcode_username and len(leetcode_username) > 100:
                return jsonify({'error': 'LeetCode username too long'}), 400
            user.leetcode_username = leetcode_username
        
        if 'codeforces_username' in data:
            codeforces_username = data['codeforces_username'].strip() if data['codeforces_username'] else None
            if codeforces_username and len(codeforces_username) > 100:
                return jsonify({'error': 'Codeforces username too long'}), 400
            user.codeforces_username = codeforces_username
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Trigger background stats update if social usernames changed
        if any(key in data for key in ['github_username', 'leetcode_username', 'codeforces_username']):
            try:
                UserService.update_user_stats_async(user.id)
            except Exception as stats_error:
                current_app.logger.warning(f"Failed to trigger stats update: {stats_error}")
        
        return jsonify({
            'message': 'Profile updated successfully',
            'profile': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Update profile error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile'}), 500

@users_bp.route('/<user_id>/profile', methods=['GET'])
@jwt_required()
def get_user_profile(user_id):
    """Get another user's public profile"""
    try:
        user = User.query.filter_by(id=user_id, is_active=True).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get public stats
        room_count = Room.query.filter_by(created_by=user_id, is_active=True, is_private=False).count()
        
        profile_data = user.to_dict(include_stats=True)
        # Remove sensitive information for public profiles
        profile_data.pop('email', None)
        profile_data['public_rooms_created'] = room_count
        
        return jsonify({'profile': profile_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get user profile error: {str(e)}")
        return jsonify({'error': 'Failed to get user profile'}), 500

@users_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    """Search users by name or username"""
    try:
        query = request.args.get('q', '').strip()
        if not query or len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        
        # Search users by name or social usernames
        users = User.query.filter(
            User.is_active == True,
            db.or_(
                User.name.ilike(f'%{query}%'),
                User.github_username.ilike(f'%{query}%'),
                User.leetcode_username.ilike(f'%{query}%'),
                User.codeforces_username.ilike(f'%{query}%')
            )
        ).order_by(User.name)\
         .paginate(page=page, per_page=per_page, error_out=False)
        
        # Return limited profile data
        users_data = []
        for user in users.items:
            user_data = {
                'id': user.id,
                'name': user.name,
                'picture': user.picture,
                'github_username': user.github_username,
                'leetcode_username': user.leetcode_username,
                'codeforces_username': user.codeforces_username,
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
            users_data.append(user_data)
        
        return jsonify({
            'users': users_data,
            'query': query,
            'pagination': {
                'page': page,
                'pages': users.pages,
                'per_page': per_page,
                'total': users.total,
                'has_next': users.has_next,
                'has_prev': users.has_prev
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Search users error: {str(e)}")
        return jsonify({'error': 'Failed to search users'}), 500

@users_bp.route('/stats/refresh', methods=['POST'])
@jwt_required()
def refresh_user_stats():
    """Manually refresh current user's external platform stats"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Trigger immediate stats update
        success = UserService.update_user_stats(user.id)
        
        if success:
            # Reload user with updated stats
            db.session.refresh(user)
            return jsonify({
                'message': 'Stats updated successfully',
                'profile': user.to_dict(include_stats=True)
            }), 200
        else:
            return jsonify({'error': 'Failed to update stats from external platforms'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Refresh stats error: {str(e)}")
        return jsonify({'error': 'Failed to refresh stats'}), 500

@users_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_user_dashboard():
    """Get user dashboard data"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get recent rooms
        recent_participations = RoomParticipant.query.filter_by(
            user_id=current_user_id, 
            is_active=True
        ).join(Room).filter(Room.is_active == True)\
         .order_by(Room.last_activity.desc())\
         .limit(5).all()
        
        recent_rooms = []
        for participation in recent_participations:
            room_data = participation.room.to_dict()
            room_data['user_role'] = participation.role
            room_data['last_activity'] = participation.room.last_activity.isoformat() if participation.room.last_activity else None
            recent_rooms.append(room_data)
        
        # Get owned rooms
        owned_rooms = Room.query.filter_by(
            created_by=current_user_id,
            is_active=True
        ).order_by(Room.last_activity.desc()).limit(5).all()
        
        dashboard_data = {
            'user': user.to_dict(include_stats=True),
            'recent_rooms': recent_rooms,
            'owned_rooms': [room.to_dict() for room in owned_rooms],
            'stats': {
                'total_rooms_created': Room.query.filter_by(created_by=current_user_id, is_active=True).count(),
                'total_rooms_joined': RoomParticipant.query.filter_by(user_id=current_user_id, is_active=True).count(),
                'active_participations': len(recent_participations)
            }
        }
        
        return jsonify({'dashboard': dashboard_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get dashboard error: {str(e)}")
        return jsonify({'error': 'Failed to get dashboard data'}), 500

@users_bp.route('/rooms', methods=['GET'])
@jwt_required()
def get_user_rooms():
    """Get current user's rooms (both owned and participated)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get rooms where user is participant
        participations = RoomParticipant.query.filter_by(
            user_id=current_user_id,
            is_active=True
        ).join(Room).filter(Room.is_active == True)\
         .order_by(Room.last_activity.desc()).all()
        
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
        
        return jsonify({'rooms': rooms_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get user rooms error: {str(e)}")
        return jsonify({'error': 'Failed to get user rooms'}), 500

# Error handlers
@users_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@users_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401

@users_bp.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'Forbidden'}), 403

@users_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'User not found'}), 404

@users_bp.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500