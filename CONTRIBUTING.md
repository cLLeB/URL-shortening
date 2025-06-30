# Contributing to URL Shortener Pro

Thank you for your interest in contributing to URL Shortener Pro! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

Before creating an issue, please:
1. Check if the issue already exists in our [issue tracker](https://github.com/yourusername/url-shortener-pro/issues)
2. Use the latest version of the application
3. Provide detailed information about the issue

When creating an issue, include:
- **Clear title** describing the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Node.js version, browser, etc.)
- **Screenshots or logs** if applicable

### Suggesting Features

We welcome feature suggestions! Please:
1. Check existing [feature requests](https://github.com/yourusername/url-shortener-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
2. Create a detailed issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach
   - Any relevant mockups or examples

### Code Contributions

#### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/url-shortener-pro.git
   cd url-shortener-pro
   ```

2. **Set up development environment**
   ```bash
   # Install dependencies
   cd backend && npm install
   cd ../frontend && npm install
   
   # Set up environment variables
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Start development servers
   docker-compose up -d postgres redis
   cd backend && npm run migrate && npm run dev
   cd ../frontend && npm start
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Development Guidelines

##### Code Style
- Follow the existing code style and conventions
- Use ESLint and Prettier configurations provided
- Write meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/)

##### Backend Development
- Use TypeScript for type safety where applicable
- Follow RESTful API design principles
- Implement proper error handling
- Add comprehensive tests for new features
- Use Joi for input validation
- Follow security best practices

##### Frontend Development
- Use TypeScript for all new components
- Follow React best practices and hooks patterns
- Implement responsive design with Tailwind CSS
- Add proper accessibility attributes
- Write unit tests for components
- Use proper state management patterns

##### Testing Requirements
- Write unit tests for new functions/components
- Add integration tests for API endpoints
- Ensure test coverage remains above 80%
- All tests must pass before submitting PR

##### Documentation
- Update relevant documentation for new features
- Add JSDoc comments for functions and classes
- Update API documentation if endpoints change
- Include examples in documentation

#### Pull Request Process

1. **Before submitting**
   - Ensure all tests pass: `npm test`
   - Run linting: `npm run lint`
   - Check formatting: `npm run format:check`
   - Update documentation if needed
   - Add/update tests for your changes

2. **Creating the PR**
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues using keywords (fixes #123)
   - Add screenshots for UI changes
   - Request review from maintainers

3. **PR Requirements**
   - All CI checks must pass
   - Code review approval required
   - No merge conflicts
   - Branch is up to date with main

#### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `perf`: Performance improvements

**Examples:**
```
feat(auth): add password reset functionality
fix(urls): resolve duplicate short code generation
docs(api): update authentication endpoints
test(utils): add validation utility tests
```

## 🏗️ Project Structure

```
url-shortener-pro/
├── backend/                # Node.js API server
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utility functions
│   ├── tests/             # Test files
│   └── package.json
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   └── package.json
├── docs/                  # Documentation
├── .github/               # GitHub workflows
└── docker-compose.yml     # Docker configuration
```

## 🧪 Testing Guidelines

### Backend Testing
- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test API endpoints and database interactions
- **Security Tests**: Test authentication and authorization

### Frontend Testing
- **Component Tests**: Test React components in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows

### Test Commands
```bash
# Backend
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report

# Frontend
cd frontend
npm test                   # Run all tests
npm run test:coverage      # Coverage report
```

## 🔒 Security Guidelines

### Reporting Security Issues
- **DO NOT** create public issues for security vulnerabilities
- Email security@yourproject.com with details
- Follow responsible disclosure practices

### Security Best Practices
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Follow OWASP guidelines
- Keep dependencies updated

## 📋 Code Review Guidelines

### For Authors
- Keep PRs focused and small
- Write clear descriptions
- Respond to feedback promptly
- Update based on review comments

### For Reviewers
- Be constructive and respectful
- Focus on code quality and security
- Check for proper testing
- Verify documentation updates

## 🎯 Development Priorities

### High Priority
- Security improvements
- Performance optimizations
- Bug fixes
- Test coverage improvements

### Medium Priority
- New features
- UI/UX improvements
- Documentation updates
- Code refactoring

### Low Priority
- Nice-to-have features
- Experimental features
- Non-critical optimizations

## 📚 Resources

### Documentation
- [Setup Guide](docs/SETUP.md)
- [API Documentation](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)

### External Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Best Practices](https://reactjs.org/docs/thinking-in-react.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

## 📞 Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Check the docs/ directory first
- **Code Review**: Ask questions in PR comments

## 📄 License

By contributing to URL Shortener Pro, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to URL Shortener Pro! 🚀
