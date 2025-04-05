# UETA Agent NextJS Dashboard

This is a modern web dashboard for the UETA Agent system, built with NextJS. It provides a user-friendly interface for managing agent activities, creating purchase orders, reviewing transactions, and viewing audit logs.

## Features

- **Product List**: View all available products from the seller service
- **Create Purchase Order**: Create new purchase orders and manage your account
- **Review Dashboard**: Monitor pending orders, approve transactions, and start/stop the autonomous agent
- **Transaction Logs**: View detailed audit logs of all agent activities
- **Approval Policies**: Create and manage approval policies for orders

## Architecture

The application consists of two main parts:

1. **NextJS Frontend**: A modern React-based web UI with four main components
2. **Backend API Server**: An Express-based API that integrates with the existing UETA Agent system and provides MCP support

## Prerequisites

- Node.js (v18+)
- npm or pnpm
- Docker and Docker Compose (for containerized deployment)
- Running UETA Agent services (seller and consumer)

## Getting Started

### 1. Local Development

#### Install Dependencies

```bash
cd new/agent
pnpm install
```

#### Start the API Server

```bash
pnpm run agent-api
```

This will start the API server on port 3001, which integrates with the UETA Agent system and provides both REST API endpoints and MCP support.

#### Start the NextJS Development Server

```bash
pnpm run dev
```

This will start the NextJS development server on port 3000.

### 2. Docker Deployment

The application can be run using Docker Compose, which will set up the API server, frontend, and mock services for testing.

```bash
docker-compose up -d
```

This will start:
- API Server on port 3001
- Frontend on port 3000
- Mock Seller Service on port 4000
- Mock Consumer Service on port 5002

## Configuration

The application uses environment variables for configuration. You can set these in the `.env.local` file for local development or through Docker Compose environment settings for deployment.

### Key Environment Variables

- `NEXT_PUBLIC_API_URL`: URL where the API server is running (default: http://localhost:3001)
- `NEXT_PUBLIC_FRONTEND_URL`: URL where the frontend is running (default: http://localhost:3000)
- `API_PORT`: Port for the API server (default: 3001)
- `SELLER_URL`: URL for the seller service (default: http://localhost:4000)
- `CONSUMER_URL`: URL for the consumer service (default: http://localhost:5002)

## API Endpoints

The agent API server provides the following endpoints:

- **GET /api/health**: Health check endpoint
- **GET /api/account**: Get account information
- **POST /api/account**: Create a new account
- **GET /api/products**: Get available products
- **GET /api/orders/pending**: Get pending orders
- **GET /api/logs**: Get transaction logs
- **POST /api/order**: Place a new order
- **POST /api/order/approve**: Approve a pending order
- **POST /api/agent/start**: Start the autonomous agent
- **POST /api/agent/stop**: Stop the autonomous agent
- **GET /api/agent/status**: Get current agent status
- **GET /api/stats**: Get overall transaction statistics

## MCP Integration

The agent API server also supports the Model Context Protocol (MCP), allowing for integration with AI assistants. It provides the following resources and tools:

### Resources
- `account://info`: Get account information
- `products://list`: Get available products
- `pending://orders`: Get pending orders
- `agent://status`: Get agent status

### Tools
- `create-account`: Create a new account
- `place-order`: Place a new order
- `approve-order`: Approve a pending order
- `start-autonomous-agent`: Start the autonomous agent
- `stop-autonomous-agent`: Stop the autonomous agent

## Development

### Adding New Features

To add new features to the dashboard:

1. Create a new component in the `src/components` directory
2. Import and integrate the component in the main page (`src/app/page.tsx`)
3. Add any necessary API endpoints to the API server (`api/server.ts`)

### Approval Policies

The application includes a flag policy system that allows you to define rules for when orders require human approval. These policies can be based on various conditions:

- **Order Total**: Require approval for orders over a certain amount
- **Order Quantity**: Require approval for bulk orders
- **Product SKU**: Require approval for specific products
- **Wallet Balance**: Require approval when balance would fall below a threshold
- **Time of Day**: Require approval for orders placed during certain hours

Each policy can be enabled or disabled individually. When an order matches any enabled policy, it will be flagged for human approval in the dashboard.

## Building for Production

```bash
pnpm run build
```

This will create an optimized production build of the NextJS application.

## Troubleshooting

### Account Creation
You must create an account before being able to use the dashboard. When you first access the application, you'll be presented with a login screen where you can create an account.

### API Connection Issues
If you see errors connecting to the API:
1. Verify that the API server is running (`pnpm run agent-api`)
2. Check that the `NEXT_PUBLIC_API_URL` environment variable is set correctly
3. Ensure there are no network issues between the frontend and API server

### Docker Deployment
If you encounter issues with Docker deployment:
1. Ensure Docker and Docker Compose are installed and running
2. Check container logs: `docker-compose logs -f api` or `docker-compose logs -f frontend`
3. Verify that the environment variables in docker-compose.yml match your network configuration

## License

This project is provided as-is under the MIT License.