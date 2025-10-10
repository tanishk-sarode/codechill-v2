# CodeChill Frontend

A real-time collaborative coding platform built with Angular 20.

## Features

- 🔥 **Real-time Collaboration**: Code together with multiple developers simultaneously
- 💬 **Integrated Chat**: Communicate with team members while coding
- 🎯 **Multiple Language Support**: JavaScript, TypeScript, Python, Java, C++, and more
- 👤 **User Profiles**: GitHub, LeetCode, and Codeforces integration
- 🏠 **Room Management**: Create public or private coding rooms
- 🎨 **Modern UI**: Built with Tailwind CSS and Angular Material
- 🌙 **Dark Mode**: Automatic theme switching support
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Angular 20 (Standalone Components, Signals)
- **Authentication**: Auth0
- **Real-time**: Socket.IO
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor
- **State Management**: Angular Signals
- **HTTP Client**: Angular HttpClient with Interceptors

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Angular CLI 20+

### Installation

1. Clone the repository
   \`\`\`bash
   git clone https://github.com/your-username/codechill-v2.git
   cd codechill-v2/frontend
   \`\`\`

2. Install dependencies
   \`\`\`bash
   npm install
   \`\`\`

3. Configure environment variables
   \`\`\`bash
   cp src/environments/environment.ts src/environments/environment.local.ts
   \`\`\`
   
   Update the environment files with your configuration:
   - Auth0 domain, client ID, and audience
   - Backend API URL
   - Socket.IO server URL

4. Start the development server
   \`\`\`bash
   npm start
   \`\`\`

5. Open your browser and navigate to \`http://localhost:4200\`

## Architecture

### Folder Structure

\`\`\`
src/
├── app/
│   ├── core/              # Core services, guards, interceptors
│   │   ├── guards/        # Route guards (auth, guest)
│   │   ├── interceptors/  # HTTP interceptors
│   │   ├── services/      # Core services (auth, socket, etc.)
│   │   └── types/         # TypeScript interfaces
│   ├── shared/            # Shared components, pipes, services
│   │   ├── components/    # Reusable UI components
│   │   ├── pipes/         # Custom pipes
│   │   └── services/      # Shared services
│   ├── features/          # Feature modules
│   │   ├── auth/          # Authentication components
│   │   ├── room/          # Room management
│   │   ├── editor/        # Code editor
│   │   ├── chat/          # Chat functionality
│   │   └── profile/       # User profiles
│   ├── app.component.ts   # Root component
│   ├── app.config.ts      # App configuration
│   └── app.routes.ts      # Route configuration
├── assets/                # Static assets
├── environments/          # Environment configurations
└── styles/                # Global styles
\`\`\`

### Key Components

#### Core Services

- **AuthenticationService**: Handles user authentication with Auth0
- **SocketService**: Manages WebSocket connections for real-time features
- **EnvironmentService**: Provides environment configuration

#### Shared Components

- **ButtonComponent**: Reusable button with multiple variants
- **InputComponent**: Form input with validation support
- **ModalComponent**: Flexible modal dialog
- **LoadingSpinnerComponent**: Loading indicators

#### Feature Modules

- **Auth**: Login, logout, profile setup
- **Room**: Room creation, joining, participant management
- **Editor**: Monaco editor with real-time collaboration
- **Chat**: Real-time messaging
- **Profile**: User profiles with social integrations

## Development

### Code Style

This project follows Angular's official style guide and uses:

- Standalone components
- Angular Signals for reactive state management
- OnPush change detection strategy
- TypeScript strict mode
- ESLint and Prettier for code formatting

### Testing

Run tests with:

\`\`\`bash
npm test
\`\`\`

### Building

Build for production:

\`\`\`bash
npm run build
\`\`\`

## Environment Configuration

### Development (\`environment.ts\`)

\`\`\`typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api/v1',
  socketUrl: 'http://localhost:5000',
  auth0: {
    domain: 'your-domain.auth0.com',
    clientId: 'your-client-id',
    audience: 'your-audience'
  }
};
\`\`\`

### Production (\`environment.prod.ts\`)

\`\`\`typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.codechill.com/api/v1',
  socketUrl: 'https://api.codechill.com',
  // ... other production configs
};
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help, please:

1. Check the [documentation](docs/)
2. Search existing [issues](https://github.com/your-username/codechill-v2/issues)
3. Create a new issue if needed

## Roadmap

- [ ] Video chat integration
- [ ] Code execution and debugging
- [ ] Git integration
- [ ] Plugin system
- [ ] Mobile app
- [ ] Enterprise features