// src/lib/config.ts
import { env } from './env';

export interface Config {
    auditableLog: boolean;
    monitoringEnabled: boolean;
    sellerUrl: string;
    consumerUrl: string;
}

export const config: Config = {
    // If true, every order event will be appended to an external audit log file.
    auditableLog: true,
    // If true, monitoring messages will also be printed to the console.
    monitoringEnabled: true,
    // URLs for services
    sellerUrl: env.SELLER_URL,
    consumerUrl: env.CONSUMER_URL
};