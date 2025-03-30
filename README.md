# UETA Agent -- Goods Producer Demo

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/agentoverlay/ueta-agent-demos/actions/workflows/deploy-calculator.yml/badge.svg)](https://github.com/agentoverlay/ueta-agent-demos/actions)
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

## 📊 Demo Applications

| Demo | Description | Link |
|------|-------------|------|
| **UETA Liability Calculator** | [![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/agentoverlay/ueta-agent-demos/deploy-calculator.yml?label=build)](https://github.com/agentoverlay/ueta-agent-demos/actions/workflows/deploy-calculator.yml) | [Live Demo](https://agentoverlay.github.io/ueta-agent-demos/ueta-liability-calculator/) |
| **Agent Dashboard** | Coming Soon | - |
| **Human Intervention Dashboard** | Coming Soon | - |

## Features

* **Audit Tracing** — If `auditableLog` is set to true, both the producer and consumer maintain logs to mitigate liability.
* **Progressive Confirmation** — When enabled (via config or random chance for agent orders), transactions are held pending approval.
* **Dashboards for Agents and Humans** — Agents can view their pending orders via a dedicated dashboard, while human operators can review and act on flagged transactions.

### Roadmap

* Enhanced Progressive Confirmation
* Improved Detection Mechanisms
* Error Correction Workflows
* System State Tracking
* Support for Two- and Three-Party Agreements

## 🚀 Getting Started

### Prerequisites

 [Node.js](https://nodejs.org/) (version 14 or later)
- [pnpm](https://pnpm.io/)

## Demo

**Work in progress**  
![Demo Screenshot](https://github.com/user-attachments/assets/9e15e422-682c-4942-8566-c19ddcc0087d)

## Installation

1. Clone the repository.
2. Install dependencies by running:

   ```bash
   pnpm install
   ```

## Running the Application

### 1. Start the Business API

The business API simulates a goods producer by offering a product catalog and processing orders on port **4000**.

- **Normal mode:**

  ```bash
  pnpm run start:seller
  ```

- **Error simulation mode:** (Approximately 10% of orders will trigger a simulated error or require approval)

  ```bash
  pnpm run start:seller -- --with-error
  ```

### 2. Use the Agent CLI & Dashboard

The agent CLI lets you create an account with a wallet, list available products, place orders (with a 1/10 probability that approval is required), and run autonomous agent mode. A dashboard is also available to view pending orders for your account.

#### a. Create an Account

This command creates a new account with a wallet. Each new agent starts with a balance of 1000. You can also deduct an initial deposit (default: 100) if desired.

- **Default deposit:**

  ```bash
  pnpm run start:agent create-account
  ```

- **Custom deposit (e.g., 200):**

  ```bash
  pnpm run start:agent create-account -- --deposit 200
  ```

#### b. List Available Products

Display the product catalog from the business API:

```bash
pnpm run start:agent list-products
```

#### c. Place an Order

Submit an order by specifying the product SKU and quantity. Use the `--agent` flag to indicate the order is placed by the agent. For example, to order 2 units of the product with SKU `SKU001`:

```bash
pnpm run start:agent order -- --sku SKU001 --quantity 2 --agent
```

#### d. Start Autonomous Agent Mode

Launch autonomous agent mode, which automatically places random orders at random intervals:

```bash
pnpm run start:agent agent
```

#### e. Launch the Agent Dashboard

View pending (pre-approved) orders for your account via a dashboard. By default, the dashboard runs on port **6001**:

```bash
pnpm run start:agent dashboard
```

<img width="1785" alt="image" src="https://github.com/user-attachments/assets/f2b7b947-5dec-48d3-83b8-e94a208ac317" />

### 3. Use the Human Intervention Dashboard

The human service provides a dashboard (accessible via a web browser) where flagged orders are listed. Here, a human operator can:
- **Approve** pending transactions (moving them from `pending_confirmation` to `delivered`).
- **Revert** orders that encountered errors.

The human service listens on a configurable port (default **5002**). To change it, set the environment variable `HUMAN_PORT`.

To start the human service:

```bash
pnpm run start:human
```

Then, access the dashboard at:  
```
http://localhost:5002/dashboard
```

<img width="1785" alt="image" src="https://github.com/user-attachments/assets/80196682-4ab5-42f0-a1f9-49c00eedebd0" />


### 4. Viewing Order Logs

Logs for both the business and agent sides are maintained (if enabled via `auditableLog`) to support audit tracing and error correction.

## Project Structure

- **business.ts**  
  The business API server simulates a goods producer. It maintains a product catalog, processes orders (with optional error simulation and approval requirements), and logs transaction statuses.
- **agent.ts**  
  The agent CLI tool allows account creation, wallet management, product listing, order placement, autonomous order placement, and includes a dashboard for viewing pending orders.
- **human.ts**  
  The human service provides a dashboard for reviewing flagged orders and supports approving or reverting transactions.
- **config.ts**  
  Contains configuration settings that control logging, progressive confirmation, and monitoring.
- **package.json**  
  Contains project scripts and dependencies.

## License

This project is provided as-is under the MIT License.
