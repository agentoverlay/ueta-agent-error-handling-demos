# UETA Agent -- Goods Producer Demo

This repository demonstrates how AI-driven agents can interact with legal frameworks and electronic transactions in the context of a goods producer. Inspired by **Section 10 of the UETA (Uniform Electronic Transactions Act)**, this demo simulates a business API that offers a catalog of products and processes orders, while users interact via a CLI tool that manages a wallet and places orders.

This demo was developed as a collaboration between **Dazza Greenwood** and **Andor Kesselman**, building on concepts from [UETA and LLM Agents: A Deep Dive into Legal Error Handling](https://www.dazzagreenwood.com/p/ueta-and-llm-agents-a-deep-dive-into).  
<TODO: Add additional context and explanation of legal and technical nuances.>

## 📌 Overview

This repository contains demos that illustrate several aspects of AI-assisted legal transactions and goods ordering:

- **Product Catalog and Order Processing**  
  - The business API acts as a goods producer, providing a catalog of products (SKU, description, and price) and processing orders from users.
- **Error Simulation in Order Processing**  
  - An optional error simulation mode (activated with a flag) randomly fails approximately 10% of orders, logging errors accordingly.
- **User Wallet and Order Transactions**  
  - The user CLI maintains a wallet with a starting balance. Orders placed deduct funds from the wallet based on product prices.
- **Autonomous Agent for Order Placement**  
  - An agent mode automatically places random orders at random intervals, simulating continuous purchasing activity.

## Features

* Audit Tracing -- if `auditableLog` is set true, consumer and producer both maintain logs to mitigate liability.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or later)
- [npm](https://www.npmjs.com/)

## Demo

**Work in progress**  
![Demo Screenshot](https://github.com/user-attachments/assets/9e15e422-682c-4942-8566-c19ddcc0087d)

## Installation

1. Clone the repository.
2. Install dependencies by running:

   ```bash
   npm install
   ```

## Running the Application

### 1. Start the Business API

The business API simulates a goods producer by offering a product catalog and processing orders on port **4000**.

- **Normal mode:**

  ```bash
  npm run start:business
  ```

- **Error simulation mode:** (Approximately 10% of orders will trigger a simulated error)

  ```bash
  npm run start:business -- --with-error
  ```

### 2. Use the User CLI

The user CLI lets you create an account with a wallet, list available products, place orders, and run an autonomous agent that places random orders.

#### a. Create an Account

This command creates a new account with a wallet. Each new user starts with a balance of 1000. You can also deduct an initial deposit (default: 100) if desired.

- **Default deposit:**

  ```bash
  npm run start:user create-account
  ```

- **Custom deposit (e.g., 200):**

  ```bash
  npm run start:user create-account -- --deposit 200
  ```

#### b. List Available Products

Display the product catalog from the business API:

```bash
npm run start:user list-products
```

#### c. Place an Order

Submit an order by specifying the product SKU and quantity. The CLI checks your wallet balance before placing the order. For example, to order 2 units of the product with SKU `SKU001`:

```bash
npm run start:user order -- --sku SKU001 --quantity 2
```

#### d. Start Autonomous Agent Mode

Launch the autonomous agent mode, which automatically places random orders at random intervals using your stored account:

```bash
npm run start:user agent
```

### 3. View Order Logs

While there is no dedicated API endpoint for orders, you can view order processing details (including simulated errors) in the terminal where the business API is running. In error simulation mode, faulty orders will be logged using `console.error` along with the latest order status for the account.

## Project Structure

- **business.ts**  
  The business API server simulates a goods producer. It maintains a catalog of products, processes orders (with optional error simulation), and logs order statuses.
- **user.ts**  
  The user CLI tool allows you to create accounts, manage a wallet, list products, place orders, and run an autonomous agent for order placement.
- **package.json**  
  Contains project scripts and dependencies.

## License

This project is provided as-is under the MIT License.
