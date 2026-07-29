# Database Intelligence Map

The application utilizes a custom local JSON-based file system ORM (`src/backend/storage.js`) to persist data. No SQL or NoSQL daemons are required. Data is stored in the OS-specific Application Data folder (e.g., `%APPDATA%\cheating-daddy-config` on Windows).

## Entity Relationships (JSON Files)

### 1. `config.json`
- **Purpose**: Tracks global app initialization and setup state.
- **Fields**:
  - `configVersion` (Integer): Used for migration checks.
  - `onboarded` (Boolean): Determines if the first-time setup UI should be shown.
  - `layout` (String): UI layout mode.

### 2. `preferences.json`
- **Purpose**: Stores all user customizations, AI profiles, and UI configurations.
- **Fields**:
  - `customPrompt` (String): Global system prompt injected into the AI.
  - `selectedProfile` (String): Active behavior profile (e.g., 'interview').
  - `backgroundTransparency` (Float): Opacity level (0.0 to 1.0) of the main window.
  - `fontSize` (Integer): Base font size in pixels.
  - `aiProfiles` (Array): List of configured accounts/prompts.
  - `dualBrainLoadouts` (Array): Configurations for running multiple AIs (e.g., ChatGPT + Gemini).
  - `hotCorners`, `typerHotCorners`, `interviewCorners` (Objects): Maps screen edge zones (e.g., `top_left`) to actions (e.g., `capture`, `abort_oa`).

### 3. `limits.json`
- **Purpose**: A local rate-limiter that tracks character and token usage across fallback LLM APIs (Gemini Flash, Groq).
- **Fields**:
  - `data` (Array of Objects): Daily usage records.
    - `date` (String): YYYY-MM-DD.
    - `flash` / `flashLite` (Object): Request counts for Gemini models.
    - `groq` (Object): Character limits and usage for specific open-source models (`qwen3-32b`, `gpt-oss-120b`).

### 4. `history/<sessionId>.json`
- **Purpose**: Maintains a permanent record of interactions for a specific session.
- **Fields**:
  - `sessionId` (String): Unique timestamp identifier.
  - `createdAt` / `lastUpdated` (Timestamp): Modification tracking.
  - `profile` (Object): The AI profile active during this session.
  - `conversationHistory` (Array): Log of user queries and AI responses.
  - `screenAnalysisHistory` (Array): Log of OCR/Screenshots captured during the session.

## Data Flow
User changes a setting in `SettingsView.js` -> Triggers IPC or direct global function `window.cheatingDaddy.storage.updatePreference()` -> `storage.js` reads file, parses JSON, merges updates, stringifies, and writes synchronously back to disk via `fs.writeFileSync()`.
