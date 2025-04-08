# UETA Agent -- Goods Producer Demo

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy UETA Liability Calculator to GitHub Pages](https://github.com/agentoverlay/ueta-agent-error-handling-demos/actions/workflows/deploy-calculator.yml/badge.svg)](https://github.com/agentoverlay/ueta-agent-error-handling-demos/actions/workflows/deploy-calculator.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/agentoverlay/ueta-agent-demos/)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fagentoverlay.github.io%2Fueta-agent-demos%2Fueta-liability-calculator%2F&label=Demo)](https://agentoverlay.github.io/ueta-agent-demos/ueta-liability-calculator/)

This repository showcases how AI-driven agents can integrate with legal frameworks and electronic transactions in the context of a modern goods producer. Inspired by Section 10 of the UETA (Uniform Electronic Transactions Act), the demo features a business API that offers a product catalog and processes orders, while both an autonomous agent (with a dashboard) and a human operator (with a separate dashboard) can interact with transactions. The system emphasizes robust error handling, auditability, and progressive confirmation of transactions—occasionally requiring manual approval (with a 1/10 probability for agent orders) before orders are finalized.

Developed in collaboration between Dazza Greenwood and Andor Kesselman, this project builds on the insights presented in [UETA and LLM Agents: A Deep Dive into Legal Error Handling](https://www.dazzagreenwood.com/p/ueta-and-llm-agents-a-deep-dive-into). In that article, the author explores the challenges and opportunities in merging AI-assisted legal processes with electronic transactions, including transparency, accountability, and the need for clear error correction workflows. This demo reflects those principles, integrating technical and legal nuances to simulate a secure and auditable digital commerce system.

## 📌 Overview

This repository contains demos that illustrate several aspects of AI-assisted legal transactions and goods ordering:

- **Product Catalog and Order Processing**  
  - The business API acts as a goods producer, providing a catalog of products (SKU, description, and price) and processing orders from users and agents.
- **Error Simulation and Approval**  
  - An optional error simulation mode (activated with a flag) randomly fails approximately 10% of orders. Additionally, agent orders have a 1/10 chance of requiring manual approval before being finalized.
- **User Wallet and Order Transactions**  
  - Users (or agents) maintain a digital wallet. Orders deduct funds from the wallet based on product prices.
- **Autonomous Agent with Dashboard**  
  - An agent mode automatically places random orders and also provides a dashboard to view pending (i.e. pre-approved) transactions.
- **Human Intervention Dashboard**  
  - A separate human service provides a dashboard where flagged orders are listed, allowing a human operator to approve pending transactions or revert error orders.

## 🛠 Main Demo Tools

This repository contains several demo applications:

### 1. Core Demo (`demo/`)

A comprehensive application demonstrating the integration of AI agents with the UETA legal framework. It includes:

- **Agent Dashboard**: A modern Next.js application for browsing products, creating orders, and managing approvals
- **Seller Dashboard**: Manage products, view orders, and configure approval policies
- **API Servers**: Express.js backend servers for both agent and seller interfaces
- **Policy-based Approval System**: Configure specific conditions that trigger the need for human approval

### 2. UETA Liability Calculator (`calculator/`)

A specialized tool for calculating potential liability when using AI agents in electronic transactions. This calculator helps organizations understand and quantify the risks associated with agent automation under UETA guidelines.

- Deployed live at [UETA Liability Calculator](https://agentoverlay.github.io/ueta-agent-demos/ueta-liability-calculator/)
- Evaluates different scenarios and risk factors
- Provides actionable recommendations based on UETA compliance requirements

### 3. Stripe Payment Integration Demo (`stripe-openai/`)

A demonstration of using the OpenAI Agents SDK with Stripe Agent Toolkit integration, featuring:

- Streamlit UI with a chat interface
- QR code generation for payment links
- Integration with Stripe's payment processing API
- Both standalone and MCP (Model Context Protocol) server implementations

## 🚀 Getting Started with Docker

The easiest way to run the demos is using Docker. Each demo can be run independently, or you can run the full system with a single command.

### Running the Full Demo System

```bash
# Clone the repository
git clone https://github.com/madeco/ueta-agent-demos.git
cd ueta-agent-demos

# Ensure required files exist
chmod +x ensure-files.sh
./ensure-files.sh

# Start all services
docker-compose up -d
```

This will start:
- The seller service on port 4000
- The agent API service on port 3001
- The demo frontend on port 3000
- Prometheus for monitoring on port 9090
- Grafana dashboards on port 3100 (login with admin/admin)

### Running Individual Demo Components

#### 1. Core Demo Only

```bash
cd demo

# Start using Docker Compose
docker-compose up -d
```

#### 2. Stripe OpenAI Demo

```bash
cd stripe-openai

# Set required environment variables
export STRIPE_SECRET_KEY=your_secret_key_here
export OPENAI_API_KEY=your_openai_key_here

# Build and run the Docker container
docker build -t stripe-openai-demo .
docker run -p 8501:8501 -e STRIPE_SECRET_KEY -e OPENAI_API_KEY stripe-openai-demo
```

## 📊 Demo Interfaces

After starting the services, you can access:

### 1. Core Demo Interfaces:
- **Agent Dashboard**: http://localhost:3000
- **Seller API**: http://localhost:4000
- **Agent API**: http://localhost:3001

### 2. Monitoring Tools:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3100 (login with admin/admin)

### 3. Stripe OpenAI Demo:
- **Streamlit UI**: http://localhost:8501 (when running the Stripe demo)

## 🛠 Running Without Docker

If you prefer to run the services without Docker, you can do so following these steps:

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- [pnpm](https://pnpm.io/)
- [Python](https://www.python.org/) 3.10+ (for Stripe OpenAI demo)

### 1. Core Demo

```bash
cd demo

# Install dependencies
pnpm install

# Start Next.js Frontend (in one terminal)
pnpm run dev

# Start Agent API Server (in another terminal)
pnpm run agent-api

# Start Seller API Server (in a third terminal)
pnpm run seller-api
```

### 2. Stripe OpenAI Demo

```bash
cd stripe-openai

# Install dependencies
pip install -r requirements.txt

# For MCP server (Node.js)
npm install @stripe/agent-toolkit @modelcontextprotocol/sdk

# Start the Streamlit app
streamlit run main.py

# Or run as an MCP server
node mcp_server.js
```

## Features

* **Audit Tracing** — If `auditableLog` is set to true, both the producer and consumer maintain logs to mitigate liability.
* **Progressive Confirmation** — When enabled (via config or random chance for agent orders), transactions are held pending approval.
* **Flag Policies** — Define specific conditions that trigger the need for human approval, such as high-value orders or bulk purchases.
* **Dashboards for Agents and Humans** — Agents can view their pending orders via a dedicated dashboard, while human operators can review and act on flagged transactions.

## Project Structure

- **demo/**  
  The main demo application with agent and seller interfaces.
  - **src/api/server.ts**: The API server handling account management, orders, and integration with the seller.
  - **src/api/seller/seller.ts**: The seller API implementation.
  - **src/components/**: UI components for the dashboard, order form, product list, etc.

- **calculator/**  
  The UETA liability calculator tool.

- **stripe-openai/**  
  The Stripe payment integration with OpenAI agents demo.

- **docker-compose.yml**  
  The main Docker Compose configuration for running all services together.

- **prometheus/** & **grafana/**  
  Configuration for monitoring and visualization tools.

## License

This project is provided as-is under the MIT License.