# UETA Agent -- Section 10 Error Handling Demos

These demonstrations illustrate key concepts from **Section 10 of the UETA (Uniform Electronic Transactions Act)** and explore how AI-driven agents can interact with legal frameworks in a responsible and transparent manner.  

This was a collaboration between **Dazza Greenwood** and **Andor Kesselman**, relying on **[UETA and LLM Agents: A Deep Dive into Legal Error Handling](https://www.dazzagreenwood.com/p/ueta-and-llm-agents-a-deep-dive-into)** as reference material. To learn more, please go to this amazing blog post where Dazza explains the nuances and details of how Legal Error Handling of Agents is critical. 

## 📌 Overview  

This repository contains small, focused demos that showcase different aspects of AI-assisted legal transactions, including:  

- **Human-in-the-Loop for LLM-Driven Transactions**  
  - A demo ensuring human oversight before executing an AI-generated agreement.  
- **Transparent, Actionable Prompts in AI-Assisted Transactions**  
  - A chatbot that generates contracts with clear, editable explanations.  
- **Audit Trails for AI-Generated Agreements**  
  - A system logging every AI-generated transaction with metadata for accountability.  
- **Error-Correction Workflow for AI-Generated Contracts**  
  - A mechanism to flag, dispute, and correct AI-generated contract terms.  
- **Legal Interpretation of "Prompt Action" in UETA**  
  - A tool to analyze different response times and classify whether they meet legal standards.  
- **Dispute Resolution Lifecycle Tracker**  
  - A system visualizing the lifecycle of legal disputes and their resolution timeframes.  
- **High-Volume Error Correction UX**  
  - A dashboard simulating thousands of AI-generated transactions and their error resolution process.  

## 🚀 Getting Started  

### Prerequisites  
- [Node.js](https://nodejs.org/) (for frontend demos)  

## Features

- **Business API**
  - Maintains a ledger with a per-account balance.
  - Supports a `--with-error` flag that simulates errors in roughly 10% of transactions.
  - Logs every transaction along with the latest balance. Faulty transactions are logged as errors.
  
- **User CLI**
  - Creates an account with a wallet (starting balance: 1000) and deducts an initial deposit (default: 100) from the wallet.
  - Supports transactions:
    - `add_money` (deducts funds from the user's wallet)
    - `withdraw_money` (adds funds back to the wallet)
  - Includes an `agent` mode which autonomously sends random transactions at random intervals.

## Features

- **Business API**
  - Maintains a ledger with a per-account balance.
  - Supports a `--with-error` flag that simulates errors in roughly 10% of transactions.
  - Logs every transaction along with the latest balance. Faulty transactions are logged as errors.
  
- **User CLI**
  - Creates an account with a wallet (starting balance: 1000) and deducts an initial deposit (default: 100) from the wallet.
  - Supports transactions:
    - `add_money` (deducts funds from the user's wallet)
    - `withdraw_money` (adds funds back to the wallet)
  - Includes an `agent` mode which autonomously sends random transactions at random intervals.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or later)
- [npm](https://www.npmjs.com/)

## Installation

1. Clone the repository.
2. Install dependencies by running:

   ```bash
   npm install
   ```

## Running the Application

### 1. Start the Business API

The business API runs on port **4000**.

- **Normal mode:**

  ```bash
  npm run start:business
  ```

- **Error simulation mode:** (Approximately 10% of transactions will be recorded with an error)

  ```bash
  npm run start:business -- --with-error
  ```

### 2. Use the User CLI

The user CLI provides several commands to interact with the ledger.

#### a. Create an Account

This command creates a new account, subtracts an initial deposit (default is 100) from the wallet, and sends a deposit transaction to the business API.

- **Default deposit:**

  ```bash
  npm run start:user create-account
  ```

- **Custom deposit (e.g., 200):**

  ```bash
  npm run start:user create-account -- --deposit 200
  ```

#### b. Send a Transaction

Submit a transaction to either add money or withdraw money. If you do not supply an `--accountId`, the CLI uses the stored account from the `create-account` command.

- **Add money transaction:**

  ```bash
  npm run start:user transaction -- --type add_money --amount 50
  ```

- **Withdraw money transaction:**

  ```bash
  npm run start:user transaction -- --type withdraw_money --amount 30
  ```

#### c. Start Autonomous Agent Mode

Launch an autonomous agent that sends random transactions at random intervals using the stored account:

```bash
npm run start:user agent
```

### 3. View the Ledger

You can inspect the ledger by making a GET request to the business API:

```
http://localhost:4000/ledger
```

This endpoint returns the complete ledger with all transactions and the latest balances per account.

## Project Structure

- **business.ts** - Business API server that handles ledger transactions and logs activity.
- **user.ts** - User CLI tool for creating accounts, managing a wallet, and sending transactions (or running as an agent).
- **package.json** - Contains project scripts and dependencies.

## License

This project is provided as-is under the MIT License.
