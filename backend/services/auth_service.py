import requests
import jwt
from flask import current_app
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import json
from functools import lru_cache
import time
from jwt.algorithms import RSAAlgorithm

class AuthService:
    """Authentication service for Auth0 integration"""
    
    @staticmethod
    @lru_cache(maxsize=1)
    def get_auth0_public_key():
        """Get Auth0 public key for JWT verification (cached)"""
        try:
            domain = current_app.config['AUTH0_DOMAIN']
            jwks_url = f"https://{domain}/.well-known/jwks.json"
            
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            
            jwks = response.json()
            
            # Get the first key (most applications use the first key)
            if jwks.get('keys'):
                key_data = jwks['keys'][0]
                
                # Convert JWK to PEM format using jwt.algorithms
                public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
                
                return public_key
            else:
                raise Exception("No keys found in JWKS")
                
        except Exception as e:
            current_app.logger.error(f"Failed to get Auth0 public key: {str(e)}")
            raise e
    
    @staticmethod
    def verify_auth0_token(token):
        """Verify Auth0 JWT token and return payload"""
        try:
            # Get the public key
            public_key = AuthService.get_auth0_public_key()
            
            # Verify and decode the token
            payload = jwt.decode(
                token,
                public_key,
                algorithms=current_app.config['AUTH0_ALGORITHMS'],
                audience=current_app.config['AUTH0_AUDIENCE'],
                issuer=f"https://{current_app.config['AUTH0_DOMAIN']}/"
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError as e:
            raise Exception(f"Invalid token: {str(e)}")
        except Exception as e:
            raise Exception(f"Token verification failed: {str(e)}")
    
    @staticmethod
    def get_auth0_user_info(access_token):
        """Get user info from Auth0 using access token"""
        try:
            domain = current_app.config['AUTH0_DOMAIN']
            userinfo_url = f"https://{domain}/userinfo"
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(userinfo_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            current_app.logger.error(f"Failed to get Auth0 user info: {str(e)}")
            raise e
    
    @staticmethod
    def validate_token_claims(payload, required_claims=None):
        """Validate JWT token claims"""
        if required_claims is None:
            required_claims = ['sub', 'email']
        
        for claim in required_claims:
            if claim not in payload:
                raise Exception(f"Missing required claim: {claim}")
        
        # Check token expiration
        exp = payload.get('exp')
        if exp and exp < time.time():
            raise Exception("Token has expired")
        
        # Check token issued at time (not in future)
        iat = payload.get('iat')
        if iat and iat > time.time() + 300:  # Allow 5 minute clock skew
            raise Exception("Token issued in future")
        
        return True
    
    @staticmethod
    def extract_user_data(payload):
        """Extract user data from Auth0 JWT payload"""
        return {
            'auth0_id': payload.get('sub'),
            'email': payload.get('email'),
            'name': payload.get('name') or payload.get('nickname') or payload.get('email', '').split('@')[0],
            'picture': payload.get('picture'),
            'email_verified': payload.get('email_verified', False),
            'given_name': payload.get('given_name'),
            'family_name': payload.get('family_name'),
            'locale': payload.get('locale'),
            'updated_at': payload.get('updated_at')
        }
    
    @staticmethod
    def is_token_blacklisted(jti):
        """Check if token is blacklisted (implement as needed)"""
        # This would typically check against a Redis store or database
        # For now, we'll return False (no blacklisting implemented)
        return False
    
    @staticmethod
    def blacklist_token(jti, exp):
        """Add token to blacklist (implement as needed)"""
        # This would typically add to a Redis store or database
        # with expiration time matching the token's exp claim
        pass
    
    @staticmethod
    def refresh_jwks_cache():
        """Force refresh of JWKS cache"""
        AuthService.get_auth0_public_key.cache_clear()
        return AuthService.get_auth0_public_key()