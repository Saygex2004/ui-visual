I want you to perform a comprehensive UX/UI redesign of the entire application. The current Radix UI theme feels inconsistent, and many components appear to be positioned without a clear visual hierarchy or UX rationale. Your goal is not to make small adjustments, but to rethink the interface following modern UX/UI best practices while preserving the application’s functionality.

Design Reference

Below you will find a design reference created with Claude Design. It is essential that you analyze it carefully to fully understand the desired visual direction and user experience.

The final UI should closely match the overall style, quality, layout principles, and interaction patterns demonstrated in the reference.

However, pay close attention to the following:

- The provided design is only a visual mockup intended as a design reference.
- It does not represent the complete application.
- Some existing features may be missing from the mockup.
- Some interactions or specifications in the mockup may intentionally differ from the actual implementation.
- When discrepancies exist, preserve the application’s functional requirements while adopting the visual language and UX principles of the reference.

Use the Claude Design MCP to import and analyze the following project:

Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login) to import this project:
https://claude.ai/design/p/9a6a3659-ac8c-4d46-9b8f-06abe620f442?file=PVP+Aste+Dashboard.dc.html

Focus primarily on:

- PVP Aste Dashboard.dc.html

Also review:

- support.js

Implement the interface based on:

- PVP Aste Dashboard.dc.html

Treat this design as the primary UX/UI inspiration while ensuring that the production implementation remains complete, functional, and consistent with the existing application.

1. Overall Design System

- Review the entire UI for visual consistency.
- Establish a clear design hierarchy (spacing, typography, colors, borders, elevation, and component sizing).
- Ensure all buttons, inputs, cards, badges, and interactive elements follow a consistent design language.
- Remove arbitrary sizing or styling differences unless they communicate semantic meaning.

2. Layout Optimization

Several sections consume excessive space or are poorly organized.

In particular:

- Clusters and Regions currently occupy too much screen space. Design a more compact and scalable solution that allows users to select them quickly without sacrificing usability. Consider modern patterns such as searchable comboboxes, popovers, multi-select dropdowns, token selectors, or other space-efficient approaches.
- Reorganize the page layout to maximize the usable area for the main content while keeping filters and controls easily accessible.

3. Main Procedures & Failures

The Main Procedures and Failures sections currently look like ordinary buttons instead of navigation tabs.

Redesign these components so they are immediately recognizable as tabs by:

- following common UI conventions,
- providing clear active/inactive states,
- improving visual hierarchy,
- making navigation more intuitive.

4. Filters

The filters displayed above the table appear misplaced.

Review their placement and organization by:

- grouping related filters,
- improving spacing and alignment,
- making filtering faster and more intuitive,
- following common dashboard UX patterns.

5. Data Table

The table requires several UX improvements.

Specifically:

- Standardize action buttons.
- Improve the visibility and readability of row actions.
- Prevent labels from being truncated (for example, “Go to Listing” is currently cut off).
- Consider more appropriate action layouts (icon + label, overflow menus, contextual actions, etc.) where beneficial.
- Improve column spacing, alignment, and responsiveness.

6. Navigation & Branding

The application currently lacks a proper branding area.

Please:

- Add a temporary placeholder logo (it will be replaced later).
- Make the logo clickable.
- Clicking the logo must always navigate back to “Choose a View”, which should be treated as the application’s homepage.

7. Participants UX

The participant management flow requires a complete UX redesign.

The current experience involves too many clicks and feels outdated.

Follow modern UX patterns to simplify the workflow.

For example:

- Consider using mentions/autocomplete to add chat participants instead of requiring multiple dialogs or excessive navigation.
- Reduce friction throughout the entire participant management process.

8. Global UX Review

Don’t limit yourself to the issues listed above.

Review the entire application and proactively identify additional UX/UI problems, including but not limited to:

- inconsistent spacing,
- poor alignment,
- unclear interaction patterns,
- unnecessary clicks,
- weak information hierarchy,
- accessibility issues,
- responsive behavior,
- discoverability,
- visual consistency,
- interaction feedback,
- empty states,
- loading states,
- error states.

Whenever possible, do not simply fix isolated issues. Instead, redesign the experience holistically so that every screen feels like part of a unified product.

Your objective is to deliver a polished, modern, professional dashboard experience that aligns with current UX/UI trends and best practices.

9. Execution Plan

Update the execution plan by adding any phases you consider necessary to support this redesign.

If the redesign requires updates to the documentation inside the plan folder, update it accordingly.

Any modifications to the execution plan or documentation must strictly preserve the existing structure, conventions, formatting, and overall pattern used throughout the project.

Do not force changes if they are unnecessary, but if you identify improvements that should be documented, include them as part of the redesign process.
