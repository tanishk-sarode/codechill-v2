from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.exceptions import BadRequest, Unauthorized, NotFound
import requests
import json
from datetime import datetime, timedelta
import jwt as pyjwt
from functools import wraps

from models import db, User
from services.auth_service import AuthService
from services.user_service import UserService

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def verify_auth0_token(f):
    """Decorator to verify Auth0 JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        try:
            token = auth_header.split(' ')[1]  # Remove 'Bearer ' prefix
            payload = AuthService.verify_auth0_token(token)
            g.user_info = payload
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"Token verification failed: {str(e)}")
            return jsonify({'error': 'Invalid token'}), 401
    
    return decorated_function

@auth_bp.route('/sync', methods=['POST'])
def sync_user():
    """Sync user with Auth0 token (for frontend authentication)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        # Extract Auth0 token
        token = auth_header.split(' ')[1]  # Remove 'Bearer ' prefix
        payload = AuthService.verify_auth0_token(token)
        
        # Extract user data from Auth0 token with fallbacks
        request_data = request.get_json(silent=True) or {}
        auth0_id = payload.get('sub') or request_data.get('auth0Id') or request_data.get('auth0_id')
        email = payload.get('email') or request_data.get('email')
        name = payload.get('name') or payload.get('nickname') or request_data.get('name')
        picture = payload.get('picture') or request_data.get('picture')

        if not email or not name or not picture:
            try:
                userinfo = AuthService.get_auth0_user_info(token)
                email = email or userinfo.get('email')
                name = name or userinfo.get('name') or userinfo.get('nickname')
                picture = picture or userinfo.get('picture')
            except Exception as info_error:
                current_app.logger.warning(f"Auth0 userinfo fetch failed: {str(info_error)}")

        if not auth0_id or not email:
            return jsonify({'error': 'Invalid token payload'}), 400

        if not name and email:
            name = email.split('@')[0] if '@' in email else email
        
        # Find or create user
        user = User.query.filter_by(auth0_id=auth0_id).first()
        
        if not user:
            # Create new user
            user = User()
            user.auth0_id = auth0_id
            user.email = email
            user.name = name
            user.picture = picture
            user.is_verified = payload.get('email_verified', False)
            db.session.add(user)
        else:
            # Update existing user info
            user.email = email
            user.name = name
            user.picture = picture
            user.is_verified = payload.get('email_verified', False)
            user.last_active = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'data': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"User sync error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'User sync failed'}), 500

@auth_bp.route('/login', methods=['POST'])
@verify_auth0_token
def login():
    """Login with Auth0 token and create/update user"""
    try:
        user_info = g.user_info
        
        # Extract user data from Auth0 token
        auth0_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name') or user_info.get('nickname') or email.split('@')[0]
        picture = user_info.get('picture')
        
        if not auth0_id or not email:
            return jsonify({'error': 'Invalid token payload'}), 400
        
        # Find or create user
        user = User.query.filter_by(auth0_id=auth0_id).first()
        
        if not user:
            # Create new user
            user = User(
                auth0_id=auth0_id,
                email=email,
                name=name,
                picture=picture,
                is_verified=user_info.get('email_verified', False)
            )
            db.session.add(user)
        else:
            # Update existing user info
            user.email = email
            user.name = name
            user.picture = picture
            user.is_verified = user_info.get('email_verified', False)
            user.last_active = datetime.utcnow()
        
        db.session.commit()
        
        # Create JWT tokens for our application
        access_token = create_access_token(
            identity=user.id,
            additional_claims={
                'email': user.email,
                'name': user.name,
                'picture': user.picture
            }
        )
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'User not found or inactive'}), 404
        
        # Update last active time
        user.last_active = datetime.utcnow()
        db.session.commit()
        
        # Create new access token
        access_token = create_access_token(
            identity=user.id,
            additional_claims={
                'email': user.email,
                'name': user.name,
                'picture': user.picture
            }
        )
        
        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'error': 'Token refresh failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client should discard tokens)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user:
            user.last_active = datetime.utcnow()
            db.session.commit()
        
        # In a real application, you might want to blacklist the token
        # For now, we just rely on client-side token removal
        
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': user.to_dict(include_stats=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get profile error: {str(e)}")
        return jsonify({'error': 'Failed to get profile'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'name' in data:
            user.name = data['name'].strip()
        
        if 'github_username' in data:
            user.github_username = data['github_username'].strip() if data['github_username'] else None
        
        if 'leetcode_username' in data:
            user.leetcode_username = data['leetcode_username'].strip() if data['leetcode_username'] else None
        
        if 'codeforces_username' in data:
            user.codeforces_username = data['codeforces_username'].strip() if data['codeforces_username'] else None
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Trigger background task to update external stats
        UserService.update_user_stats_async(user.id)
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Update profile error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile'}), 500

@auth_bp.route('/verify-token', methods=['POST'])
@jwt_required()
def verify_token():
    """Verify if current JWT token is valid"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Invalid user'}), 401
        
        # Update last active time
        user.last_active = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'valid': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({'valid': False, 'error': 'Invalid token'}), 401

@auth_bp.route('/stats/refresh', methods=['POST'])
@jwt_required()
def refresh_stats():
    """Manually refresh user's external platform stats"""
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
                'user': user.to_dict(include_stats=True)
            }), 200
        else:
            return jsonify({'error': 'Failed to update stats'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Stats refresh error: {str(e)}")
        return jsonify({'error': 'Failed to refresh stats'}), 500

@auth_bp.route('/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Delete user account (soft delete)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Soft delete - deactivate account
        user.is_active = False
        user.updated_at = datetime.utcnow()
        
        # Leave rooms the user is participating in
        UserService.leave_all_rooms(user.id)
        
        db.session.commit()
        
        return jsonify({'message': 'Account deleted successfully'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Delete account error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete account'}), 500

# Error handlers
@auth_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@auth_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401

@auth_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@auth_bp.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500