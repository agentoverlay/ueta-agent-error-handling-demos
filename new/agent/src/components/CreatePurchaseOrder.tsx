// src/components/CreatePurchaseOrder.tsx
"use client";

import { useState, useEffect } from "react";
import { env } from "../lib/env";

interface Product {
  sku: string;
  description: string;
  price: number;
}

interface Account {
  id: string;
  wallet: number;
}

interface CreatePurchaseOrderProps {
  currentAccount: Account | null;
  onAccountUpdated: (account: Account) => void;
}

export default function CreatePurchaseOrder({
  currentAccount,
  onAccountUpdated,
}: CreatePurchaseOrderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "";
  } | null>(null);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch products
        const productsResponse = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/api/products`,
        );
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
          if (productsData.length > 0) {
            setSelectedSku(productsData[0].sku);
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setMessage({
          text: "Error loading products. Please make sure the agent server is running.",
          type: "error",
        });
      }
    };

    fetchProducts();
  }, []);

  // Calculate the total cost based on selected product and quantity
  const calculateTotalCost = (): number => {
    const selectedProduct = products.find((p) => p.sku === selectedSku);
    if (!selectedProduct) return 0;
    return selectedProduct.price * quantity;
  };

  const totalCost = calculateTotalCost();

  // Handle form submission to place an order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSku || quantity <= 0) {
      setMessage({
        text: "Please select a product and enter a valid quantity.",
        type: "error",
      });
      return;
    }

    if (!currentAccount) {
      setMessage({
        text: "No account found. Please create an account first.",
        type: "error",
      });
      return;
    }

    if (currentAccount.wallet < totalCost) {
      setMessage({
        text: `Insufficient funds. Wallet: $${currentAccount.wallet.toFixed(
          2,
        )}, Order cost: $${totalCost.toFixed(2)}`,
        type: "error",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: selectedSku,
          quantity,
          agentMode: isAgentMode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the account balance
        if (data.walletBalance !== undefined) {
          onAccountUpdated({
            ...currentAccount,
            wallet: data.walletBalance,
          });
        }

        setMessage({
          text: "Order placed successfully!",
          type: "success",
        });

        // Reset form
        setQuantity(1);
        setIsAgentMode(false);
      } else {
        setMessage({
          text: data.error || "Error placing order",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error placing order:", error);
      setMessage({
        text: "Network error. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-black rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Create Purchase Order</h2>

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

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="product"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Product
          </label>
          <select
            id="product"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            disabled={loading || products.length === 0}
          >
            {products.length === 0 ? (
              <option value="">No products available</option>
            ) : (
              products.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.description} (${product.price.toFixed(2)})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mb-4">
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isAgentMode}
              onChange={(e) => setIsAgentMode(e.target.checked)}
              disabled={loading}
            />
            <span className="ml-2 text-sm text-gray-700">
              Place order as agent (may require approval)
            </span>
          </label>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="font-medium">
            Total Cost:{" "}
            <span className="text-blue-600">${totalCost.toFixed(2)}</span>
          </p>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
          disabled={loading || !currentAccount || products.length === 0}
        >
          {loading ? "Placing Order..." : "Place Order"}
        </button>
      </form>
    </div>
  );
}
