# UETA Agent & Seller Dashboard

This application provides dual interfaces:
1. **Agent Dashboard**: For purchasing agents to browse products, create orders, and manage approvals
2. **Seller Dashboard**: For sellers to manage products, view orders, and configure approval policies

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Running the Application

#### Development Mode

The application consists of three main components that need to be running:

1. **Next.js Frontend**:
   ```bash
   npm run dev
   ```
   This will start the UI at http://localhost:3000

2. **Agent API Server**:
   ```bash
   npm run agent-api
   ```
   This will start the agent API server at http://localhost:3001

3. **Seller API Server**:
   ```bash
   npm run seller-api
   ```
   This will start the seller service at http://localhost:4000

#### Production Mode

To build and run the application in production mode:

1. **Build everything**:
   ```bash
   npm run build-all
   ```
   This builds both the Next.js frontend and compiles API TypeScript to JavaScript

2. **Start the services**:
   ```bash
   # Start the Next.js frontend
   npm run start
   
   # Start the agent API server
   npm run agent-api-prod
   
   # Start the seller API server
   npm run seller-api-prod
   ```

### Initial Setup

Before running the application, ensure all required files and directories exist:

```bash
npm run ensure-files
```

### User Interface

The application provides a mode toggle in the top navigation to switch between Agent and Seller interfaces:

#### Agent Mode
- **Dashboard**: View pending orders and approval requests
- **Products**: Browse available products
- **Create Purchase Order**: Place new orders
- **Transaction Logs**: View order history
- **Approval Policies**: Configure when orders need approval
- **Wallet**: Manage account balance

#### Seller Mode
- **Dashboard**: View order statistics and recent orders
- **Orders**: Manage all orders (approve, reject, filter)
- **Seller Policies**: Configure automated order processing rules

## Implementation Details

- Frontend: Next.js with React and Tailwind CSS
- Backend: Express.js API servers 
- Storage: File-based JSON storage for simplicity
- Communication: REST API between frontend and backends
- Build Output: All builds are output to the `dist` directory

## Development

To make changes to the application:

1. Agent-specific components are in `src/components/`
2. Seller-specific components are in `src/components/seller/`
3. API implementations are in `src/api/`
4. The agent API server is in `src/api/server.ts`
5. The seller API server is in `src/api/seller/seller.ts`

## Build Process

The application uses a unified build process that outputs to the `dist` directory:

- Next.js application: `dist/` (configured via `distDir` in next.config.ts)
- API files: `dist/api/` (configured via tsconfig.api.json)

To build everything at once:
```bash
npm run build-all
```

## Docker Deployment

You can deploy the entire application using Docker:

```bash
docker-compose up -d
```

This will build and start the frontend, agent API, and seller API services.

## License

This project is intended for demonstration purposes only.
