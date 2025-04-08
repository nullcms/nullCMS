# nullCMS

[![Turborepo](https://img.shields.io/badge/Built%20with-Turborepo-blue.svg)](https://turbo.build/)
[![React 19](https://img.shields.io/badge/React-19.0.0-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**nullCMS is an open-source, API-first headless CMS built for ultimate flexibility and control over your content.**

## Key Features

* **Modular Design:** Choose the deployment strategy that fits your needs: serverless, self-hosted, headless, or a hybrid approach.
* **API-First Architecture:** Access your content via clean REST and GraphQL APIs, enabling seamless integration with any frontend technology.
* **Truly Headless:** Decouple content management from presentation, giving you the freedom to build with your preferred tools.
* **Deploy Anywhere:** Adaptable to various hosting environments, offering maximum deployment flexibility.
* **Customizable Backoffice:** Tailor the content management UI to match your team's workflow.
* **Rich Content Creation:** Empower content creators with a powerful and intuitive rich text editor.

## How it Works

nullCMS provides a decoupled content management experience:

* **Intuitive Backoffice (React):** A user-friendly interface for content creators to manage and organize content effectively.
* **Flexible API (Headless Hono):** Exposes content through standard REST and GraphQL endpoints, ready to be consumed by any frontend application.

## Project Structure
```
nullcms/
├── apps/
│   ├── example-backoffice/ # Example backoffice
│   └── example-api/ # Example API
├── packages/
│   ├── api/ # Core API package
│   ├── backoffice/ # Backoffice UI components
│   ├── shared/ # Shared utilities
│   ├── eslint-config/ # ESLint config
│   └── typescript-config/ # TypeScript config
└── package.json # Root config
```


## Core Packages

* `@nullcms/api`: The Headless API that powers nullCMS.
* `@nullcms/backoffice`: Content management UI (React, Radix UI, Tailwind CSS).

## Getting Started

### Installation

```bash
git clone https://github.com/nullcms/nullcms.git
cd nullcms
npm install
```

### Development
```bash
npm run dev # Start all development servers
npm run build # Build all packages
npm run lint # Lint code
npm run format # Format code
```

### Technology
- Frontend: React 19, Vite, @udecode/plate, Radix UI, TanStack Router & Query, Tailwind CSS
- Backend: Hono.js, Zod, GraphQL, Cloudflare Workers
- Dev Tools: TypeScript, Turborepo, ESLint, Prettier


### Why nullCMS?
- Developer-Focused: Designed for flexibility.
- Performance: Optimized for speed.
- Extensible: Customize to your needs.
- Modern: Built with the latest technologies.
- Open Source: Community-driven.

### Contributing
See CONTRIBUTING.md for details.

### License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for the full license text.