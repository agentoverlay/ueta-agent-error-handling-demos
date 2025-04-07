# UETA Agent & Seller Dashboard

This application provides dual interfaces:
1. **Agent Dashboard**: For purchasing agents to browse products, create orders, and manage approvals
2. **Seller Dashboard**: For sellers to manage products, view orders, and configure approval policies

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Running the Application

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

## Development

To make changes to the application:

1. Agent-specific components are in `src/components/`
2. Seller-specific components are in `src/components/seller/`
3. API implementations are in `src/api/`
4. The agent API server is in `src/api/server.ts`
5. The seller API server is in `src/api/seller/seller.ts`

## License

This project is intended for demonstration purposes only.
