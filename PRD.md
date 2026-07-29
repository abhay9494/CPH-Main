# Product Requirements Document (PRD)

## Project Name
CPH-Main (Intel Audio Service - Stealth Overlay)

## Target Audience
Users requiring a stealthy, undetectable AI assistant overlay during proctored environments or live sessions.

## Core Features
1. **Stealth Overlay**: Operates transparently, appearing as a standard system process (e.g., Intel Audio Service) to avoid detection by monitoring software.
2. **Auto-Typer**: Simulates natural human typing for injecting AI-generated responses directly into target applications.
3. **Chat History**: Maintains a covert record of past interactions and queries within the session.
4. **DOM Sniper**: Advanced element selection and interaction mechanism to extract information or manipulate the DOM of target applications undetected.

## Technical Requirements
- **Framework**: Electron (Backend), LitElement (Frontend).
- **Process Hiding**: Must disguise window titles, process names, and system tray icons.
- **Performance**: Ultra-low resource footprint to avoid suspicion.
