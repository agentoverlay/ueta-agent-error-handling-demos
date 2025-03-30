# UETA Liability Calculator

A financial calculator for estimating potential liability, revenue, and profit under the Uniform Electronic Transactions Act (UETA).

## Features

- Calculate potential liability based on transaction volume and agent-handled percentage
- Visualize the relationship between transactions, revenue, and liability
- Apply various mitigation strategies to reduce liability
- Export results to CSV or PDF format

## Live Demo

The calculator is available online at: https://madeco.github.io/ueta-agent-demos/ueta-liability-calculator/

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

## License

[MIT](LICENSE)
