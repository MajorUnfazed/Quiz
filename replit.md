# Overview

This is a full-stack quiz application called "Quizzical" built with React, Express, and TypeScript. The application fetches trivia questions from an external API and provides an interactive quiz experience with multiple-choice questions, answer validation, and scoring.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React with TypeScript**: Modern React application using functional components and hooks
- **State Management**: Local component state with useState for quiz progression and answer tracking
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with custom CSS variables for theming and Google Fonts (Karla, Inter)
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Express.js**: RESTful API server with TypeScript
- **Database Layer**: Drizzle ORM configured for PostgreSQL with schema definitions
- **Storage Interface**: Abstract storage interface with in-memory implementation for development
- **Middleware**: Request logging, JSON parsing, and error handling
- **Development**: Hot module replacement and development-specific middleware

## Data Storage
- **PostgreSQL**: Primary database configured via Drizzle ORM
- **User Schema**: Basic user table with ID, username, and password fields
- **Database Migrations**: Drizzle-kit for schema migrations and database management
- **Connection**: Neon Database serverless PostgreSQL connection

## Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **User Model**: Basic user entity with username/password structure
- **Storage Abstraction**: Pluggable storage interface supporting both memory and database backends

## Quiz Flow Architecture
- **State Machine**: Five distinct quiz states (start, loading, quiz, results, error)
- **Question Management**: Fetches 5 multiple-choice questions per quiz session
- **Answer Shuffling**: Randomizes answer order for each question to prevent pattern recognition
- **Progress Tracking**: Maintains selected answers and provides immediate feedback
- **Error Handling**: Graceful fallback for API failures with retry functionality

# External Dependencies

## Third-Party Services
- **Open Trivia Database API**: External trivia question provider (opentdb.com)
- **Neon Database**: Serverless PostgreSQL hosting platform

## Key Libraries and Frameworks
- **UI Components**: Radix UI primitives for accessible component foundation
- **Styling**: Tailwind CSS for utility-first styling approach
- **Form Handling**: React Hook Form with Zod validation schemas
- **Data Fetching**: TanStack Query for server state management
- **Icons**: Lucide React for consistent iconography
- **Animations**: CSS transitions and Tailwind animation utilities
- **Development**: ESBuild for server bundling, TSX for TypeScript execution

## Development Tools
- **TypeScript**: Full-stack type safety with shared schema definitions
- **Vite Plugins**: Runtime error overlay and development cartographer
- **Code Quality**: ESLint and TypeScript strict mode configuration
- **Database Tools**: Drizzle Kit for migrations and database introspection