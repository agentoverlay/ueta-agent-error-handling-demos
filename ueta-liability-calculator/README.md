# UETA Liability Calculator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/agentoverlay/ueta-agent-demos/actions/workflows/deploy-calculator.yml/badge.svg)](https://github.com/agentoverlay/ueta-agent-demos/actions/workflows/deploy-calculator.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/agentoverlay/ueta-agent-demos/tree/main/ueta-liability-calculator)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fagentoverlay.github.io%2Fueta-agent-demos%2Fueta-liability-calculator%2F&label=Website)](https://agentoverlay.github.io/ueta-agent-demos/ueta-liability-calculator/)

A financial calculator for estimating potential liability, revenue, and risk metrics under the Uniform Electronic Transactions Act (UETA).

## Features

- Calculate potential liability based on transaction volume and agent-handled percentage
- Visualize the relationship between transactions, liability, and liability as a percentage of revenue
- Apply various mitigation strategies to reduce liability
- Export results to CSV or PDF format

## Live Demo

The calculator is available online at: https://agentoverlay.github.io/ueta-agent-demos/ueta-liability-calculator/

## Screenshots

![UETA Liability Calculator](https://i.ibb.co/placeholder-image.png)

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

### Development Server

```bash
npm run dev
# or
pnpm dev
```

### Build for Production

```bash
npm run build
# or
pnpm build
```

## Deployment

This project is configured to automatically deploy to GitHub Pages when changes are pushed to the main branch using GitHub Actions.

### Manual Deployment

If you need to manually deploy:

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy using GitHub Pages:
   - Go to your repository on GitHub
   - Navigate to Settings > Pages
   - Set the source to GitHub Actions

## Technical Details

- Built with React, TypeScript, and Vite
- Uses Chart.js for data visualization
- Responsive design for desktop and mobile use
- Calculates liability metrics based on industry models

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
