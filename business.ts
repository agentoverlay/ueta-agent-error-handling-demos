import express from "express";
import { v4 as uuid } from "uuid";

type Product = {
    sku: string;
    description: string;
    price: number;
};

type Order = {
    id: string;
    accountId: string;
    sku: string;
    quantity: number;
    totalPrice: number;
    orderDate: Date;
    status: "received" | "delivered" | "error";
    error?: string;
};

// Check for the flag to simulate errors (approx. 10% chance)
const withError = process.argv.includes("--with-error");

// A sample list of products
const products: Product[] = [
    { sku: "SKU001", description: "Widget A", price: 50 },
    { sku: "SKU002", description: "Widget B", price: 30 },
    { sku: "SKU003", description: "Gadget C", price: 100 },
];

const orders: Order[] = [];

const app = express();
app.use(express.json());

// Endpoint to list all available products
app.get("/products", (req, res) => {
    res.json(products);
});

// Endpoint to place an order.
// Expected payload: { accountId: string, sku: string, quantity: number }
app.post("/order", (req, res) => {
    const { accountId, sku, quantity } = req.body;
    if (!accountId || !sku || typeof quantity !== "number" || quantity <= 0) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    // Find the product for the given SKU.
    const product = products.find((p) => p.sku === sku);
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }

    const totalPrice = product.price * quantity;
    const order: Order = {
        id: uuid(),
        accountId,
        sku,
        quantity,
        totalPrice,
        orderDate: new Date(),
        status: "received",
    };

    // Simulate error in 10% of orders if the flag is active.
    if (withError && Math.random() < 0.1) {
        order.error = "Simulated error in order processing";
        order.status = "error";
        orders.push(order);
        console.error(`[ERROR] Order error: ${JSON.stringify(order)}`);
        console.log(
            `Latest order status for account ${accountId}: ${order.status}`,
        );
        return res.status(201).json(order);
    }

    // Process order: instantly deliver for our simulation.
    order.status = "delivered";
    orders.push(order);

    console.log(`[INFO] Order received: ${JSON.stringify(order)}`);
    console.log(
        `Latest order status for account ${accountId}: ${order.status}`,
    );

    return res.status(201).json(order);
});

app.listen(4000, () => {
    console.log("Business API listening on port 4000");
    if (withError) {
        console.log("Running in error simulation mode (--with-error).");
    }
});
