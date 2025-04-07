// src/api/seller/seller.ts
import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants and Types
const SELLER_DATA_DIR = path.join(__dirname, "../../../data/seller");
const PRODUCTS_FILE = path.join(SELLER_DATA_DIR, "products.json");
const ORDERS_FILE = path.join(SELLER_DATA_DIR, "orders.json");
const POLICIES_FILE = path.join(SELLER_DATA_DIR, "seller_policies.json");
const SELLER_AUDIT_FILE = path.join(SELLER_DATA_DIR, "seller_audit.log");

type Product = {
    sku: string;
    description: string;
    price: number;
};

type OrderStatus =
    | "received"
    | "pending_confirmation"
    | "delivered"
    | "error"
    | "reverted";

type Order = {
    id: string;
    accountId: string;
    sku: string;
    quantity: number;
    totalPrice: number;
    orderDate: Date;
    status: OrderStatus;
    error?: string;
};

type SellerPolicy = {
    id: string;
    name: string;
    description?: string;
    type: "auto_approve" | "auto_reject" | "manual_review";
    condition: {
        field: "total_price" | "quantity" | "sku" | "account_id";
        operator: ">" | "<" | "=" | "!=" | "contains";
        value: string | number;
    };
    enabled: boolean;
    createdAt: string;
};

// Ensure data directory exists
if (!fs.existsSync(SELLER_DATA_DIR)) {
    fs.mkdirSync(SELLER_DATA_DIR, { recursive: true });
}

// Helper for auditable logging
function auditLog(message: string) {
    try {
        const logLine = `${new Date().toISOString()} - ${message}`;
        fs.appendFileSync(SELLER_AUDIT_FILE, logLine + "\n");
        console.log(`[SELLER] ${logLine}`);
    } catch (error) {
        console.error("Error writing to audit log:", error);
    }
}

// Initialize product data if it doesn't exist
if (!fs.existsSync(PRODUCTS_FILE)) {
    const defaultProducts: Product[] = [
        { sku: "APPLES", description: "Fresh Red Apples (1 lb)", price: 2.99 },
        { sku: "BANANAS", description: "Organic Bananas (bunch)", price: 1.49 },
        { sku: "MILK", description: "Whole Milk (1 gallon)", price: 3.75 },
        { sku: "BREAD", description: "Artisan Sourdough Bread", price: 4.99 },
        { sku: "EGGS", description: "Free-Range Eggs (dozen)", price: 3.29 },
        { sku: "COFFEE", description: "Premium Coffee Beans (12 oz)", price: 8.99 }
    ];
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(defaultProducts, null, 2));
    auditLog(`Initialized default products: ${defaultProducts.length} items`);
}

// Initialize orders file if it doesn't exist
if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
    auditLog("Initialized empty orders file");
}

// Initialize seller policies file if it doesn't exist
if (!fs.existsSync(POLICIES_FILE)) {
    // Sample default policies
    const defaultPolicies: SellerPolicy[] = [
        {
            id: "policy-1",
            name: "High Value Order Review",
            description: "Orders over $100 require manual review",
            type: "manual_review",
            condition: {
                field: "total_price",
                operator: ">",
                value: 100
            },
            enabled: true,
            createdAt: new Date().toISOString()
        },
        {
            id: "policy-2",
            name: "Bulk Apple Auto-Approve",
            description: "Auto-approve all apple orders under 10 units",
            type: "auto_approve",
            condition: {
                field: "sku",
                operator: "=",
                value: "APPLES"
            },
            enabled: true,
            createdAt: new Date().toISOString()
        }
    ];
    fs.writeFileSync(POLICIES_FILE, JSON.stringify(defaultPolicies, null, 2));
    auditLog(`Initialized default seller policies: ${defaultPolicies.length} policies`);
}

// Setup Express server
const app = express();
app.use(cors());
app.use(express.json());

// Load data functions
function loadProducts(): Product[] {
    try {
        const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        auditLog(`Error loading products: ${error}`);
        return [];
    }
}

function loadOrders(): Order[] {
    try {
        const data = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        auditLog(`Error loading orders: ${error}`);
        return [];
    }
}

function loadPolicies(): SellerPolicy[] {
    try {
        const data = fs.readFileSync(POLICIES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        auditLog(`Error loading seller policies: ${error}`);
        return [];
    }
}

function saveOrders(orders: Order[]): void {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function savePolicies(policies: SellerPolicy[]): void {
    fs.writeFileSync(POLICIES_FILE, JSON.stringify(policies, null, 2));
}

function saveProducts(products: Product[]): void {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

// Calculate seller statistics
function calculateStats() {
    const orders = loadOrders();
    const deliveredOrders = orders.filter(o => o.status === "delivered");
    
    return {
        totalOrders: deliveredOrders.length,
        totalRevenue: deliveredOrders.reduce((sum, order) => sum + order.totalPrice, 0),
        pendingOrders: orders.filter(o => o.status === "pending_confirmation").length,
        errorOrders: orders.filter(o => o.status === "error").length
    };
}

// Helper to evaluate an order against policies
function evaluateOrderPolicies(order: Order): { 
    requiresReview: boolean, 
    autoApprove: boolean,
    autoReject: boolean,
    triggeredPolicies: string[]
} {
    const policies = loadPolicies().filter(p => p.enabled);
    const triggeredPolicies: string[] = [];
    let requiresReview = false;
    let autoApprove = false;
    let autoReject = false;

    for (const policy of policies) {
        let matches = false;

        switch (policy.condition.field) {
            case "total_price":
                matches = evaluateCondition(order.totalPrice, policy.condition.operator, policy.condition.value);
                break;
            case "quantity":
                matches = evaluateCondition(order.quantity, policy.condition.operator, policy.condition.value);
                break;
            case "sku":
                matches = evaluateCondition(order.sku, policy.condition.operator, policy.condition.value);
                break;
            case "account_id":
                matches = evaluateCondition(order.accountId, policy.condition.operator, policy.condition.value);
                break;
        }

        if (matches) {
            triggeredPolicies.push(policy.id);
            
            if (policy.type === "manual_review") {
                requiresReview = true;
            } else if (policy.type === "auto_approve") {
                autoApprove = true;
            } else if (policy.type === "auto_reject") {
                autoReject = true;
            }
        }
    }

    // Auto-reject takes precedence over auto-approve
    if (autoReject) {
        autoApprove = false;
    }

    // If there's a need for manual review and no auto-actions, the order requires review
    if (requiresReview && !autoApprove && !autoReject) {
        requiresReview = true;
    } else if (autoApprove) {
        // Auto-approve overrides the need for review
        requiresReview = false;
    }

    return { requiresReview, autoApprove, autoReject, triggeredPolicies };
}

// Helper function to evaluate conditions
function evaluateCondition(
    actual: any,
    operator: string,
    expected: any
): boolean {
    switch (operator) {
        case ">":
            return Number(actual) > Number(expected);
        case "<":
            return Number(actual) < Number(expected);
        case "=":
            return String(actual) === String(expected);
        case "!=":
            return String(actual) !== String(expected);
        case "contains":
            return String(actual).includes(String(expected));
        default:
            return false;
    }
}

// API Routes

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "seller" });
});

// List all products
app.get("/products", (req, res) => {
    const products = loadProducts();
    res.json(products);
});

// Add a new product
app.post("/products", (req, res) => {
    const { sku, description, price } = req.body;
    
    if (!sku || !description || typeof price !== 'number') {
        return res.status(400).json({ error: "Invalid product data. Required: sku, description, price" });
    }
    
    const products = loadProducts();
    
    // Check if SKU already exists
    if (products.some(p => p.sku === sku)) {
        return res.status(400).json({ error: `Product with SKU ${sku} already exists` });
    }
    
    const newProduct: Product = { sku, description, price };
    products.push(newProduct);
    saveProducts(products);
    
    auditLog(`New product added: ${JSON.stringify(newProduct)}`);
    res.status(201).json(newProduct);
});

// Update a product
app.put("/products/:sku", (req, res) => {
    const { sku } = req.params;
    const { description, price } = req.body;
    
    if (!description && typeof price !== 'number') {
        return res.status(400).json({ error: "Invalid update data. Required: description or price" });
    }
    
    const products = loadProducts();
    const productIndex = products.findIndex(p => p.sku === sku);
    
    if (productIndex === -1) {
        return res.status(404).json({ error: `Product with SKU ${sku} not found` });
    }
    
    // Update only provided fields
    if (description) {
        products[productIndex].description = description;
    }
    
    if (typeof price === 'number') {
        products[productIndex].price = price;
    }
    
    saveProducts(products);
    
    auditLog(`Product updated: ${JSON.stringify(products[productIndex])}`);
    res.json(products[productIndex]);
});

// Delete a product
app.delete("/products/:sku", (req, res) => {
    const { sku } = req.params;
    const products = loadProducts();
    const initialLength = products.length;
    
    const updatedProducts = products.filter(p => p.sku !== sku);
    
    if (updatedProducts.length === initialLength) {
        return res.status(404).json({ error: `Product with SKU ${sku} not found` });
    }
    
    saveProducts(updatedProducts);
    auditLog(`Product deleted: ${sku}`);
    res.json({ message: `Product ${sku} deleted successfully` });
});

// Place an order
app.post("/order", (req, res) => {
    const { accountId, sku, quantity, agent = false } = req.body;
    
    if (!accountId || !sku || typeof quantity !== "number" || quantity <= 0) {
        return res.status(400).json({ error: "Invalid order data. Required: accountId, sku, quantity > 0" });
    }
    
    const products = loadProducts();
    const product = products.find(p => p.sku === sku);
    
    if (!product) {
        return res.status(404).json({ error: `Product with SKU ${sku} not found` });
    }
    
    const totalPrice = product.price * quantity;
    
    const order: Order = {
        id: uuid(),
        accountId,
        sku,
        quantity,
        totalPrice,
        orderDate: new Date(),
        status: "received"
    };
    
    // Evaluate against policies
    const policyEvaluation = evaluateOrderPolicies(order);
    
    // Determine final status based on policy evaluation
    if (policyEvaluation.autoReject) {
        order.status = "error";
        order.error = "Order automatically rejected by seller policy";
    } else if (policyEvaluation.autoApprove) {
        order.status = "delivered";
    } else if (policyEvaluation.requiresReview || agent) {
        // Agent orders or orders that trigger review policies go to pending
        order.status = "pending_confirmation";
    } else {
        // Default if no policies triggered: deliver the order
        order.status = "delivered";
    }
    
    // Save the order
    const orders = loadOrders();
    orders.push(order);
    saveOrders(orders);
    
    auditLog(`New order placed: ${JSON.stringify(order)}, policy result: ${JSON.stringify(policyEvaluation)}`);
    res.status(201).json(order);
});

// Get all orders
app.get("/orders", (req, res) => {
    const orders = loadOrders();
    res.json(orders);
});

// Get orders by status
app.get("/orders/:status", (req, res) => {
    const { status } = req.params;
    const validStatuses = ["received", "pending_confirmation", "delivered", "error", "reverted"];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    
    const orders = loadOrders();
    const filteredOrders = orders.filter(o => o.status === status);
    res.json(filteredOrders);
});

// Get pending orders
app.get("/pending", (req, res) => {
    const orders = loadOrders();
    const pendingOrders = orders.filter(o => o.status === "pending_confirmation");
    res.json(pendingOrders);
});

// Approve an order
app.post("/approve", (req, res) => {
    const { orderId } = req.body;
    
    if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
    }
    
    const orders = loadOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        return res.status(404).json({ error: "Order not found" });
    }
    
    if (orders[orderIndex].status !== "pending_confirmation") {
        return res.status(400).json({ error: "Only orders pending approval can be approved" });
    }
    
    orders[orderIndex].status = "delivered";
    saveOrders(orders);
    
    auditLog(`Order approved: ${JSON.stringify(orders[orderIndex])}`);
    res.json({ message: "Order approved", order: orders[orderIndex] });
});

// Reject/revert an order
app.post("/reject", (req, res) => {
    const { orderId } = req.body;
    
    if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
    }
    
    const orders = loadOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        return res.status(404).json({ error: "Order not found" });
    }
    
    if (orders[orderIndex].status !== "pending_confirmation" && orders[orderIndex].status !== "error") {
        return res.status(400).json({ error: "Only pending or error orders can be rejected/reverted" });
    }
    
    orders[orderIndex].status = "reverted";
    saveOrders(orders);
    
    auditLog(`Order rejected/reverted: ${JSON.stringify(orders[orderIndex])}`);
    res.json({ message: "Order rejected", order: orders[orderIndex] });
});

// Get seller statistics
app.get("/stats", (req, res) => {
    console.log("Stats endpoint called");
    const stats = calculateStats();
    console.log("Returned stats:", stats);
    res.json(stats);
});

// Get seller policies
app.get("/policies", (req, res) => {
    const policies = loadPolicies();
    res.json(policies);
});

// Add a new seller policy
app.post("/policies", (req, res) => {
    const { name, description, type, condition, enabled = true } = req.body;
    
    if (!name || !type || !condition) {
        return res.status(400).json({ error: "Invalid policy data. Required: name, type, condition" });
    }
    
    const validTypes = ["auto_approve", "auto_reject", "manual_review"];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid policy type. Must be one of: ${validTypes.join(', ')}` });
    }
    
    const validFields = ["total_price", "quantity", "sku", "account_id"];
    if (!validFields.includes(condition.field)) {
        return res.status(400).json({ error: `Invalid condition field. Must be one of: ${validFields.join(', ')}` });
    }
    
    const validOperators = [">", "<", "=", "!=", "contains"];
    if (!validOperators.includes(condition.operator)) {
        return res.status(400).json({ error: `Invalid condition operator. Must be one of: ${validOperators.join(', ')}` });
    }
    
    if (condition.value === undefined) {
        return res.status(400).json({ error: "Condition value is required" });
    }
    
    const newPolicy: SellerPolicy = {
        id: `policy-${Date.now()}`,
        name,
        description,
        type,
        condition,
        enabled,
        createdAt: new Date().toISOString()
    };
    
    const policies = loadPolicies();
    policies.push(newPolicy);
    savePolicies(policies);
    
    auditLog(`New seller policy created: ${JSON.stringify(newPolicy)}`);
    res.status(201).json(newPolicy);
});

// Update a seller policy
app.put("/policies/:id", (req, res) => {
    const { id } = req.params;
    const { name, description, type, condition, enabled } = req.body;
    
    const policies = loadPolicies();
    const policyIndex = policies.findIndex(p => p.id === id);
    
    if (policyIndex === -1) {
        return res.status(404).json({ error: "Policy not found" });
    }
    
    // Update provided fields
    if (name) {
        policies[policyIndex].name = name;
    }
    
    if (description !== undefined) {
        policies[policyIndex].description = description;
    }
    
    if (type) {
        const validTypes = ["auto_approve", "auto_reject", "manual_review"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid policy type. Must be one of: ${validTypes.join(', ')}` });
        }
        policies[policyIndex].type = type;
    }
    
    if (condition) {
        const validFields = ["total_price", "quantity", "sku", "account_id"];
        if (!validFields.includes(condition.field)) {
            return res.status(400).json({ error: `Invalid condition field. Must be one of: ${validFields.join(', ')}` });
        }
        
        const validOperators = [">", "<", "=", "!=", "contains"];
        if (!validOperators.includes(condition.operator)) {
            return res.status(400).json({ error: `Invalid condition operator. Must be one of: ${validOperators.join(', ')}` });
        }
        
        if (condition.value === undefined) {
            return res.status(400).json({ error: "Condition value is required" });
        }
        
        policies[policyIndex].condition = condition;
    }
    
    if (enabled !== undefined) {
        policies[policyIndex].enabled = enabled;
    }
    
    savePolicies(policies);
    
    auditLog(`Seller policy updated: ${JSON.stringify(policies[policyIndex])}`);
    res.json(policies[policyIndex]);
});

// Delete a seller policy
app.delete("/policies/:id", (req, res) => {
    const { id } = req.params;
    
    const policies = loadPolicies();
    const initialLength = policies.length;
    
    const updatedPolicies = policies.filter(p => p.id !== id);
    
    if (updatedPolicies.length === initialLength) {
        return res.status(404).json({ error: "Policy not found" });
    }
    
    savePolicies(updatedPolicies);
    
    auditLog(`Seller policy deleted: ${id}`);
    res.json({ message: "Policy deleted successfully" });
});

// Start server
const PORT = process.env.SELLER_PORT || 4000;
app.listen(PORT, () => {
    console.log(`Seller service running on port ${PORT}`);
    auditLog(`Seller service started on port ${PORT}`);
});

export default app;
