# Contributing to Hub

Thank you for your interest in contributing to Hub! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Git
- A code editor (VS Code recommended)
- Basic knowledge of TypeScript, React, and WebSocket/WebRTC

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/hub.git
   cd hub
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Verify Setup**
   - Open http://localhost:3000 in your browser
   - Check that WebSocket connection works
   - Test basic functionality (join, user list, messaging)

## 📋 Development Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/improvements

### Commit Messages
Follow conventional commits format:
```
type(scope): description

feat(messaging): add typing indicators
fix(webrtc): resolve connection timeout issue
docs(api): update WebSocket message format
test(session): add session manager unit tests
```

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting (Prettier configured)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## 🏗️ Project Structure

```
hub/
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   ├── lib/                 # Utility libraries
│   ├── types/               # TypeScript type definitions
│   └── hooks/               # Custom React hooks
├── docs/                    # Project documentation
├── public/                  # Static assets
├── server.ts               # Custom Next.js server
└── package.json
```

### Key Files
- `server.ts` - Main server with WebSocket handling
- `src/types/messages.ts` - WebSocket message schemas
- `src/lib/session-manager.ts` - Session management logic
- `src/components/` - UI components
- `docs/` - Comprehensive documentation

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Test Categories
1. **Unit Tests**: Individual functions and components
2. **Integration Tests**: WebSocket message handling
3. **E2E Tests**: Full user workflows
4. **Performance Tests**: Load testing with multiple users

### Writing Tests
- Place tests next to the code they test (`component.test.tsx`)
- Use descriptive test names
- Test both happy path and error cases
- Mock external dependencies (WebSocket, WebRTC)

Example test structure:
```typescript
describe('SessionManager', () => {
  describe('createSession', () => {
    it('should create session with valid display name', () => {
      // Test implementation
    })
    
    it('should reject invalid display names', () => {
      // Test implementation
    })
  })
})
```

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues for duplicates
2. Test with latest version
3. Reproduce in multiple browsers if possible
4. Gather relevant information (browser, OS, network setup)

### Bug Report Template
```markdown
**Bug Description**
Clear description of the issue

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Browser: Chrome 120
- OS: Windows 11
- Hub Version: 1.0.0
- Network: WiFi/Ethernet

**Additional Context**
Screenshots, logs, or other relevant information
```

## ✨ Feature Requests

### Feature Request Template
```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed? What problem does it solve?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other approaches you've considered

**Additional Context**
Mockups, examples, or related features
```

### Feature Development Process
1. **Discussion**: Open an issue to discuss the feature
2. **Design**: Create detailed design document if needed
3. **Implementation**: Develop the feature in a branch
4. **Testing**: Add comprehensive tests
5. **Documentation**: Update relevant documentation
6. **Review**: Submit pull request for review

## 🔍 Code Review Process

### Submitting Pull Requests
1. **Create Branch**: From latest `main` branch
2. **Implement Changes**: Follow coding standards
3. **Add Tests**: Ensure good test coverage
4. **Update Docs**: Update documentation if needed
5. **Test Locally**: Verify all tests pass
6. **Submit PR**: With clear description

### PR Template
```markdown
**Description**
Brief description of changes

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

**Checklist**
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### Review Criteria
- **Functionality**: Does it work as intended?
- **Code Quality**: Is it readable and maintainable?
- **Performance**: Does it impact performance negatively?
- **Security**: Are there any security implications?
- **Testing**: Is there adequate test coverage?
- **Documentation**: Is documentation updated?

## 📚 Documentation

### Types of Documentation
1. **Code Comments**: Inline explanations for complex logic
2. **API Documentation**: Function/method signatures and usage
3. **User Guides**: How to use features
4. **Technical Specs**: Architecture and design decisions

### Documentation Standards
- Use clear, concise language
- Include code examples where helpful
- Keep documentation up-to-date with code changes
- Use proper markdown formatting

## 🏷️ Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version number bumped
- [ ] Git tag created
- [ ] Release notes written

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professional communication

### Getting Help
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Code Comments**: For implementation questions

### Recognition
Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributor graphs

## 🎯 Priority Areas

### High Priority
- WebRTC connection reliability
- Mobile browser compatibility
- Performance optimization
- Security enhancements

### Medium Priority
- UI/UX improvements
- Additional file transfer features
- Group communication features
- Admin dashboard enhancements

### Low Priority
- Advanced customization options
- Integration with external services
- Experimental features

## 📞 Contact

- **Maintainer**: [Your Name](mailto:your.email@example.com)
- **Project Issues**: [GitHub Issues](https://github.com/yourusername/hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/hub/discussions)

Thank you for contributing to Hub! 🚀