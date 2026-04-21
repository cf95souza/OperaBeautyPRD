---
name: ui-design-system
description: Use whenever creating or styling web interfaces. Defines the project's visual standard with modern design, professional structural grids, sober harmonious colors, micro-animations, and responsiveness.
---

# UI Design System Guidelines

You MUST strictly follow these guidelines when designing or implementing web interfaces. The goal is to create professional, modern user interfaces based on solid balanced corporate grids.

## 1. Core Technologies
- Use **Tailwind CSS** for all styling. Avoid creating custom CSS unless absolutely necessary.
- Use **Lucide React** for all icons to maintain consistency.

## 2. Aesthetics & Styling
- **Borders**: Apply subtly rounded corners for a more professional and contained look (e.g., `rounded-md` or `rounded-lg` for cards and modals; avoid excessively "round" borders like `rounded-2xl` or `rounded-full` unless for avatars and small badges).
- **Shadows**: Use sharp and subtle shadows that convey natural and professional elevation (e.g., `shadow-sm`, `shadow-md`). **Strictly forbidden:** colored shadows (like bluish or reddish). Shadows must be gray and opaque (neutral Tailwind colors like slate, gray, or zinc with low opacities such as `shadow-black/5` or `shadow-black/10`).
- **Backgrounds**: Use solid, neutral colors with a clean and professional background. Pure whites (`bg-white`) are acceptable for the background and cards. Off-white background colors (like `bg-gray-50` or `bg-slate-50`) are recommended to create visual separation from white cards.
- **Colors**: Define a sober color palette with a maximum of **3 main colors** (Primary, Secondary, Accent). The design focus must be on content readability and structure.

## 3. Layout & Spacing (Structure & Grids)
- **Professional Grids**: Always build the layout with strong concepts in Grid systems (`grid-cols-4`, `grid-cols-12`) to align panel/dashboard components. Information and data should focus on structured "column" organization.
- **Responsiveness**: Always use a **Mobile-First** approach. The grid and data layout should break harmoniously or present horizontal scrolling focused on usability for tables.
- **Spacing**: Use the Tailwind utility system ensuring standardized spacing, paying attention to information density.

## 4. Typography
- **Hierarchy**: Establish a typographic hierarchy focused on clarity for systems or portals:
  - **Title** (`h1`, `text-2xl` or `text-3xl`, `font-semibold` or `font-bold`, dark title colors like `text-slate-800` or `text-gray-900`)
  - **Subtitle** (`h2`/`h3`, `text-lg` or `text-xl`, `text-slate-600` or `text-gray-600`)
  - **Body text/Tables** (`text-sm` or `text-base`, focusing on maximum reading contrast, like `text-slate-700` or `text-gray-700`)

## 5. Interactions & Animations
- **Micro-animations**: Interface interactions should be fast so as not to convey sluggishness in corporate systems.
- **Transitions**: Apply fast transitions (`duration-150` or `duration-200`) and preferably focused only on properties that change (e.g., `transition-colors`, `transition-transform`).
- **Hover Effects**: Use smooth darkening or lightening of the base tone or borders (e.g., `hover:bg-gray-50`, `hover:border-gray-300`). Avoid sudden size changes (`scale`) on mass items except isolated primary buttons.
- **Accessibility**: Provide visible `:focus` states on input fields and clickable elements (e.g., neutral focus rings or involving primary colors, fast, precise).

## 6. Execution & Architecture Rules
- **Color Definition**: Always confirm the 3 main colors with the user before starting any development.
- **Phased Development**: Plan and execute the project in distinct phases.
- **Homologation**: At the conclusion of each phase, stop and ask the user to visually test and approve the work locally.
- **Architecture Assessment**: Evaluate the project's initial architecture upfront to logically structure the phases.
- **Security Protocols**: Adhere to strict security practices; do not bypass data validations or expose sensitive rules.
