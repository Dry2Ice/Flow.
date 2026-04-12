# AI Code Assistant

A web-based code editor powered by Nvidia NIM AI for intelligent code generation and project management.

## Features

- **AI-Powered Code Generation**: Use Nvidia NIM API to generate code from natural language prompts
- **Integrated Code Editor**: Monaco Editor (same as VS Code) for professional coding experience
- **Project Management**: File browser, project structure, and workspace management
- **Development Planning**: Track tasks, progress, and development milestones
- **Change Tracking**: View code differences and modifications
- **Version Control Ready**: Git integration for rollback and history management

## Getting Started

### 1. Configure Nvidia NIM

1. Click the settings gear icon (⚙️) in the top-right corner
2. Enter your Nvidia NIM API credentials:
   - **API Key**: Your Nvidia NIM API key
   - **Base URL**: Usually `https://api.nvidia.com/v1`
   - **Model**: Choose your preferred model (e.g., `meta/llama3-70b-instruct`)

### 2. Start Coding

1. Select a file from the demo project in the left sidebar
2. Use the prompt input at the bottom to describe what you want to build
3. The AI will generate code and suggest development tasks
4. Track your progress in the development plan panel

### 3. Project Management

- **File Browser**: Navigate and open files in your project
- **Development Plan**: Add, track, and complete development tasks
- **Diff Viewer**: Review code changes and modifications
- **Prompt History**: View conversation history with the AI

## Architecture

This application is built with:
- **Next.js 16** with App Router
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Monaco Editor** for code editing
- **Zustand** for state management
- **Nvidia NIM API** for AI code generation

## API Integration

The app integrates with Nvidia NIM through a REST API. Configure your credentials to enable AI-powered code generation.

## Development

```bash
bun install          # Install dependencies
bun run dev         # Start development server
bun run build       # Build for production
bun run typecheck   # Run TypeScript checks
bun run lint        # Run ESLint
```