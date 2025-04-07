// src/components/Wallet.tsx
"use client";

import { useState } from "react";
import { env } from "../lib/env";

interface Account {
  id: string;
  wallet: number;
}

interface WalletProps {
  currentAccount: Account | null;
  onAccountUpdated: (account: Account) => void;
}

export default function Wallet({ currentAccount, onAccountUpdated }: WalletProps) {
  const [amount, setAmount] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" } | null>(null);
  const [activeAction, setActiveAction] = useState<"deposit" | "withdraw">("deposit");

  if (!currentAccount) {
    return (
      <div className="bg-white text-black rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Wallet Management</h2>
        <p className="text-red-600">No account available. Please create an account first.</p>
      </div>
    );
  }

  const handleDeposit = async () => {
    if (amount <= 0) {
      setMessage({
        text: "Please enter a valid amount greater than 0.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Call the ueta-add-funds API endpoint
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/ueta-add-funds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add funds");
      }

      const data = await response.json();
      
      // Update account with the returned balance instead of making a separate request
      if (currentAccount && data.newBalance !== undefined) {
        onAccountUpdated({
          ...currentAccount,
          wallet: data.newBalance
        });
        
        setMessage({
          text: `Successfully deposited ${amount.toFixed(2)} to your account.`,
          type: "success",
        });
        setAmount(0); // Reset amount field
      } else {
        throw new Error("Failed to update account data");
      }
    } catch (error) {
      console.error("Error adding funds:", error);
      setMessage({
        text: error instanceof Error ? error.message : "Error adding funds to account. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (amount <= 0) {
      setMessage({
        text: "Please enter a valid amount greater than 0.",
        type: "error",
      });
      return;
    }

    if (amount > currentAccount.wallet) {
      setMessage({
        text: `Insufficient funds. Your current balance is ${currentAccount.wallet.toFixed(2)}.`,
        type: "error",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Call the ueta-withdraw-funds API endpoint
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/ueta-withdraw-funds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to withdraw funds");
      }

      const data = await response.json();
      
      // Update account with the returned balance instead of making a separate request
      if (currentAccount && data.newBalance !== undefined) {
        onAccountUpdated({
          ...currentAccount,
          wallet: data.newBalance
        });
        
        setMessage({
          text: `Successfully withdrew ${amount.toFixed(2)} from your account.`,
          type: "success",
        });
        setAmount(0); // Reset amount field
      } else {
        throw new Error("Failed to update account data");
      }
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      setMessage({
        text: error instanceof Error ? error.message : "Error withdrawing funds from account. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAction === "deposit") {
      handleDeposit();
    } else {
      handleWithdraw();
    }
  };

  return (
    <div className="bg-white text-black rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Wallet Management</h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Account Information</h3>
        <p className="text-sm text-gray-600">
          Account ID: <span className="font-medium">{currentAccount.id.substring(0, 8)}...</span>
        </p>
        <p className="text-lg mt-2">
          Current Balance: <span className="font-bold text-green-600">${currentAccount.wallet.toFixed(2)}</span>
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6">
        <div className="flex border border-gray-300 rounded-md overflow-hidden mb-4">
          <button
            type="button"
            className={`flex-1 py-2 text-center ${activeAction === "deposit" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveAction("deposit")}
            disabled={loading}
          >
            Deposit
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-center ${activeAction === "withdraw" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveAction("withdraw")}
            disabled={loading}
          >
            Withdraw
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {activeAction === "deposit" ? "Deposit" : "Withdrawal"} Amount
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="amount"
                min="0.01"
                step="0.01"
                className="pl-7 block w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={loading}
              />
            </div>
            {activeAction === "withdraw" && (
              <p className="mt-2 text-sm text-gray-500">
                Maximum withdrawal: ${currentAccount.wallet.toFixed(2)}
              </p>
            )}
          </div>

          <button
            type="submit"
            className={`w-full p-3 ${activeAction === "deposit" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"} text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading
              ? activeAction === "deposit"
                ? "Processing Deposit..."
                : "Processing Withdrawal..."
              : activeAction === "deposit"
              ? "Deposit Funds"
              : "Withdraw Funds"}
          </button>
        </form>
      </div>
    </div>
  );
}
