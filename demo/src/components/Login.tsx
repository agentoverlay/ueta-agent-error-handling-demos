// src/components/Login.tsx
"use client";

import { useState } from "react";
import { env } from "../lib/env";

interface LoginProps {
  onAccountCreated: (account: { id: string; wallet: number }) => void;
}

export default function Login({ onAccountCreated }: LoginProps) {
  const [deposit, setDeposit] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deposit }),
      });

      const data = await response.json();

      if (response.ok) {
        onAccountCreated(data.account);
      } else {
        setError(data.error || "Error creating account");
      }
    } catch (error) {
      setError("Network error. Please ensure the API server is running.");
      console.error("Error creating account:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-black flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to UETA Agent
          </h1>
          <p className="mt-2 text-gray-600">Create an account to get started</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label
            htmlFor="deposit"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Initial Deposit Amount
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="deposit"
              min="1"
              max="1000"
              className="pl-7 block w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              disabled={loading}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Initial balance cannot exceed $1000
          </p>
        </div>

        <button
          className={`w-full p-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
          onClick={handleCreateAccount}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </div>
    </div>
  );
}
