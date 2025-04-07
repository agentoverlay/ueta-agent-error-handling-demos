import { StripeAgentToolkit } from "@stripe/agent-toolkit/modelcontextprotocol";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create the MCP server with Stripe toolkit configuration
const server = new StripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY,
  configuration: {
    actions: {
      paymentLinks: {
        create: true,
      },
      products: {
        create: true,
      },
      prices: {
        create: true,
      },
    },
    systemPrompt: `Integrate with Stripe effectively to support business needs.

When creating payment links, follow these steps in order:
1. First create a product with the requested details
2. Then create a price for that product using the product ID returned from step 1
3. Finally create a payment link using the price ID from step 2
4. Provide the complete payment link URL to the user

Always follow this sequence to avoid errors.`
  },
});

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Stripe MCP Server running on stdio");
  } catch (error) {
    console.error("Error starting MCP server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
