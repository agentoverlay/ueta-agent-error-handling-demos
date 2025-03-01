# UETA Agent -- Section 10 Error Handling Demos

These demonstrations illustrate key concepts from **Section 10 of the UETA (Uniform Electronic Transactions Act)** and explore how AI-driven agents can interact with legal frameworks in a responsible and transparent manner.  

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

### Installation  
Clone the repository:  
```bash
git clone https://github.com/yourusername/ueta-agent-demos.git
cd ueta-agent-demos


### No Error Flow

1 Terminal

```sh
pnpm start:business 
```

2. Second Terminal
```sh
pnpm start:user create-account
> ts-node user.ts "create-account"

Account created: { id: '6a819a48-a5fe-4c22-878f-0ab578bf9837' }
(base) andor@magic-pro-3 ueta-agent-demos %
```

```
(base) andor@magic-pro-3 ueta-agent-demos % pnpm start:user transaction --type add_money --amount 100
> ledger-app@1.0.0 start:user /Users/andor/workspace/github.com/madeco/ueta-agent-demos
> ts-node user.ts "transaction" "--type" "add_money" "--amount" "100"
Transaction created: {
  id: 'cd50f938-73e8-43d8-95fd-a7eafefb7fb9',
  amount: 100,
  date: '2025-03-01T07:58:31.534Z',
  accountId: '6a819a48-a5fe-4c22-878f-0ab578bf9837'
}
```

### Error Flow

#### Business Terminal With Errors

```sh
pnpm start:business --with-errors
```

#### User Terminal With Autonomous Transactions

```sh
pnpm start:user --agent
```
