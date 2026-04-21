---
name: dashboard-layout
description: Use whenever building administrative panels and corporate dashboards. Defines the architectural structure and essential visual components (sidebar, cards, tables) maintaining strict alignment with the ui-design-system.
---

# Dashboard Layout Guidelines

You MUST follow these guidelines to create clean, fast, and highly structured corporate dashboard layouts. This skill extends the rules of the `ui-design-system` for assembling complete and data-dense screens.

## 1. General Layout Structure (App Shell)
- **Fixed Flex/Grid Layout**: The application must use a full-screen structure (`h-screen`, `w-full`, `overflow-hidden`).
- **Sidebar (Side Menu)**: 
  - Fixed on the left (or responsive via drawer on mobile).
  - Light or neutral-dark solid background (depending on the primary theme), separated from the main content by a subtle border (`border-r border-gray-200`).
  - Vertical navigation with consistent icons (Lucide React) and clear states for the active route (`bg-gray-100`, `font-medium`, subtle change in text/icon color).
- **Header (Top Bar)**:
  - Fixed at the top, with `border-b border-gray-200`.
  - Generally contains: current page title, global search bar, quick actions (notifications), and user menu (avatar and dropdown).
- **Content Area (Main)**:
  - Off-white background (`bg-gray-50` or `bg-slate-50`) to highlight data cards.
  - Independent scrolling (`overflow-y-auto`).
  - Standardized spacing (`p-6` or `p-8` on larger screens, `p-4` on mobile) with maximum width on ultra-wide screens (`max-w-7xl mx-auto`).

## 2. Metric Cards (KPIs)
- **Grid Structure**: Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` or `gap-6` at the top of the Dashboard.
- **Visual**: White background (`bg-white`), rigid or subtly rounded borders (`rounded-md` or `rounded-lg`), with `border border-gray-200` and no shadow (or very light `shadow-sm`). NEVER use colored shadows.
- **Card Content**:
  - Descriptive title in neutral text (`text-sm font-medium text-gray-500`).
  - Main value highlighted (`text-2xl` or `text-3xl font-bold text-gray-900`).
  - Visual evolution/variation (e.g., up/down arrow icon with controlled semantic colors: green `text-emerald-600` for positive, red `text-rose-600` for negative).

## 3. Charts (Data Visualization)
- **Libraries**: Use robust and customizable libraries like Recharts or Tremor (Tailwind-based) when applicable.
- **Styling**: Data series colors must follow the strict corporate palette (shades of blue, gray, slate, without exceeding extreme visual contrast).
- **Containers**: Wrap charts in white cards (`bg-white border rounded-lg p-6`), always accompanied by a clear header (Title and, if applicable, period filters).

## 4. Data Tables (Data Grids)
- **Container**: White background, with borders (`border rounded-lg overflow-hidden`) to contain the table's internal borders.
- **Header (Thead)**: Slightly contrasting backgrounds (`bg-gray-50`), small uppercase text with wide spacing (`text-xs font-semibold text-gray-500 uppercase tracking-wider`).
- **Rows (Tr)**: Clean dividers (`border-b border-gray-200`). Use `hover:bg-gray-50` for fast interactivity in reading without being aggressive, with fast animations (`duration-150`).
- **Cells (Td)**: Clean styles, readable text (`text-sm text-gray-700`). Align text to the left and numerical/financial values to the right.
- **Actions**: Row actions (edit, delete, view) should be discrete icons aligned to the right or contained within a compact dropdown menu (e.g., _MoreHorizontal_ icon).
- **Pagination**: Always include pagination controls in the table footer with structured and neutral buttons.

## 5. Adherence to UI Design System
- **Strict and Professional**: No "playful" adaptations. The software is corporate.
- **No Flashy Shadows**: Strictly adhere to neutral shadow rules.
- **No Excessively Round Corners**: The maximum recommended is `rounded-lg` for larger components, `rounded-md` as standard.
- **Semantic Consistency**: Treat success, error, and warnings systematically with soft palettes of _emerald_, _rose_, and _amber_.
