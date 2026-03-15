# Arduino IDE Tools - Claude AI Assistant Prompt

## Project Overview
This is a Next.js-based Arduino IDE tools application with Monaco Editor integration. The project provides a web-based development environment for Arduino programming.

## Tech Stack
- **Framework**: Next.js 14.2.0 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Editor**: Monaco Editor
- **Authentication**: NextAuth.js
- **Database**: MongoDB with Mongoose
- **State Management**: Zustand
- **Validation**: Zod
- **Code Formatting**: Prettier

## Project Structure
```
arduino-ide-tools/
├── app/                 # Next.js app router pages
├── components/          # Reusable React components
├── lib/                 # Utility libraries and configurations
├── types/               # TypeScript type definitions
├── scripts/             # Database seeding and utility scripts
├── middleware.ts        # Next.js middleware
├── tailwind.config.ts   # TailwindCSS configuration
├── tsconfig.json        # TypeScript configuration
└── next.config.js       # Next.js configuration
```

## Coding Standards

### General Rules
- Use TypeScript for all new code
- Follow existing naming conventions (camelCase for variables, PascalCase for classes/components)
- Use functional components with React hooks
- Implement proper error handling with try-catch blocks
- Use JSDoc comments for complex functions
- Keep functions focused and under 20 lines when possible

### Code Style
- Use Prettier for formatting (configured in `.prettierrc`)
- 2-space indentation
- Single quotes for strings
- Semi-colons required
- Trailing commas in multi-line structures

### File Organization
- One export per file
- Group related functionality in directories
- Use index files for clean imports
- Keep components in `components/` directory
- Place utilities in `lib/` directory

## Key Dependencies
- `@monaco-editor/react` - Code editor component
- `next-auth` - Authentication handling
- `mongoose` - MongoDB ODM
- `zustand` - State management
- `zod` - Schema validation
- `lucide-react` - Icon library

## Development Workflow
1. Run `npm run dev` to start development server
2. Use `npm run format` to format code with Prettier
3. Use `npm run lint` to check for linting issues
4. Run `npm run build` to create production build
5. Use `npm run db:seed` to seed database with test data

## Authentication & Security
- JWT-based authentication via NextAuth.js
- bcryptjs for password hashing
- Environment variables for sensitive data
- Middleware for route protection

## Database Patterns
- Use Mongoose models for data structures
- Implement proper indexing for performance
- Use transactions for multi-document operations
- Validate data with Zod schemas before database operations

## Component Patterns
- Use functional components with TypeScript interfaces
- Implement proper prop typing
- Use React.memo for performance optimization when needed
- Follow compound component pattern for complex UI

## State Management
- Use Zustand for global state
- Keep component state local when possible
- Implement proper state updates with immer if needed
- Use React Query for server state (if added)

## Editor Integration
- Monaco Editor is configured for Arduino syntax
- Custom language services may be added
- File system operations handled through API routes
- Real-time collaboration features can be added

## API Routes
- Follow RESTful conventions
- Implement proper error responses
- Use middleware for authentication
- Validate input with Zod schemas
- Handle CORS properly

## Testing Strategy
- Unit tests for utilities and pure functions
- Integration tests for API routes
- Component tests for UI interactions
- E2E tests for critical user flows

## Performance Considerations
- Use Next.js Image optimization
- Implement code splitting for large components
- Use React.lazy for route-based code splitting
- Optimize bundle size with dynamic imports

## Deployment
- Environment variables configured for production
- Build optimization enabled
- Proper error tracking setup
- Database connection pooling configured

## Common Tasks
- Adding new components: Create in `components/` directory
- API endpoints: Add to `app/api/` directory
- Database models: Create in `lib/models/` directory
- Utility functions: Add to `lib/utils/` directory
- Types: Define in `types/` directory

## Git Workflow
- Use feature branches for new development
- Commit messages should be descriptive and follow conventional commits
- Create pull requests for code review
- Ensure tests pass before merging

## Notes for Claude AI
- Always check existing code patterns before implementing new features
- Follow the established project structure and naming conventions
- Use TypeScript strictly - avoid `any` types
- Implement proper error handling and loading states
- Consider accessibility in UI components
- Write clean, maintainable code that follows the project's established patterns
