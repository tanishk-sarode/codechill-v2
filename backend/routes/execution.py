from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import requests
import json

from models import db, Execution, Room, RoomParticipant
from config import JUDGE0_LANGUAGE_MAP

execution_bp = Blueprint('execution', __name__, url_prefix='/api/execution')

@execution_bp.route('/languages', methods=['GET'])
def get_supported_languages():
    """Get supported programming languages"""
    try:
        return jsonify({
            'languages': list(JUDGE0_LANGUAGE_MAP.keys()),
            'language_map': JUDGE0_LANGUAGE_MAP
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get languages error: {str(e)}")
        return jsonify({'error': 'Failed to fetch languages'}), 500

@execution_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_code():
    """Submit code for execution"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        room_id = data.get('room_id')
        language = data.get('language', '').lower()
        source_code = data.get('source_code', '').strip()
        input_data = data.get('input_data', '')
        
        if not room_id:
            return jsonify({'error': 'Room ID is required'}), 400
        
        if not language or language not in JUDGE0_LANGUAGE_MAP:
            return jsonify({'error': f'Unsupported language: {language}'}), 400
        
        if not source_code:
            return jsonify({'error': 'Source code is required'}), 400
        
        if len(source_code) > current_app.config['MAX_CODE_LENGTH']:
            return jsonify({'error': 'Code too long'}), 400
        
        # Check if user is participant of the room
        participation = RoomParticipant.query.filter_by(
            room_id=room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not participation:
            return jsonify({'error': 'Access denied'}), 403
        
        # Create execution record
        execution = Execution()
        execution.room_id = room_id
        execution.user_id = current_user_id
        execution.language = language
        execution.source_code = source_code
        execution.input_data = input_data
        execution.status = 'pending'
        
        db.session.add(execution)
        db.session.commit()
        
        # Submit to Judge0 API in background (simplified for now)
        judge0_language_id = JUDGE0_LANGUAGE_MAP[language]
        
        judge0_payload = {
            'source_code': source_code,
            'language_id': judge0_language_id,
            'stdin': input_data
        }
        
        try:
            # Submit to Judge0
            judge0_headers = {
                'X-RapidAPI-Host': current_app.config['JUDGE0_API_HOST'],
                'X-RapidAPI-Key': current_app.config['JUDGE0_API_KEY'],
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{current_app.config['JUDGE0_API_URL']}/submissions",
                headers=judge0_headers,
                json=judge0_payload,
                timeout=10
            )
            
            if response.status_code == 201:
                judge0_data = response.json()
                execution.judge0_token = judge0_data.get('token')
                execution.status = 'submitted'
                execution.started_at = datetime.utcnow()
                db.session.commit()
                
                return jsonify({
                    'message': 'Code submitted successfully',
                    'execution_id': execution.id,
                    'judge0_token': execution.judge0_token
                }), 201
            else:
                execution.status = 'failed'
                execution.error_output = f"Judge0 API error: {response.status_code}"
                db.session.commit()
                return jsonify({'error': 'Failed to submit to Judge0'}), 500
                
        except requests.RequestException as e:
            execution.status = 'failed'
            execution.error_output = f"Network error: {str(e)}"
            db.session.commit()
            return jsonify({'error': 'Failed to connect to Judge0'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Submit code error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to submit code'}), 500

@execution_bp.route('/<execution_id>/result', methods=['GET'])
@jwt_required()
def get_execution_result(execution_id):
    """Get execution result"""
    try:
        current_user_id = get_jwt_identity()
        
        execution = Execution.query.get(execution_id)
        if not execution:
            return jsonify({'error': 'Execution not found'}), 404
        
        # Check if user has access to this execution
        participation = RoomParticipant.query.filter_by(
            room_id=execution.room_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not participation:
            return jsonify({'error': 'Access denied'}), 403
        
        # If execution is completed, return cached result
        if execution.status == 'completed':
            return jsonify({'execution': execution.to_dict()}), 200
        
        # If still pending/running, check Judge0 status
        if execution.judge0_token and execution.status in ['submitted', 'running']:
            try:
                judge0_headers = {
                    'X-RapidAPI-Host': current_app.config['JUDGE0_API_HOST'],
                    'X-RapidAPI-Key': current_app.config['JUDGE0_API_KEY']
                }
                
                response = requests.get(
                    f"{current_app.config['JUDGE0_API_URL']}/submissions/{execution.judge0_token}",
                    headers=judge0_headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    judge0_data = response.json()
                    
                    # Update execution with Judge0 results
                    execution.judge0_status = judge0_data.get('status', {}).get('description', 'Unknown')
                    execution.output = judge0_data.get('stdout', '')
                    execution.error_output = judge0_data.get('stderr', '')
                    execution.compile_output = judge0_data.get('compile_output', '')
                    execution.execution_time = judge0_data.get('time')
                    execution.memory_usage = judge0_data.get('memory')
                    execution.exit_code = judge0_data.get('exit_code')
                    
                    # Check if execution is finished
                    status_id = judge0_data.get('status', {}).get('id', 0)
                    if status_id in [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]:  # Finished states
                        execution.status = 'completed'
                        execution.completed_at = datetime.utcnow()
                    else:
                        execution.status = 'running'
                    
                    db.session.commit()
                
            except requests.RequestException as e:
                current_app.logger.error(f"Judge0 API error: {str(e)}")
        
        return jsonify({'execution': execution.to_dict()}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get execution result error: {str(e)}")
        return jsonify({'error': 'Failed to get execution result'}), 500

@execution_bp.route('/room/<room_id>/history', methods=['GET'])
@jwt_required()
def get_execution_history(room_id):
    """Get execution history for a room"""
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
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        
        executions = Execution.query.filter_by(room_id=room_id)\
            .order_by(Execution.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'executions': [e.to_dict() for e in executions.items],
            'pagination': {
                'page': page,
                'pages': executions.pages,
                'per_page': per_page,
                'total': executions.total,
                'has_next': executions.has_next,
                'has_prev': executions.has_prev
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get execution history error: {str(e)}")
        return jsonify({'error': 'Failed to get execution history'}), 500

# Error handlers
@execution_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@execution_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401

@execution_bp.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'Forbidden'}), 403

@execution_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@execution_bp.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500