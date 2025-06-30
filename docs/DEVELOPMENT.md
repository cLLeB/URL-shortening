# Development Guide

This guide covers the development workflow, coding standards, and contribution guidelines for URL Shortener Pro.

## Development Environment Setup

### Prerequisites
- Node.js 18.0+ and npm 8.0+
- PostgreSQL 14.0+
- Redis 7.0+
- Git
- Code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd url-shortener-pro
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Setup environment files**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your local configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Setup databases**
   ```bash
   # Create PostgreSQL database
   createdb url_shortener_dev
   createdb url_shortener_test
   
   # Run migrations
   cd backend
   npm run migrate
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm start
   ```

## Project Structure

```
url-shortener-pro/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── database/          # Database migrations and seeds
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   └── server.js         # Application entry point
│   ├── tests/                # Test files
│   ├── logs/                 # Application logs
│   └── package.json
├── frontend/                  # React TypeScript app
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Application pages
│   │   ├── services/        # API integration
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript type definitions
│   └── package.json
├── docs/                     # Documentation
├── docker-compose.yml        # Docker orchestration
└── README.md
```

## Coding Standards

### Backend (Node.js)

#### Code Style
- Use ES6+ features and async/await
- Follow camelCase for variables and functions
- Use PascalCase for classes and constructors
- Use UPPER_SNAKE_CASE for constants
- Use meaningful variable and function names

#### File Organization
- One class/service per file
- Group related functions in services
- Keep route handlers thin, move logic to services
- Use middleware for cross-cutting concerns

#### Example Code Structure
```javascript
// services/urlService.js
class UrlService {
  async createUrl(urlData) {
    // Validation
    this.validateUrlData(urlData);
    
    // Business logic
    const shortCode = await this.generateShortCode();
    
    // Database operation
    return await this.saveUrl({ ...urlData, shortCode });
  }
  
  validateUrlData(data) {
    // Validation logic
  }
  
  async generateShortCode() {
    // Short code generation logic
  }
}
```

#### Error Handling
```javascript
// Use custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Handle errors in middleware
const errorHandler = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: err.message,
      field: err.field
    });
  }
  
  // Log unexpected errors
  logger.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
```

### Frontend (React/TypeScript)

#### Code Style
- Use TypeScript for type safety
- Follow React functional components with hooks
- Use camelCase for variables and functions
- Use PascalCase for components and types
- Use kebab-case for file names

#### Component Structure
```typescript
// components/UrlCard.tsx
interface UrlCardProps {
  url: Url;
  onEdit: (url: Url) => void;
  onDelete: (id: string) => void;
}

const UrlCard: React.FC<UrlCardProps> = ({ url, onEdit, onDelete }) => {
  const handleEdit = useCallback(() => {
    onEdit(url);
  }, [url, onEdit]);

  return (
    <div className="card">
      {/* Component JSX */}
    </div>
  );
};

export default UrlCard;
```

#### State Management
```typescript
// Use React Context for global state
interface AppState {
  user: User | null;
  isLoading: boolean;
}

const AppContext = createContext<AppState | undefined>(undefined);

// Custom hook for context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
```

#### API Integration
```typescript
// services/api.ts
class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
    });
    
    this.setupInterceptors();
  }

  async createUrl(data: CreateUrlData): Promise<Url> {
    const response = await this.api.post<{ url: Url }>('/urls', data);
    return response.data.url;
  }
}
```

## Testing Guidelines

### Backend Testing

#### Unit Tests
```javascript
// tests/__tests__/unit/urlService.test.js
describe('UrlService', () => {
  describe('createUrl', () => {
    it('should create URL with valid data', async () => {
      const urlData = {
        originalUrl: 'https://example.com',
        title: 'Test URL'
      };
      
      const result = await urlService.createUrl(urlData);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('shortCode');
      expect(result.originalUrl).toBe(urlData.originalUrl);
    });
  });
});
```

#### Integration Tests
```javascript
// tests/__tests__/integration/auth.test.js
describe('Authentication API', () => {
  it('should register user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

### Frontend Testing

#### Component Tests
```typescript
// src/__tests__/components/UrlCard.test.tsx
describe('UrlCard', () => {
  const mockUrl: Url = {
    id: '1',
    originalUrl: 'https://example.com',
    shortCode: 'abc123',
    title: 'Test URL'
  };

  it('renders URL information correctly', () => {
    render(
      <UrlCard 
        url={mockUrl} 
        onEdit={jest.fn()} 
        onDelete={jest.fn()} 
      />
    );

    expect(screen.getByText('Test URL')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });
});
```

#### Service Tests
```typescript
// src/__tests__/services/api.test.ts
describe('ApiService', () => {
  it('should login successfully', async () => {
    const mockResponse = {
      data: {
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' }
      }
    };

    mockedAxios.post.mockResolvedValue(mockResponse);

    const result = await apiService.login({
      email: 'test@example.com',
      password: 'password'
    });

    expect(result).toEqual(mockResponse.data);
  });
});
```

### Running Tests

```bash
# Backend tests
cd backend
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage

# Frontend tests
cd frontend
npm test                   # Run all tests
npm run test:coverage      # Run tests with coverage
```

## Git Workflow

### Branch Naming
- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes
- `refactor/component-name` - Code refactoring
- `docs/documentation-update` - Documentation updates

### Commit Messages
Follow conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add password reset functionality
fix(urls): resolve duplicate short code generation
docs(api): update authentication endpoints
test(utils): add validation utility tests
```

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat(feature): add new functionality"
   ```

3. **Push branch and create PR**
   ```bash
   git push origin feature/new-feature
   ```

4. **PR Requirements**
   - Clear description of changes
   - Link to related issues
   - All tests passing
   - Code review approval
   - No merge conflicts

### Code Review Guidelines

#### For Authors
- Keep PRs small and focused
- Write clear commit messages
- Add tests for new functionality
- Update documentation if needed
- Respond to feedback promptly

#### For Reviewers
- Review code logic and architecture
- Check for security vulnerabilities
- Verify test coverage
- Ensure coding standards compliance
- Provide constructive feedback

## Development Tools

### Recommended VS Code Extensions
- ESLint
- Prettier
- TypeScript Hero
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens
- Thunder Client (API testing)

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### Debugging

#### Backend Debugging
```bash
# Start with debugger
npm run dev:debug

# Or use VS Code launch configuration
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/backend/src/server.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### Frontend Debugging
- Use React Developer Tools browser extension
- Use browser debugger with source maps
- Add `debugger;` statements in code
- Use VS Code debugger for Chrome

## Performance Optimization

### Backend
- Use database indexes for frequently queried fields
- Implement Redis caching for hot data
- Use connection pooling for database
- Optimize SQL queries
- Implement rate limiting

### Frontend
- Use React.memo for expensive components
- Implement lazy loading for routes
- Optimize bundle size with code splitting
- Use service workers for caching
- Optimize images and assets

## Security Considerations

### Backend Security
- Validate all input data
- Use parameterized queries
- Implement proper authentication
- Use HTTPS in production
- Set security headers
- Rate limit API endpoints

### Frontend Security
- Sanitize user input
- Use Content Security Policy
- Validate data from API
- Store sensitive data securely
- Implement proper error handling

## Deployment

### Development Deployment
```bash
# Using Docker Compose
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production Deployment
See [Deployment Guide](DEPLOYMENT.md) for detailed instructions.

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check PostgreSQL is running
   - Verify connection credentials
   - Ensure database exists

2. **Redis connection errors**
   - Check Redis is running
   - Verify Redis configuration
   - Check network connectivity

3. **Frontend build errors**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify environment variables

4. **Test failures**
   - Check test database setup
   - Verify mock configurations
   - Clear test data between runs

### Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Ask in team chat/discussions
4. Create detailed issue report

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Address review feedback
6. Merge after approval

Thank you for contributing to URL Shortener Pro!
