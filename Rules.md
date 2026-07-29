# Project Rules & Guidelines

## Strict Boundaries
1. **Frontend Framework**: 
   - STRICTLY use **LitElement** for Web Components. 
   - NO React, Vue, or Angular.
2. **Styling**:
   - STRICTLY use **Vanilla CSS** within LitElement's \`css\` tagged template literals. 
   - NO TailwindCSS, Bootstrap, or other CSS frameworks.
3. **State Management & Race Conditions**:
   - Strictly handle race conditions. 
   - Ensure async operations (like IPC calls or DOM manipulation) do not overlap or conflict. Use locks or state flags if necessary.
4. **Modularity**:
   - Keep components small and focused.
   - Use standard ES modules for imports.

## Coding Standards
- Enforce Prettier formatting.
- Clear separation of concerns (Backend vs. Frontend).
- Document complex IPC flows.
