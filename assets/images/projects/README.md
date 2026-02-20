# Project Images Guide

Use this folder for all project-related images so scaling to more projects stays clean.

## Structure

- `assets/images/projects/<project-slug>/hero.(webp|png)`
- `assets/images/projects/<project-slug>/logo.webp` (project page/app logo)
- `assets/images/projects/<project-slug>/icon.svg` (project detail header icon, if needed)
- `assets/images/projects/<project-slug>/gallery-1.webp` (optional)
- `assets/images/projects/<project-slug>/gallery-2.webp` (optional)
- `assets/images/projects/<project-slug>/gallery-context.webp` (optional)
- `assets/images/projects/shared/` for reusable placeholders

## Naming Rules

- Use lowercase kebab-case folder names (match project slug where possible).
- Keep one primary hero image per project: `hero.webp` or `hero.png`.
- Use predictable gallery names (`gallery-1`, `gallery-2`, `gallery-context`) for easy maintenance.
- For project pages, avoid linking to root `assets/images/*`; use `assets/images/projects/<project-slug>/*`.

## When Adding a New Project

1. Add image files to `assets/images/projects/<slug>/`.
2. Update card image path in `js/data/projects.js`.
3. Update detail page image paths in `projects/project-details-data.js`.
4. Keep old root-level images only for backward compatibility; new work should use this folder.
