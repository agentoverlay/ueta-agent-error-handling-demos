import asyncio
import os
from agents import Agent, Runner
from stripe_agent_toolkit.openai.toolkit import StripeAgentToolkit

stripe_agent_toolkit = StripeAgentToolkit(
    secret_key=os.getenv("STRIPE_SECRET_KEY"),
    configuration={
        "actions": {
            "payment_links": {
                "create": True,
            },
            "products": {
                "create": True,
            },
            "prices": {
                "create": True,
            },
        }
    },
)

agent = Agent(
    name="Stripe Agent",
    instructions="Integrate with Stripe effectively to support business needs.",
    tools=stripe_agent_toolkit.get_tools()
)

async def main():
    assignment = "Create a payment link for a new product called \"Test\" with a price of $100."

    result = await Runner.run(agent, assignment)

    print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
