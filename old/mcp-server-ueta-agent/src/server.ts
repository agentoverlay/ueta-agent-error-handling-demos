import {
    McpServer,
    ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";

// In-memory storage
let inMemoryAccount: { id: string; wallet: number } | null = null;
let inMemoryAuditLog: string[] = [];
let inMemoryOrders: any[] = [];
let inMemoryTransactions: {
    timestamp: string;
    description: string;
    amount: number;
    balance: number;
    type: "deposit" | "withdrawal" | "purchase";
}[] = [];

// A flag to control whether the autonomous agent is running
let agentRunning = false;

// Constants
const STARTING_BALANCE = 0;

// Helper for agent audit logging.
function agentAuditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    inMemoryAuditLog.push(logLine);
    console.error(`[AUDIT] ${logLine}`);
}

// Helper functions
function getAccount(): { id: string; wallet: number } | null {
    return inMemoryAccount;
}

function saveAccount(account: { id: string; wallet: number }): void {
    inMemoryAccount = account;
}

function addTransaction(
    description: string,
    amount: number,
    type: "deposit" | "withdrawal" | "purchase",
): void {
    if (!inMemoryAccount) return;

    const currentBalance = inMemoryAccount.wallet;
    inMemoryTransactions.push({
        timestamp: new Date().toISOString(),
        description,
        amount,
        balance: currentBalance,
        type,
    });
    agentAuditLog(
        `Transaction recorded: ${description}, Amount: ${amount}, Type: ${type}`,
    );
}

// Create the MCP server
const server = new McpServer({
    name: "UETA Agent Server",
    version: "1.0.0",
});

// Resource: Get wallet info with transactions
server.resource("wallet", "wallet://info", async (uri) => {
    const account = getAccount();
    if (!account) {
        return {
            contents: [
                {
                    uri: uri.href,
                    text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                },
            ],
        };
    }
    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(
                    {
                        balance: account.wallet,
                        accountId: account.id,
                        recentTransactions: inMemoryTransactions
                            .slice(-10)
                            .reverse(),
                    },
                    null,
                    2,
                ),
            },
        ],
    };
});

// Resource: Get transaction history
server.resource("transactions", "transactions://history", async (uri) => {
    const account = getAccount();
    if (!account) {
        return {
            contents: [
                {
                    uri: uri.href,
                    text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                },
            ],
        };
    }
    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(inMemoryTransactions, null, 2),
            },
        ],
    };
});

// Resource: Get account info
server.resource("account", "account://info", async (uri) => {
    const account = getAccount();
    if (!account) {
        return {
            contents: [
                {
                    uri: uri.href,
                    text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                },
            ],
        };
    }
    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(account, null, 2),
            },
        ],
    };
});

// Resource: Get available products
server.resource("products", "products://list", async (uri) => {
    try {
        const response = await fetch("http://localhost:4000/products");
        if (!response.ok) {
            agentAuditLog("Error fetching products from business API.");
            const fallbackProducts = [
                { sku: "SKU001", description: "Widget A", price: 50 },
                { sku: "SKU002", description: "Widget B", price: 30 },
                { sku: "SKU003", description: "Gadget C", price: 100 },
            ];
            return {
                contents: [
                    {
                        uri: uri.href,
                        text:
                            JSON.stringify(fallbackProducts, null, 2) +
                            "\n(Using fallback products due to API connection error)",
                    },
                ],
            };
        }
        const products = await response.json();
        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(products, null, 2),
                },
            ],
        };
    } catch (error) {
        agentAuditLog(`Error connecting to business API: ${error}`);
        // Use fallback products if API is unavailable
        const fallbackProducts = [
            { sku: "SKU001", description: "Widget A", price: 50 },
            { sku: "SKU002", description: "Widget B", price: 30 },
            { sku: "SKU003", description: "Gadget C", price: 100 },
        ];
        return {
            contents: [
                {
                    uri: uri.href,
                    text:
                        JSON.stringify(fallbackProducts, null, 2) +
                        "\n(Using fallback products due to API connection error)",
                },
            ],
        };
    }
});

// Resource: Get pending orders
server.resource("pending", "pending://orders", async (uri) => {
    try {
        const account = getAccount();
        if (!account) {
            return {
                contents: [
                    {
                        uri: uri.href,
                        text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                    },
                ],
            };
        }

        const myPending = inMemoryOrders.filter(
            (order) =>
                order.accountId === account.id &&
                (order.status === "pending" ||
                    order.status === "pending_confirmation"),
        );

        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(myPending, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            contents: [
                {
                    uri: uri.href,
                    text: `Error processing orders: ${error}`,
                },
            ],
        };
    }
});

// Resource: Get overall stats
server.resource("stats", "stats://overall", async (uri) => {
    try {
        const stats = {
            totalOrders: inMemoryOrders.length,
            totalAmountPaid: inMemoryOrders.reduce(
                (sum, order) => sum + order.totalPrice,
                0,
            ),
            pendingOrders: inMemoryOrders.filter(
                (order) =>
                    order.status === "pending" ||
                    order.status === "pending_confirmation",
            ).length,
            completedOrders: inMemoryOrders.filter(
                (order) =>
                    order.status === "delivered" || order.status === "approved",
            ).length,
        };

        return {
            contents: [
                {
                    uri: uri.href,
                    text: JSON.stringify(stats, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            contents: [
                {
                    uri: uri.href,
                    text: `Error calculating stats: ${error}`,
                },
            ],
        };
    }
});

// Resource: Get agent status
server.resource("agent", "agent://status", async (uri) => {
    const account = getAccount();
    if (!account) {
        return {
            contents: [
                {
                    uri: uri.href,
                    text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                },
            ],
        };
    }

    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(
                    {
                        accountId: account.id,
                        walletBalance: account.wallet,
                        storageMode: "in-memory",
                        totalOrders: inMemoryOrders.filter(
                            (o) => o.accountId === account.id,
                        ).length,
                    },
                    null,
                    2,
                ),
            },
        ],
    };
});

// Resource: Get audit log
server.resource("audit", "audit://log", async (uri) => {
    return {
        contents: [
            {
                uri: uri.href,
                text:
                    inMemoryAuditLog.join("\n") ||
                    "No audit log entries found.",
            },
        ],
    };
});

// Tool: Create a new account
server.tool(
    "ueta-create-account",
    { deposit: z.number().default(100) },
    async ({ deposit }) => {
        if (deposit > STARTING_BALANCE) {
            agentAuditLog(
                `Failed to create account: deposit ${deposit} exceeds starting balance.`,
            );
            return {
                content: [
                    {
                        type: "text",
                        text: `Deposit amount ${deposit} exceeds starting balance of ${STARTING_BALANCE}.`,
                    },
                ],
                isError: true,
            };
        }

        const account = {
            id: uuid(),
            wallet: STARTING_BALANCE - deposit,
        };

        saveAccount(account);
        agentAuditLog(`Account created: ${JSON.stringify(account)}`);

        // Record initial deposit transaction
        addTransaction(`Initial deposit`, deposit, "deposit");

        return {
            content: [
                {
                    type: "text",
                    text: `Account created successfully. ID: ${account.id}, Wallet Balance: ${account.wallet}`,
                },
            ],
        };
    },
);

// Tool: Check wallet balance
server.tool("ueta-check-balance", {}, async () => {
    const account = getAccount();
    if (!account) {
        return {
            content: [
                {
                    type: "text",
                    text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                },
            ],
            isError: true,
        };
    }

    // Get recent transactions
    const recentTransactions = inMemoryTransactions.slice(-5).reverse();

    return {
        content: [
            {
                type: "text",
                text: `Current wallet balance: ${
                    account.wallet
                }\n\nAccount ID: ${
                    account.id
                }\n\nRecent transactions:\n${recentTransactions
                    .map(
                        (t) =>
                            `${t.timestamp.substring(
                                0,
                                19,
                            )} | ${t.description.padEnd(30)} | ${t.type.padEnd(
                                10,
                            )} | ${t.amount}`,
                    )
                    .join("\n")}`,
            },
        ],
    };
});

// Tool: Add funds to wallet
server.tool(
    "ueta-add-funds",
    { amount: z.number().positive() },
    async ({ amount }) => {
        const account = getAccount();
        if (!account) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                    },
                ],
                isError: true,
            };
        }

        // Update wallet balance
        const oldBalance = account.wallet;
        account.wallet += amount;
        saveAccount(account);

        // Record transaction
        addTransaction(`Added funds to wallet`, amount, "deposit");
        agentAuditLog(
            `Added ${amount} to wallet. New balance: ${account.wallet}`,
        );

        return {
            content: [
                {
                    type: "text",
                    text: `Successfully added ${amount} to your wallet.\nPrevious balance: ${oldBalance}\nNew balance: ${account.wallet}`,
                },
            ],
        };
    },
);

// Tool: Withdraw funds from wallet
server.tool(
    "ueta-withdraw-funds",
    { amount: z.number().positive() },
    async ({ amount }) => {
        const account = getAccount();
        if (!account) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                    },
                ],
                isError: true,
            };
        }

        // Check if sufficient funds
        if (account.wallet < amount) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Insufficient funds. Current balance: ${account.wallet}, Withdrawal amount: ${amount}`,
                    },
                ],
                isError: true,
            };
        }

        // Update wallet balance
        const oldBalance = account.wallet;
        account.wallet -= amount;
        saveAccount(account);

        // Record transaction
        addTransaction(`Withdrew funds from wallet`, amount, "withdrawal");
        agentAuditLog(
            `Withdrew ${amount} from wallet. New balance: ${account.wallet}`,
        );

        return {
            content: [
                {
                    type: "text",
                    text: `Successfully withdrew ${amount} from your wallet.\nPrevious balance: ${oldBalance}\nNew balance: ${account.wallet}`,
                },
            ],
        };
    },
);

// Tool: Get transaction statistics
server.tool("ueta-transaction-stats", {}, async () => {
    const account = getAccount();
    if (!account) {
        return {
            content: [
                {
                    type: "text",
                    text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                },
            ],
            isError: true,
        };
    }

    // Calculate transaction statistics
    const deposits = inMemoryTransactions.filter((t) => t.type === "deposit");
    const withdrawals = inMemoryTransactions.filter(
        (t) => t.type === "withdrawal",
    );
    const purchases = inMemoryTransactions.filter((t) => t.type === "purchase");

    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    const totalPurchases = purchases.reduce((sum, t) => sum + t.amount, 0);

    return {
        content: [
            {
                type: "text",
                text:
                    `Transaction Statistics:\n\n` +
                    `Total Transactions: ${inMemoryTransactions.length}\n` +
                    `\nDeposits:\n` +
                    `- Count: ${deposits.length}\n` +
                    `- Total Amount: ${totalDeposits}\n` +
                    `\nWithdrawals:\n` +
                    `- Count: ${withdrawals.length}\n` +
                    `- Total Amount: ${totalWithdrawals}\n` +
                    `\nPurchases:\n` +
                    `- Count: ${purchases.length}\n` +
                    `- Total Amount: ${totalPurchases}\n` +
                    `\nCurrent Balance: ${account.wallet}`,
            },
        ],
    };
});

// Tool: Get pending orders
server.tool("ueta-get-pending-orders", {}, async () => {
    const account = getAccount();
    if (!account) {
        return {
            content: [
                {
                    type: "text",
                    text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                },
            ],
            isError: true,
        };
    }

    // Get pending orders
    const pendingOrders = inMemoryOrders.filter(
        (order) =>
            order.accountId === account.id &&
            (order.status === "pending" ||
                order.status === "pending_confirmation"),
    );

    if (pendingOrders.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "You don't have any pending orders.",
                },
            ],
        };
    }

    return {
        content: [
            {
                type: "text",
                text:
                    `You have ${pendingOrders.length} pending orders:\n\n` +
                    pendingOrders
                        .map(
                            (order, index) =>
                                `Order #${index + 1}:\n` +
                                `- ID: ${order.id}\n` +
                                `- SKU: ${order.sku}\n` +
                                `- Quantity: ${order.quantity}\n` +
                                `- Total Price: ${order.totalPrice}\n` +
                                `- Status: ${order.status}\n`,
                        )
                        .join("\n"),
            },
        ],
    };
});

// Tool: Place an order
server.tool(
    "ueta-place-order",
    {
        sku: z.string(),
        quantity: z.number().int().positive(),
        agentMode: z.boolean().default(false),
    },
    async ({ sku, quantity, agentMode }) => {
        const account = getAccount();
        if (!account) {
            agentAuditLog("Order failed: No account found.");
            return {
                content: [
                    {
                        type: "text",
                        text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                    },
                ],
                isError: true,
            };
        }

        try {
            // Fetch product details
            const res = await fetch("http://localhost:4000/products");
            let products;

            if (!res.ok) {
                agentAuditLog(
                    "Error fetching products, using fallback products.",
                );
                // Fallback products if API is unavailable
                products = [
                    { sku: "SKU001", description: "Widget A", price: 50 },
                    { sku: "SKU002", description: "Widget B", price: 30 },
                    { sku: "SKU003", description: "Gadget C", price: 100 },
                ];
            } else {
                products = await res.json();
            }

            const product = products.find((p: any) => p.sku === sku);

            if (!product) {
                agentAuditLog(`Order failed: Product not found for SKU ${sku}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Product not found for SKU: ${sku}`,
                        },
                    ],
                    isError: true,
                };
            }

            const totalCost = product.price * quantity;
            if (account.wallet < totalCost) {
                agentAuditLog(
                    `Order failed: Insufficient funds. Wallet: ${account.wallet}, needed: ${totalCost}`,
                );
                return {
                    content: [
                        {
                            type: "text",
                            text: `Insufficient funds in wallet. Wallet: ${account.wallet}, Order cost: ${totalCost}`,
                        },
                    ],
                    isError: true,
                };
            }

            // Try to place order with external API if available
            let orderFromAPI = null;
            let useAPIOrder = false;

            try {
                const response = await fetch("http://localhost:4000/order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        accountId: account.id,
                        sku: sku,
                        quantity: quantity,
                        agent: agentMode,
                    }),
                });

                if (response.ok) {
                    orderFromAPI = await response.json();
                    useAPIOrder = true;
                    agentAuditLog(
                        `Order placed via API: ${JSON.stringify(orderFromAPI)}`,
                    );
                }
            } catch (error) {
                agentAuditLog(
                    `Error connecting to order API: ${error}. Using internal order processing.`,
                );
            }

            // Create order - either from API or internally
            const order = useAPIOrder
                ? orderFromAPI
                : {
                      id: uuid(),
                      accountId: account.id,
                      sku: sku,
                      quantity: quantity,
                      totalPrice: totalCost,
                      status: "pending",
                      agent: agentMode,
                      orderDate: new Date(),
                  };

            // Always add to in-memory tracking
            if (!useAPIOrder) {
                inMemoryOrders.push(order);
                agentAuditLog(
                    `Order created internally: ${JSON.stringify(order)}`,
                );
            }

            // Update wallet balance
            account.wallet -= totalCost;
            saveAccount(account);

            // Record purchase transaction
            addTransaction(
                `Purchased ${quantity}x ${product.description || sku}`,
                totalCost,
                "purchase",
            );
            agentAuditLog(`Updated wallet balance: ${account.wallet}`);

            return {
                content: [
                    {
                        type: "text",
                        text: `Order placed successfully. Order details: ${JSON.stringify(
                            order,
                        )}\nUpdated wallet balance: ${account.wallet}`,
                    },
                ],
            };
        } catch (error) {
            agentAuditLog(`Error during order processing: ${error}`);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error processing order: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Tool: Approve order
server.tool(
    "ueta-approve-order",
    { orderId: z.string() },
    async ({ orderId }) => {
        try {
            // Try external API first
            let approved = false;

            try {
                const response = await fetch("http://localhost:4000/approve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId }),
                });

                if (response.ok) {
                    approved = true;
                    agentAuditLog(`Order approved via API: ${orderId}`);
                }
            } catch (error) {
                agentAuditLog(
                    `Error connecting to approve API: ${error}. Using internal approval.`,
                );
            }

            // Use internal approval if API call failed
            if (!approved) {
                // Find the order in memory
                const orderIndex = inMemoryOrders.findIndex(
                    (order) => order.id === orderId,
                );

                if (orderIndex === -1) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Order ${orderId} not found.`,
                            },
                        ],
                        isError: true,
                    };
                }

                // Update order status
                inMemoryOrders[orderIndex].status = "approved";
                agentAuditLog(`Order approved internally: ${orderId}`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Order ${orderId} approved successfully.`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error approving order: ${error}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// Tool: Start autonomous agent
server.tool("ueta-start-autonomous-agent", {}, async () => {
    const account = getAccount();
    if (!account) {
        agentAuditLog("Agent failed to start: No account found.");
        return {
            content: [
                {
                    type: "text",
                    text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                },
            ],
            isError: true,
        };
    }

    // If it's already running, return quickly
    if (agentRunning) {
        return {
            content: [
                {
                    type: "text",
                    text: "Autonomous agent is already running.",
                },
            ],
        };
    }

    agentRunning = true;
    agentAuditLog(`Agent mode started for account: ${account.id}`);

    // Start the agent in a background process without blocking the response
    setTimeout(async () => {
        const agentProcess = async () => {
            while (agentRunning) {
                await new Promise((res) =>
                    setTimeout(res, Math.floor(Math.random() * 5000) + 1000),
                );

                try {
                    // Get product list - try API first, fall back to local
                    let products;
                    try {
                        const res = await fetch(
                            "http://localhost:4000/products",
                        );
                        if (res.ok) {
                            products = await res.json();
                        } else {
                            throw new Error("API returned error status");
                        }
                    } catch (error) {
                        agentAuditLog(
                            "Agent error: Failed to fetch products from API, using fallback.",
                        );
                        products = [
                            {
                                sku: "SKU001",
                                description: "Widget A",
                                price: 50,
                            },
                            {
                                sku: "SKU002",
                                description: "Widget B",
                                price: 30,
                            },
                            {
                                sku: "SKU003",
                                description: "Gadget C",
                                price: 100,
                            },
                        ];
                    }

                    if (!products || products.length === 0) {
                        agentAuditLog("Agent error: No products available.");
                        continue;
                    }

                    // Get current account info
                    const currentAccount = getAccount();
                    if (!currentAccount) {
                        agentAuditLog("Agent error: Account no longer exists.");
                        break;
                    }

                    // Select random product and quantity
                    const product =
                        products[Math.floor(Math.random() * products.length)];
                    const quantity = Math.floor(Math.random() * 5) + 1;
                    const totalCost = product.price * quantity;

                    if (currentAccount.wallet < totalCost) {
                        agentAuditLog(
                            `Agent skipped order due to insufficient funds. Wallet: ${currentAccount.wallet}, needed: ${totalCost}`,
                        );
                        continue;
                    }

                    // Try to place order with external API
                    let orderPlaced = false;
                    try {
                        const response = await fetch(
                            "http://localhost:4000/order",
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    accountId: currentAccount.id,
                                    sku: product.sku,
                                    quantity,
                                    agent: true,
                                }),
                            },
                        );

                        if (response.ok) {
                            const order = await response.json();
                            orderPlaced = true;
                            agentAuditLog(
                                `Agent order placed via API: ${JSON.stringify(
                                    order,
                                )}`,
                            );
                            // Update wallet
                            currentAccount.wallet -= totalCost;
                            saveAccount(currentAccount);

                            // Record purchase transaction
                            addTransaction(
                                `Agent purchased ${quantity}x ${
                                    product.description || product.sku
                                }`,
                                totalCost,
                                "purchase",
                            );
                            agentAuditLog(
                                `Agent updated wallet balance: ${currentAccount.wallet}`,
                            );
                        }
                    } catch (error) {
                        agentAuditLog(
                            `Agent error connecting to order API: ${error}`,
                        );
                    }

                    // Use internal order if API failed
                    if (!orderPlaced) {
                        const order = {
                            id: uuid(),
                            accountId: currentAccount.id,
                            sku: product.sku,
                            quantity,
                            totalPrice: totalCost,
                            status: "pending",
                            agent: true,
                            orderDate: new Date(),
                        };

                        inMemoryOrders.push(order);
                        agentAuditLog(
                            `Agent order placed internally: ${JSON.stringify(
                                order,
                            )}`,
                        );

                        // Update wallet
                        currentAccount.wallet -= totalCost;
                        saveAccount(currentAccount);

                        // Record purchase transaction
                        addTransaction(
                            `Agent purchased ${quantity}x ${
                                product.description || product.sku
                            }`,
                            totalCost,
                            "purchase",
                        );
                        agentAuditLog(
                            `Agent updated wallet balance: ${currentAccount.wallet}`,
                        );
                    }
                } catch (error) {
                    agentAuditLog(`Autonomous agent error: ${error}`);
                }
            }
            agentAuditLog("Autonomous agent loop terminated.");
        };

        agentProcess().catch((err) => {
            agentAuditLog(`Autonomous agent error: ${err}`);
        });
    }, 0);

    return {
        content: [
            {
                type: "text",
                text: `Autonomous agent mode started for account: ${account.id}. The agent will place random orders in the background.`,
            },
        ],
    };
});

// Tool: Get dashboard URL
server.tool(
    "ueta-get-dashboard-url",
    { port: z.number().default(6001) },
    async ({ port }) => {
        return {
            content: [
                {
                    type: "text",
                    text: `Dashboard functionality is not available in pure in-memory mode.`,
                },
            ],
        };
    },
);

// Add a prompt for helping users get started
server.prompt("get-started", {}, () => ({
    messages: [
        {
            role: "user",
            content: {
                type: "text",
                text: "I want to learn how to use the UETA Agent MCP Server. What can it do and how do I get started?",
            },
        },
    ],
}));

/* ---------------------------------------------------------------------
   NEW TOOLS ADDED BELOW
   --------------------------------------------------------------------- */

// 1) Tool: List Products
server.tool("ueta-list-products", {}, async () => {
    // Attempt to fetch products from the same endpoint used by the resource
    try {
        const response = await fetch("http://localhost:4000/products");
        if (!response.ok) {
            agentAuditLog(
                "ueta-list-products: Error fetching products from business API, using fallback.",
            );
            const fallbackProducts = [
                { sku: "SKU001", description: "Widget A", price: 50 },
                { sku: "SKU002", description: "Widget B", price: 30 },
                { sku: "SKU003", description: "Gadget C", price: 100 },
            ];
            return {
                content: [
                    {
                        type: "text",
                        text:
                            JSON.stringify(fallbackProducts, null, 2) +
                            "\n(Using fallback products due to API error)",
                    },
                ],
            };
        }
        const products = await response.json();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(products, null, 2),
                },
            ],
        };
    } catch (error) {
        agentAuditLog(
            `ueta-list-products: Failed to connect to products API: ${error}`,
        );
        const fallbackProducts = [
            { sku: "SKU001", description: "Widget A", price: 50 },
            { sku: "SKU002", description: "Widget B", price: 30 },
            { sku: "SKU003", description: "Gadget C", price: 100 },
        ];
        return {
            content: [
                {
                    type: "text",
                    text:
                        JSON.stringify(fallbackProducts, null, 2) +
                        "\n(Using fallback products due to connection error)",
                },
            ],
        };
    }
});

// 2) Tool: Get Audit Log
server.tool("ueta-get-audit-log", {}, async () => {
    if (!inMemoryAuditLog.length) {
        return {
            content: [
                {
                    type: "text",
                    text: "No audit log entries found.",
                },
            ],
        };
    }
    // Return the entire log as text
    return {
        content: [
            {
                type: "text",
                text: inMemoryAuditLog.join("\n"),
            },
        ],
    };
});

// 3) Tool: Revoke Order
server.tool(
    "ueta-revoke-order",
    { orderId: z.string() },
    async ({ orderId }) => {
        const account = getAccount();
        if (!account) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No account found. Create an account first using the 'ueta-create-account' tool.",
                    },
                ],
                isError: true,
            };
        }

        // Find the order
        const orderIndex = inMemoryOrders.findIndex(
            (order) => order.id === orderId && order.accountId === account.id,
        );

        if (orderIndex === -1) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Order ${orderId} not found for this account.`,
                    },
                ],
                isError: true,
            };
        }

        // If already delivered or approved, we might not allow revocation
        const order = inMemoryOrders[orderIndex];
        if (order.status === "approved" || order.status === "delivered") {
            return {
                content: [
                    {
                        type: "text",
                        text: `Order ${orderId} cannot be revoked because it has already been ${order.status}.`,
                    },
                ],
                isError: true,
            };
        }

        // Revoke the order
        inMemoryOrders[orderIndex].status = "revoked";
        agentAuditLog(`Order revoked: ${orderId}`);

        return {
            content: [
                {
                    type: "text",
                    text: `Order ${orderId} has been revoked.`,
                },
            ],
        };
    },
);

// 4) Tool: Stop Autonomous Agent
server.tool("ueta-stop-autonomous-agent", {}, async () => {
    if (!agentRunning) {
        return {
            content: [
                {
                    type: "text",
                    text: "Autonomous agent is not currently running.",
                },
            ],
        };
    }
    agentRunning = false;
    agentAuditLog("Autonomous agent has been stopped.");

    return {
        content: [
            {
                type: "text",
                text: "The autonomous agent has been stopped.",
            },
        ],
    };
});

// Export necessary objects for running the server
export { server };
