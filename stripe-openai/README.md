# Stripe Agent with Streamlit UI

This application demonstrates using the OpenAI Agents SDK with Stripe Agent Toolkit integration. It features:

1. Streamlit UI with chat interface
2. QR code generation for payment links
3. Separate MCP (Model Context Protocol) server implementation

## Setup

1. Install dependencies:
```bash
# For Python components
pip install -r requirements.txt

# For improved Streamlit performance
xcode-select --install  # macOS only, for watchdog

# For MCP server (Node.js)
npm install @stripe/agent-toolkit @modelcontextprotocol/sdk
```

2. Set your Stripe secret key as an environment variable:
```bash
export STRIPE_SECRET_KEY=your_secret_key_here
```

3. Set your OpenAI API key as an environment variable:
```bash
export OPENAI_API_KEY=your_openai_key_here
```

## Running the Application

### As a Streamlit App (Chat Interface)

```bash
streamlit run main.py
```

This will start a web server and open the chat interface in your browser.

### As an MCP Server

```bash
node mcp_server.js
```

This will run the separate MCP server implementation using stdio for transport.

## Features

1. **Chat Interface**: Interact with the Stripe Agent through a user-friendly chat interface.
2. **QR Codes for Payment Links**: When the agent creates a payment link, it's automatically converted to a QR code for easy scanning.
3. **MCP Integration**: Use the application as an MCP server for integration with other systems.

## Example Usage

Try asking the agent to:
- "Create a payment link for a product called 'Premium Subscription' with a price of $19.99"
- "Create a new product called 'Annual Membership'"
- "Help me set up a recurring payment option"
