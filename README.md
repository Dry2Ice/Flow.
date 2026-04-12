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

### 1. Configure AI Settings

1. Click the settings gear icon (⚙️) in the top-right corner
2. Configure your AI service in two sections:

#### API Configuration
   - **API Key**: Your Nvidia NIM API key
   - **Base URL**: Usually `https://api.nvidia.com/v1`
   - **Model**: Choose your preferred model (e.g., `meta/llama3-70b-instruct`)

#### Generation Parameters
   - **Temperature**: Controls randomness (0 = deterministic, 2 = very random)
   - **Top P**: Nucleus sampling (0.1 = very focused, 1.0 = diverse)
   - **Top K**: Top-K sampling (1-100)
   - **Context Tokens**: Maximum context tokens for project files (0 = unlimited)
   - **Max Response Tokens**: Maximum response length (100-8000)
   - **Presence Penalty**: Penalize new topics (-2 to 2)
   - **Frequency Penalty**: Penalize token repetition (-2 to 2)
   - **Stop Sequences**: Comma-separated sequences where generation should stop

#### AI Behavior Presets
Switch between three specialized modes directly in the prompt input:
- **Bug Detection & Fixing**: Analyzes code for bugs, security issues, and suggests fixes
- **Code Analysis & Planning**: Comprehensive codebase analysis and improvement planning
- **Active Development**: Implements features, makes changes, and enhances functionality

**Customizable Prompts**: Edit system prompts for each preset in settings to tailor AI behavior to your needs.

#### Ultra Mode
**Comprehensive Code Enhancement**: One-click execution of complete development workflow:
- **Step 1**: Code Analysis & Planning - Deep codebase analysis and improvement roadmap
- **Step 2**: Task Implementation - Execute all identified improvements and refactoring
- **Step 3**: Bug Detection & Fixing - Thorough code review and bug elimination
- **Step 4**: Final Verification - Quality assurance and summary of changes

**Progress Tracking**: Visual progress indicator shows current step and completion status.

#### Project Integration
- **Project Directory**: Set the path to your local project for file operations
- **Intelligent Context**: AI analyzes project files with token limits for optimal performance
- **File Integration**: Full codebase awareness for better suggestions

Settings are automatically saved and persist between sessions.

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