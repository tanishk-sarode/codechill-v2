# CodeChill Backend

Real-time collaborative coding platform backend built with Flask and Socket.IO.

## Features

- **Real-time Collaboration**: Live code editing with multiple users
- **Authentication**: Auth0 integration for secure user management
- **Room Management**: Create public/private coding rooms
- **Chat System**: Real-time messaging within rooms
- **Code Execution**: Run code in multiple languages using Judge0 API
- **Profile Integration**: GitHub, LeetCode, and Codeforces stats
- **WebSocket Communication**: Socket.IO for real-time features

## Tech Stack

- **Framework**: Flask 3.0.0
- **Real-time**: Flask-SocketIO 5.3.6
- **Database**: MySQL with SQLAlchemy ORM
- **Authentication**: Auth0 with JWT tokens
- **API Integration**: Judge0 for code execution
- **External APIs**: GitHub, LeetCode, Codeforces

## Installation

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Database Setup**
   ```bash
   # Install MySQL and create database
   mysql -u root -p
   
    CREATE DATABASE codechill;
    CREATE USER 'codechill'@'localhost' IDENTIFIED BY 'password';
    GRANT ALL PRIVILEGES ON codechill.* TO 'codechill'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;

   ```

3. **Environment Configuration**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Auth0 Setup**
   - Create Auth0 application
   - Set up API audience
   - Configure callback URLs
   - Add domain, client ID, secret to .env

5. **Judge0 API Setup** (Optional)
   - Get API key from RapidAPI
   - Add to .env file

## Running the Application

### Development
```bash
# Start the backend server
python run.py
```

The server will start on `http://localhost:5000` with Socket.IO on `ws://localhost:5000/socket.io`

### Production
```bash
# Set production environment
export FLASK_ENV=production

# Use gunicorn with eventlet for Socket.IO
pip install gunicorn eventlet
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 app:app
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Auth0 token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout user

### Rooms
- `GET /api/rooms` - Get public rooms (paginated)
- `POST /api/rooms` - Create new room
- `GET /api/rooms/{id}` - Get room details
- `PUT /api/rooms/{id}` - Update room (owner only)
- `DELETE /api/rooms/{id}` - Delete room (owner only)
- `POST /api/rooms/{id}/join` - Join room
- `POST /api/rooms/{id}/leave` - Leave room
- `GET /api/rooms/my-rooms` - Get user's rooms

### Utility
- `GET /health` - Health check
- `GET /api` - API information

## WebSocket Events

### Connection Management
- `connect` - Client connection with JWT auth
- `disconnect` - Client disconnection
- `join_room` - Join a coding room
- `leave_room` - Leave a coding room

### Real-time Collaboration
- `code_change` - Send code changes
- `code_updated` - Receive code updates
- `cursor_update` - Send cursor position
- `cursor_moved` - Receive cursor updates

### Chat
- `send_message` - Send chat message
- `new_message` - Receive chat message

### Code Execution
- `execute_code` - Execute code
- `execution_started` - Execution began
- `execution_completed` - Execution finished

### Room State
- `get_room_state` - Get current room state
- `room_state` - Receive room state
- `user_joined` - User joined room
- `user_left` - User left room

## Database Schema

### Users
- Authentication and profile information
- External platform stats (GitHub, LeetCode, Codeforces)

### Rooms
- Coding room configuration and content
- Participant management

### Messages
- Real-time chat messages
- Message threading support

### Executions
- Code execution history
- Judge0 integration results

## Configuration

### Environment Variables

#### Required
- `SECRET_KEY` - Flask secret key
- `MYSQL_HOST` - Database host
- `MYSQL_USERNAME` - Database username
- `MYSQL_PASSWORD` - Database password
- `MYSQL_DATABASE` - Database name
- `AUTH0_DOMAIN` - Auth0 domain
- `AUTH0_CLIENT_ID` - Auth0 client ID
- `AUTH0_CLIENT_SECRET` - Auth0 client secret
- `AUTH0_AUDIENCE` - Auth0 API audience

#### Optional
- `JUDGE0_API_KEY` - Judge0 API key for code execution
- `REDIS_URL` - Redis URL for rate limiting
- `CORS_ORIGINS` - Allowed CORS origins
- `LOG_LEVEL` - Logging level

### Supported Languages
- JavaScript (Node.js)
- Python 3
- Java
- C++
- C
- C#
- PHP
- Ruby
- Go
- Rust
- Kotlin
- Swift
- TypeScript

## Development

### Project Structure
```
backend/
├── app.py              # Flask application factory
├── run.py              # Development server runner
├── requirements.txt    # Python dependencies
├── config/
│   └── __init__.py    # Configuration classes
├── models/
│   └── __init__.py    # Database models
├── routes/
│   ├── auth.py        # Authentication routes
│   └── room.py        # Room management routes
├── services/
│   ├── auth_service.py    # Auth0 integration
│   ├── user_service.py    # User operations
│   └── room_service.py    # Room operations
└── sockets/
    └── __init__.py    # Socket.IO handlers
```

### Code Style
- Follow PEP 8 for Python code style
- Use type hints where appropriate
- Document functions with docstrings
- Use meaningful variable names

### Testing
```bash
# Run tests (when implemented)
python -m pytest tests/
```

## Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "app:app"]
```

### Environment Setup
1. Set production environment variables
2. Configure MySQL database
3. Set up Auth0 production application
4. Configure Judge0 API access
5. Set up SSL/TLS certificates
6. Configure reverse proxy (nginx)

## Monitoring

### Health Checks
- `GET /health` - Application health status
- Database connectivity check
- External API availability

### Logging
- Structured logging with timestamps
- Error tracking and alerting
- Performance monitoring

## Security

### Authentication
- JWT token-based authentication
- Auth0 integration for user management
- Token refresh mechanism

### Authorization
- Room-based access control
- Owner/participant role system
- Private room password protection

### Rate Limiting
- API endpoint rate limiting
- WebSocket connection limits
- Code execution throttling

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file for details