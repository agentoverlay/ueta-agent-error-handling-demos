export type Product = {
    sku: string;
    description: string;
    price: number;
};
export type OrderStatus = "received" | "pending_confirmation" | "delivered" | "error" | "reverted";
export type Order = {
    id: string;
    accountId: string;
    sku: string;
    quantity: number;
    totalPrice: number;
    orderDate: Date;
    status: OrderStatus;
    error?: string;
};
