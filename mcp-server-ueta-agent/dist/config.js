"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    // If true, every order event will be appended to an external audit log file.
    auditableLog: true,
    // If true, monitoring messages will also be printed to the console.
    monitoringEnabled: true,
    // If true, orders are first marked as "pending_confirmation" before automatically
    // transitioning to "delivered" after a delay.
    progressiveConfirmation: true,
};
