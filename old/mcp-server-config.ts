export interface McpServerConfig {
    // Server configuration
    auditableLog: boolean;
    monitoringEnabled: boolean;
    progressiveConfirmation: boolean;
    // URL Configurations
    sellerUrl: string;
}

export const mcpServerConfig: McpServerConfig = {
    // If true, every order event will be appended to an external audit log file.
    auditableLog: true,
    // If true, monitoring messages will also be printed to the console.
    monitoringEnabled: true,
    // If true, orders are first marked as "pending_confirmation" before automatically
    // transitioning to "delivered" after a delay.
    progressiveConfirmation: true,
    // URL for the seller service, can be overridden with environment variables
    sellerUrl: process.env.SELLER_URL || "http://localhost:4000"
};
