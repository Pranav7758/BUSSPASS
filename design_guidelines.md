# SwiftPass Design Guidelines

## Design Approach
**System-Based Approach** - Clean, professional management interface inspired by modern productivity tools (Linear, Notion) with emphasis on clarity, efficiency, and data hierarchy. Goal: Professional, non-template appearance with focus on usability over decoration.

## Color System (User-Specified)
- **Background**: #f5f5f5
- **Cards**: #ffffff
- **Borders**: #e0e0e0
- **Text Primary**: #333333
- **Text Secondary**: #666666
- **Primary**: #1976d2 (blue)
- **Success**: #2e7d32 with light bg #e8f5e9
- **Error**: #c62828 with light bg #ffebee
- **Warning**: #f57c00 with light bg #fff3e0

## Typography
**Font Stack**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif

**Hierarchy**:
- Page Titles: 28px, font-weight 600
- Section Headings: 20px, font-weight 600
- Card Titles: 16px, font-weight 500
- Body Text: 14px, font-weight 400
- Small Text/Labels: 12px, font-weight 400
- Line Height: 1.5 for body, 1.2 for headings

## Layout System
**Spacing Scale**: Use Tailwind units of 2, 4, 6, 8 (translating to 8px, 16px, 24px, 32px)
- Card padding: p-6 (24px)
- Section spacing: mb-8 (32px)
- Element spacing: gap-4 (16px)
- Tight spacing: gap-2 (8px)

**Structure**:
- Sidebar: Fixed 240px width, #ffffff background, full height
- Main Content: Remaining width with max-w-7xl container, 24px padding
- Top Header: 64px height with breadcrumbs and user profile
- Border Radius: 4-6px for all cards and buttons

## Component Library

### Navigation Sidebar
- Fixed left sidebar with logo at top (48px height)
- Navigation items with icons (20px) + text
- Active state: #1976d2 background with white text
- Hover state: #f5f5f5 background
- Item height: 40px with 12px padding
- Bottom section for user profile/logout

### Dashboard Cards
- White background (#ffffff)
- 1px solid border (#e0e0e0)
- 6px border radius
- 24px padding
- Drop shadow: 0 1px 3px rgba(0,0,0,0.1)
- Grid layout: 2-3 columns on desktop, single column mobile

### Stat Cards
- Large number display: 32px, font-weight 700, #333333
- Label below: 14px, font-weight 400, #666666
- Icon in top-right corner (24px) with subtle background circle
- Color-coded borders: 3px left border in success/error/primary based on metric type

### Buttons
**Primary**: #1976d2 background, white text, 6px radius, 10px vertical + 20px horizontal padding
**Secondary**: White background, #1976d2 border and text
**Success**: #2e7d32 background, white text
**Danger**: #c62828 background, white text
- Height: 40px (regular), 32px (small)
- Font weight: 500
- Hover: Darken background by 10%

### Floating Action Button (FAB)
- Fixed position: bottom-right (24px from edges)
- 56px diameter circle
- #1976d2 background with white icon (24px)
- Box shadow: 0 4px 12px rgba(25,118,210,0.4)
- Prominent for QR scanner access

### Forms
- Input fields: #ffffff background, 1px #e0e0e0 border, 4px radius, 40px height
- 12px padding
- Focus state: #1976d2 border (2px)
- Labels: 14px, font-weight 500, #333333, 8px bottom margin
- Error state: #c62828 border with error message below in #c62828

### Tables/Lists
- Alternating row backgrounds: #ffffff and #fafafa
- Header row: #f5f5f5 background, 14px font-weight 600
- Row height: 56px
- Cell padding: 16px
- Hover: #f5f5f5 background
- Borders: 1px solid #e0e0e0 between rows

### Student Pass Card
- Centered design, max-width 400px
- Status badge at top: ACTIVE (green) or INSUFFICIENT BALANCE (red)
- Student photo: 120px circle at top
- QR code: 240px square (visible only with sufficient balance)
- Details below: name, enrollment, route info in structured layout
- All text centered alignment

### QR Scanner Modal
- Full-screen overlay with semi-transparent black background (#000000 at 80% opacity)
- White content card in center (max-width 600px)
- Camera viewport: 400px square
- Close button: top-right corner, 32px circle with X icon
- Result screen: Full card with student photo (80px circle), name, status icon (success/error), and balance info

### Map Component
- Full width/height of container
- Info panel overlay: bottom-left, white card with bus details
- 16px padding, semi-transparent background
- Refresh every 5 seconds indicator
- Custom bus marker icon (24px)

### Notification Badge
- Red circle (#c62828) with white count
- 20px diameter on bell icon
- Position: top-right of icon

### Transaction Cards
- Timeline layout with vertical line connecting entries
- Icon on left (circle with transaction type icon)
- Amount on right (green for credit, red for debit)
- Date/time below description
- 16px spacing between entries

## Page-Specific Layouts

### Login/Signup Pages
- Centered card (max-width 400px)
- Logo at top center
- Form fields with 16px spacing
- Primary button full-width
- Link to alternate action below

### Dashboard Pages
- Grid of 2-3 stat cards at top
- Quick action buttons row (4 per row on desktop)
- Recent activity section below (tables/lists)
- All sections with 32px vertical spacing

### Profile Setup Wizard
- Stepper indicator at top (3 steps)
- Single column form (max-width 600px, centered)
- Progress bar showing completion
- Next/Previous buttons at bottom

### Admin Management Pages
- Action buttons (Add New) in top-right of header
- Search and filter bar below
- Data table/grid below
- Pagination at bottom

## Animations
**Minimal Use Only**:
- Button hover: 0.15s ease background color transition
- Modal open/close: 0.2s ease fade + scale
- Sidebar hover: 0.1s ease background transition
- No scroll animations, parallax, or decorative motion

## Images
No hero images or decorative photography. This is a utility application focused on data and functionality. Use icons throughout (Material Icons via CDN) for visual clarity.