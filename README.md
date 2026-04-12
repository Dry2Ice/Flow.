# AI Code Assistant

A web-based code editor powered by Nvidia NIM AI for intelligent code generation and project management.

## Features

- **AI-Powered Code Generation**: Use Nvidia NIM API to generate code from natural language prompts
- **Integrated Code Editor**: Monaco Editor (same as VS Code) for professional coding experience
- **Project Management**: File browser, project structure, and workspace management
- **Development Planning**: Track tasks, progress, and development milestones
- **Change Tracking**: View code differences and modifications
- **Version Control Ready**: Git integration for rollback and history management

## Workspace Layout

The application launches with a fully functional four-zone workspace, ready for immediate use:

- **Zone 1 (Left - 25%)**: Files & Projects - File browser with demo project and tabs for project management
- **Zone 2 (Center Left - 45%)**: Code Editor - Monaco Editor showing demo HTML file with syntax highlighting
- **Zone 3 (Center Right - 25%)**: Code Preview - Live HTML preview with real-time updates
- **Zone 4 (Right - 30%)**: Plans & Chat - Demo development plan (top) and AI chat interface (bottom)
- **Bottom Bar**: AI Prompt Input - Always accessible prompt interface with preset selection

**Immediate Functionality**: All zones display useful content immediately upon launch, including:
- Demo project with sample HTML/CSS/JS files
- Pre-opened HTML file in the editor
- Live HTML preview
- Sample development plan with tasks
- Welcome message in AI chat

**Resizable Panels**: Drag the borders between zones to customize the layout to your preference. Panel sizes are automatically saved.

**Reset Layout**: Use the settings gear icon → "Reset Workspace Layout" to restore default panel sizes.

## Advanced Features

### Interactive Planning System
- **Hierarchical Tasks**: Create plans containing tasks with checklist items
- **Multi-Status Tracking**: Pending, In Progress, Partially Completed, Completed, Cancelled
- **AI-Powered Execution**: Check and execute tasks using specialized AI presets
- **Auto-Execution**: Set plans/tasks to run automatically with appropriate presets

### Comprehensive Logging & Bug Tracking
- **Real-time Logs**: Track all AI operations, file operations, and system events
- **Bug Reports**: Automatically generated or user-created issue tracking
- **Severity Levels**: Critical, High, Medium, Low priority classification
- **Resolution Tracking**: Document bug fixes and verification steps

### AI Interaction Modes
- **Chat Mode**: Standard conversational AI interaction
- **Logs Mode**: View detailed operation logs and system events
- **Bug Reporting**: Create and manage bug reports with AI assistance
- **Task Execution**: AI-powered task checking and implementation

## Getting Started

### 1. Set Up Your Project

**Option A: Create New Project**
1. Click the "Projects" tab in the left sidebar
2. Click "New" button
3. Enter project name and directory path
4. The system will create a basic Next.js project structure

**Option B: Load Existing Project**
1. Click the "Projects" tab in the left sidebar
2. Enter the path to your existing project directory
3. Click "Load Project" to import it

**Switch Between Projects**
- Use the "Projects" tab to see all your projects
- Click on any project to switch to it
- The "Files" tab shows the current project's file structure

### 2. Configure AI Settings

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

**General System Prompt**: Core development principles and guidelines that are always applied to all AI interactions, ensuring consistent quality standards across all operations.

**Enhanced Code Interaction:**
- **Precise Line Referencing**: AI references specific lines using `file_path:line_number` format (e.g., `src/app/page.tsx:42`)
- **Structured Code Analysis**: Files presented with line numbers, language detection, and structural analysis
- **Comprehensive Context**: Full project codebase awareness with intelligent file prioritization
- **Rich Metadata**: File size, modification dates, import/export analysis for better understanding
- **Professional Editor**: Monaco Editor with advanced features (folding, bracket matching, IntelliSense, etc.)

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