import requests
from flask import current_app
from datetime import datetime
import threading
from typing import Optional, Dict, Any
import json

from models import db, User, Room, RoomParticipant

class UserService:
    """Service for user-related operations"""
    
    @staticmethod
    def update_user_stats_async(user_id: str):
        """Update user stats asynchronously"""
        thread = threading.Thread(target=UserService.update_user_stats, args=(user_id,))
        thread.daemon = True
        thread.start()
    
    @staticmethod
    def update_user_stats(user_id: str) -> bool:
        """Update user's external platform stats"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            updated = False
            
            # Update GitHub stats
            if user.github_username:
                github_stats = UserService.fetch_github_stats(user.github_username)
                if github_stats:
                    user.github_stats = github_stats
                    updated = True
            
            # Update LeetCode stats
            if user.leetcode_username:
                leetcode_stats = UserService.fetch_leetcode_stats(user.leetcode_username)
                if leetcode_stats:
                    user.leetcode_stats = leetcode_stats
                    updated = True
            
            # Update Codeforces stats
            if user.codeforces_username:
                codeforces_stats = UserService.fetch_codeforces_stats(user.codeforces_username)
                if codeforces_stats:
                    user.codeforces_stats = codeforces_stats
                    updated = True
            
            if updated:
                user.updated_at = datetime.utcnow()
                db.session.commit()
            
            return True
            
        except Exception as e:
            current_app.logger.error(f"Failed to update user stats for {user_id}: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def fetch_github_stats(username: str) -> Optional[Dict[str, Any]]:
        """Fetch GitHub user statistics"""
        try:
            # Get user info
            user_url = f"{current_app.config['GITHUB_API_URL']}/users/{username}"
            response = requests.get(user_url, timeout=10)
            
            if response.status_code != 200:
                return None
            
            user_data = response.json()
            
            # Get repositories info
            repos_url = f"{current_app.config['GITHUB_API_URL']}/users/{username}/repos"
            repos_response = requests.get(repos_url, params={'per_page': 100}, timeout=10)
            
            repos_data = repos_response.json() if repos_response.status_code == 200 else []
            
            # Calculate stats
            total_stars = sum(repo.get('stargazers_count', 0) for repo in repos_data)
            total_forks = sum(repo.get('forks_count', 0) for repo in repos_data)
            languages = {}
            
            for repo in repos_data:
                if repo.get('language'):
                    languages[repo['language']] = languages.get(repo['language'], 0) + 1
            
            return {
                'username': username,
                'name': user_data.get('name'),
                'bio': user_data.get('bio'),
                'location': user_data.get('location'),
                'company': user_data.get('company'),
                'blog': user_data.get('blog'),
                'public_repos': user_data.get('public_repos', 0),
                'followers': user_data.get('followers', 0),
                'following': user_data.get('following', 0),
                'total_stars': total_stars,
                'total_forks': total_forks,
                'languages': languages,
                'created_at': user_data.get('created_at'),
                'updated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            current_app.logger.error(f"Failed to fetch GitHub stats for {username}: {str(e)}")
            return None
    
    @staticmethod
    def fetch_leetcode_stats(username: str) -> Optional[Dict[str, Any]]:
        """Fetch LeetCode user statistics"""
        try:
            # LeetCode GraphQL query
            query = """
            query getUserProfile($username: String!) {
                matchedUser(username: $username) {
                    username
                    profile {
                        realName
                        aboutMe
                        country
                        company
                        school
                        ranking
                    }
                    submitStats {
                        acSubmissionNum {
                            difficulty
                            count
                            submissions
                        }
                        totalSubmissionNum {
                            difficulty
                            count
                            submissions
                        }
                    }
                }
            }
            """
            
            variables = {"username": username}
            
            response = requests.post(
                current_app.config['LEETCODE_API_URL'],
                json={"query": query, "variables": variables},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            user_data = data.get('data', {}).get('matchedUser')
            
            if not user_data:
                return None
            
            profile = user_data.get('profile', {})
            submit_stats = user_data.get('submitStats', {})
            
            # Parse submission stats
            ac_stats = submit_stats.get('acSubmissionNum', [])
            total_stats = submit_stats.get('totalSubmissionNum', [])
            
            ac_by_difficulty = {stat['difficulty']: stat['count'] for stat in ac_stats}
            total_by_difficulty = {stat['difficulty']: stat['count'] for stat in total_stats}
            
            return {
                'username': username,
                'real_name': profile.get('realName'),
                'about_me': profile.get('aboutMe'),
                'country': profile.get('country'),
                'company': profile.get('company'),
                'school': profile.get('school'),
                'ranking': profile.get('ranking'),
                'accepted_submissions': ac_by_difficulty,
                'total_submissions': total_by_difficulty,
                'updated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            current_app.logger.error(f"Failed to fetch LeetCode stats for {username}: {str(e)}")
            return None
    
    @staticmethod
    def fetch_codeforces_stats(username: str) -> Optional[Dict[str, Any]]:
        """Fetch Codeforces user statistics"""
        try:
            # Get user info
            user_url = f"{current_app.config['CODEFORCES_API_URL']}/user.info"
            response = requests.get(user_url, params={'handles': username}, timeout=10)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            
            if data.get('status') != 'OK' or not data.get('result'):
                return None
            
            user_data = data['result'][0]
            
            # Get user submissions
            submissions_url = f"{current_app.config['CODEFORCES_API_URL']}/user.status"
            submissions_response = requests.get(
                submissions_url, 
                params={'handle': username, 'from': 1, 'count': 1000}, 
                timeout=10
            )
            
            submissions_data = []
            if submissions_response.status_code == 200:
                submissions_result = submissions_response.json()
                if submissions_result.get('status') == 'OK':
                    submissions_data = submissions_result.get('result', [])
            
            # Calculate stats
            accepted_count = len([s for s in submissions_data if s.get('verdict') == 'OK'])
            total_submissions = len(submissions_data)
            
            problem_ratings = [s.get('problem', {}).get('rating') for s in submissions_data 
                             if s.get('verdict') == 'OK' and s.get('problem', {}).get('rating')]
            
            return {
                'username': username,
                'first_name': user_data.get('firstName'),
                'last_name': user_data.get('lastName'),
                'country': user_data.get('country'),
                'city': user_data.get('city'),
                'organization': user_data.get('organization'),
                'rating': user_data.get('rating'),
                'max_rating': user_data.get('maxRating'),
                'rank': user_data.get('rank'),
                'max_rank': user_data.get('maxRank'),
                'contribution': user_data.get('contribution'),
                'registration_time': user_data.get('registrationTimeSeconds'),
                'last_online_time': user_data.get('lastOnlineTimeSeconds'),
                'accepted_count': accepted_count,
                'total_submissions': total_submissions,
                'max_problem_rating': max(problem_ratings) if problem_ratings else None,
                'avg_problem_rating': sum(problem_ratings) / len(problem_ratings) if problem_ratings else None,
                'updated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            current_app.logger.error(f"Failed to fetch Codeforces stats for {username}: {str(e)}")
            return None
    
    @staticmethod
    def leave_all_rooms(user_id: str) -> bool:
        """Remove user from all rooms"""
        try:
            # Update all active participations to inactive
            participations = RoomParticipant.query.filter_by(
                user_id=user_id, 
                is_active=True
            ).all()
            
            for participation in participations:
                participation.is_active = False
                participation.left_at = datetime.utcnow()
                
                # Update room participant count
                room = participation.room
                if room:
                    room.current_participants = max(0, room.current_participants - 1)
            
            db.session.commit()
            return True
            
        except Exception as e:
            current_app.logger.error(f"Failed to leave all rooms for user {user_id}: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def get_user_rooms(user_id: str) -> list:
        """Get all rooms where user is active participant"""
        try:
            participations = RoomParticipant.query.filter_by(
                user_id=user_id,
                is_active=True
            ).join(Room).filter(Room.is_active == True).all()
            
            return [p.room.to_dict() for p in participations]
            
        except Exception as e:
            current_app.logger.error(f"Failed to get user rooms for {user_id}: {str(e)}")
            return []
    
    @staticmethod
    def update_user_activity(user_id: str):
        """Update user's last active timestamp"""
        try:
            user = User.query.get(user_id)
            if user:
                user.last_active = datetime.utcnow()
                db.session.commit()
                
        except Exception as e:
            current_app.logger.error(f"Failed to update activity for user {user_id}: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def search_users(query: str, limit: int = 10) -> list:
        """Search users by name or email"""
        try:
            users = User.query.filter(
                User.is_active.is_(True),
                db.or_(
                    User.name.ilike(f'%{query}%'),
                    User.email.ilike(f'%{query}%')
                )
            ).limit(limit).all()
            
            return [user.to_dict() for user in users]
            
        except Exception as e:
            current_app.logger.error(f"Failed to search users with query '{query}': {str(e)}")
            return []