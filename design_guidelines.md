# PowerShell Script Generator - Design Guidelines

## Design Approach
**Selected Approach:** Design System (Developer Tools Focused)
**Primary References:** VS Code, GitHub Desktop, Linear
**Justification:** As a utility-focused developer/IT professional tool with complex forms and code output, the interface prioritizes efficiency, clarity, and professional aesthetics over visual flair.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary (Default):**
- Background: 222 20% 11% (deep charcoal, primary surface)
- Surface Elevated: 222 18% 15% (cards, panels)
- Border: 222 15% 25% (subtle divisions)
- Text Primary: 222 10% 95%
- Text Secondary: 222 8% 70%
- Brand Accent: 217 91% 60% (PowerShell blue)
- Success: 142 76% 36% (validation passed)
- Error: 0 84% 60% (validation failed)
- Warning: 38 92% 50% (script warnings)

**Light Mode Alternative:**
- Background: 0 0% 100%
- Surface: 220 13% 97%
- Brand maintains same blue

### B. Typography
**Font Stack:**
- Interface: 'Inter', system-ui, sans-serif (via Google Fonts)
- Code/Monospace: 'JetBrains Mono', 'Fira Code', monospace (via CDN)

**Hierarchy:**
- Page Title: text-2xl font-semibold
- Section Headers: text-lg font-medium
- Body Text: text-sm
- Code Blocks: text-sm font-mono
- Labels: text-xs font-medium uppercase tracking-wide

### C. Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Consistent padding: p-6 for cards, p-8 for main sections
- Gap between elements: gap-4 standard, gap-6 for major sections
- Margins: mb-8 for section separation

**Grid Structure:**
- Two-panel layout: 40/60 split (sidebar/main content)
- Sidebar: fixed w-96, overflow-y-auto
- Main panel: flex-1 with max-width constraints
- Mobile: stack vertically

### D. Component Library

**Navigation:**
- Top header bar with logo, theme toggle, export actions (h-16)
- Sticky positioning for persistent access
- Breadcrumb navigation showing current script section

**Sidebar - Script Builder:**
- Collapsible tree structure for PowerShell command categories
- Search/filter input at top
- Command cards with icons (Font Awesome PowerShell icons)
- Drag-and-drop visual indicators
- Selected state with brand accent background

**Main Panel - Code Editor:**
- Split view: Form inputs (top), Generated code preview (bottom)
- Monaco Editor or CodeMirror integration for syntax highlighting
- Line numbers, syntax validation indicators
- Real-time error highlighting with inline messages

**Forms:**
- Grouped parameter inputs with clear labels
- Input types: text, select, checkbox, number, multi-select
- Floating labels for text inputs
- Validation states with icon indicators (success/error)
- Helper text in muted color below inputs
- Dark mode inputs: bg-222-15% with light borders

**Buttons:**
- Primary: Brand blue with white text (h-10 px-6)
- Secondary: Outline variant with border
- Danger: Red for delete/reset actions
- Icon buttons: w-10 h-10 for compact actions

**Code Output Panel:**
- Syntax-highlighted PowerShell code
- Copy to clipboard button (top-right)
- Download .ps1 file button
- Line numbers visible
- Dark editor theme (even in light mode for code comfort)

**Validation Panel:**
- Floating card showing real-time validation
- Icon + message for each check
- Expandable details for errors
- Progress indicator during validation

**Modals:**
- Export options (format, destination)
- Confirmation dialogs for destructive actions
- Help documentation overlay

### E. Animations
**Minimal & Purposeful:**
- Tree expand/collapse: 200ms ease
- Validation feedback: subtle pulse on error/success icons
- Panel resize: smooth 150ms transition
- No decorative animations

## Images
**Hero Section:** None - This is a utility application, launch directly into the tool interface
**Icons:** Font Awesome for UI icons, specialized PowerShell command icons where appropriate
**Illustrations:** Consider small illustrative graphics in empty states ("No commands added yet")

## Layout Strategy
**Application Structure:**
- No traditional landing page - direct to application interface
- Single-page application with persistent sidebar
- Responsive breakpoint at 1024px (collapse sidebar to drawer)
- Maximum content width: none (use full viewport for productivity)

**Visual Hierarchy:**
- Left sidebar: Command selection (fixed scroll)
- Center: Active form/parameter inputs
- Right/Bottom: Live code preview
- Floating validation panel (bottom-right corner)

## Accessibility & UX
- High contrast ratios (WCAG AAA where possible)
- Keyboard shortcuts for common actions (Ctrl+S to export, Ctrl+/ for search)
- Focus indicators on all interactive elements
- Screen reader labels for icon-only buttons
- Consistent tab order through complex forms
- Error messages announce via aria-live regions