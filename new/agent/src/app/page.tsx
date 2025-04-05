// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import ProductList from "../components/ProductList";
import CreatePurchaseOrder from "../components/CreatePurchaseOrder";
import ReviewDashboard from "../components/ReviewDashboard";
import TransactionLogs from "../components/TransactionLogs";
import PolicyManagement from "../components/PolicyManagement";
import Wallet from "../components/Wallet";

import Login from "../components/Login";
import { env } from "../lib/env";

interface Account {
  id: string;
  wallet: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountCheckComplete, setAccountCheckComplete] = useState(false);

  // Check if account exists
  useEffect(() => {
    const checkAccount = async () => {
      try {
        const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/account`);
        if (response.ok) {
          const accountData = await response.json();
          setAccount(accountData);
        } else {
          setAccount(null);
        }
      } catch (error) {
        console.error("Error checking account:", error);
        setAccount(null);
      } finally {
        setLoading(false);
        setAccountCheckComplete(true);
      }
    };

    checkAccount();
  }, []);

  const handleAccountCreated = (newAccount: Account) => {
    setAccount(newAccount);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "products":
        return <ProductList />;
      case "order":
        return (
          <CreatePurchaseOrder
            onAccountUpdated={setAccount}
            currentAccount={account}
          />
        );
      case "dashboard":
        return <ReviewDashboard />;
      case "logs":
        return <TransactionLogs />;
      case "policies":
        return <PolicyManagement />;
      case "wallet":
        return (
          <Wallet onAccountUpdated={setAccount} currentAccount={account} />
        );
      default:
        return <ReviewDashboard />;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login/account creation if no account exists
  if (!account && accountCheckComplete) {
    return <Login onAccountCreated={handleAccountCreated} />;
  }

  // Show dashboard once account exists
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                UETA Agent Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage products, create purchase orders, review pending
                transactions, and view logs
              </p>
            </div>
            {account && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  Account ID:{" "}
                  <span className="font-medium">
                    {account.id.substring(0, 8)}...
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Balance:{" "}
                  <span className="font-medium text-green-600">
                    ${account.wallet.toFixed(2)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`${
                  activeTab === "dashboard"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Review Dashboard
              </button>
              <button
                onClick={() => setActiveTab("products")}
                className={`${
                  activeTab === "products"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Product List
              </button>
              <button
                onClick={() => setActiveTab("order")}
                className={`${
                  activeTab === "order"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Create Purchase Order
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`${
                  activeTab === "logs"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Transaction Logs
              </button>
              <button
                onClick={() => setActiveTab("policies")}
                className={`${
                  activeTab === "policies"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Approval Policies
              </button>
              <button
                onClick={() => setActiveTab("wallet")}
                className={`${
                  activeTab === "wallet"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Wallet
              </button>
            </nav>
          </div>
        </div>

        {renderTabContent()}
      </div>

      <footer className="bg-white shadow-inner mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              UETA Agent Dashboard - Demo Application
            </p>
            <div className="flex space-x-4">
              <a
                href={`${env.NEXT_PUBLIC_API_URL}/api/health`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                API Health Check
              </a>
              <span className="text-gray-300">|</span>
              <a
                href={`${env.NEXT_PUBLIC_API_URL}/metrics`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Metrics
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
