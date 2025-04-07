import asyncio
import os
import re
import qrcode
import streamlit as st
from io import BytesIO
from PIL import Image
from agents import Agent, Runner
from stripe_agent_toolkit.openai.toolkit import StripeAgentToolkit

# Initialize the Stripe Agent Toolkit
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

# Define our agent
agent = Agent(
    name="Stripe Agent",
    instructions="""Integrate with Stripe effectively to support business needs. 
    
    When creating payment links, follow these steps in order:
    1. First create a product with the requested details
    2. Then create a price for that product using the product ID returned from step 1
    3. Finally create a payment link using the price ID from step 2
    4. Provide the complete payment link URL to the user
    
    Always follow this sequence to avoid errors.""",
    tools=stripe_agent_toolkit.get_tools()
)

# Function to generate QR code for payment links
def generate_qr_code(url):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return buffered.getvalue()

# Check if a string contains a payment link
def extract_payment_link(text):
    # Match URLs that look like Stripe payment links
    match = re.search(r'https://checkout\.stripe\.com/[\w/.-]+', text)
    if match:
        return match.group(0)
    return None

# Streamlit UI setup
st.title("Stripe Agent Chat")

# Initialize session state for chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        
        # If this is an assistant message with a payment link, show QR code
        if message["role"] == "assistant":
            payment_link = extract_payment_link(message["content"])
            if payment_link:
                st.image(generate_qr_code(payment_link), caption="Payment Link QR Code", width=300)

# Chat input
if prompt := st.chat_input("How can I help you with Stripe today?"):
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # Display user message
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Display assistant response in chat message container
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        # Run the agent
        with st.spinner("Thinking..."):
            try:
                async def run_agent():
                    return await Runner.run(agent, prompt)
                
                result = asyncio.run(run_agent())
                full_response = result.final_output
                
                # Display the response
                message_placeholder.markdown(full_response)
                
                # Check for payment links and display QR code if found
                payment_link = extract_payment_link(full_response)
                if payment_link:
                    st.image(generate_qr_code(payment_link), caption="Payment Link QR Code", width=300)
                
                # Add assistant response to chat history
                st.session_state.messages.append({"role": "assistant", "content": full_response})
            except Exception as e:
                error_message = f"Error: {str(e)}"
                message_placeholder.error(error_message)
                
                # Add a more helpful message about potential issues
                if "No such price" in str(e):
                    message_placeholder.warning("There was an issue creating the payment link. The agent may have tried to use an invalid price ID.")
                    message_placeholder.info("Try asking to create a product first, then a price, and then a payment link.")
                
                # Add error message to chat history
                st.session_state.messages.append({"role": "assistant", "content": error_message})

# Main entry point
if __name__ == "__main__":
    # This will be handled by Streamlit
    pass
