# LobbyStream Video Management System

## Source Layout
This design spec is based on the Stitch active layout imported from project `2383182809909945716`.

The imported main view is a desktop admin dashboard with these major sections:
- Left navigation/sidebar with primary app areas
- Top utility/header bar with account, search, and action controls
- Main content area split into dashboard summary, media library, live queue, and supporting links
- Media cards/list rows with thumbnail, title, metadata, and actions
- Upload and stream management areas
- Role-aware context shown as “Network Operator”

## Design Goals
- Build a modular React + TypeScript + Tailwind UI that matches the Stitch layout structure.
- Keep the app split into reusable shells and child components, not one large page file.
- Prefer dashboard density and admin clarity over decorative consumer-video styling.
- Preserve the layout hierarchy: navigation, main surface, content modules, and action bars.

## Color System
Use token-based colors rather than hardcoded hex values in components.

Suggested project color tokens:
- `color-bg`: main app background
- `color-surface`: cards, panels, and elevated sections
- `color-surface-2`: secondary panels or nested containers
- `color-border`: dividers and panel outlines
- `color-text`: primary text
- `color-text-muted`: supporting metadata
- `color-accent`: primary interactive highlight
- `color-accent-strong`: active controls, selected states
- `color-success`: live/healthy states
- `color-warning`: queued or pending states
- `color-danger`: destructive or error states

## Typography
Use a clean, legible admin hierarchy.

Suggested type roles:
- `display`: dashboard title and major page headings
- `heading`: section titles like Media Library and Live Queue
- `body`: content descriptions and labels
- `caption`: metadata such as dates, file type, and duration
- `mono` optional: IDs, technical status, or stream labels if needed

## Layout Structure
The page should be composed from these modular regions:
- `AppShell`
- `Sidebar`
- `TopBar`
- `DashboardOverview`
- `MediaLibraryPanel`
- `VideoCard`
- `LiveQueuePanel`
- `StreamNowPanel`
- `UploadPanel`
- `AdditionalLinksPanel`
- `AuthGate` or `RoleGate`

## Component Rules
- Every component should have a small, explicit `Readonly` props interface.
- Child data should live in `src/data/mockData.ts`.
- Event logic should live in `src/hooks/`.
- Keep `src/App.tsx` thin; it should only wire routes and layout.
- Prefer reusable primitives like `SectionHeader`, `StatCard`, `ActionButton`, and `StatusPill`.

## Tailwind Usage
- Map Stitch theme values into `tailwind.config.*`.
- Use semantic utility classes aligned to the tokens above.
- Avoid one-off arbitrary hex values unless a token cannot express the design.
- Reuse spacing, rounded corners, and border styles across panels and cards.

## Content Blocks
### Dashboard
- Summary metrics
- Navigation shortcuts
- Recent activity or stream status

### Media Library
- Asset list or grid
- Thumbnail preview
- File type, duration, and size metadata
- Edit/delete actions

### Live Queue
- Current live stream preview
- Upcoming scheduled items
- Reorder or scheduling affordances

### Upload
- Drag-and-drop upload zone
- Progress feedback
- File validation and status messages

## Accessibility
- Ensure keyboard navigation for actions, links, and panels.
- Use visible focus states.
- Keep contrast high for text and status indicators.
- Make responsive behavior explicit for desktop-first admin use.

## Implementation Intent
The React build should mirror the Stitch structure with small, composable files:
- pages for routes
- components for layout and panels
- hooks for behavior
- mock data for static content
- services for API and MSW integration