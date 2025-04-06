// src/components/ReviewDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { env } from "../lib/env";

interface Order {
  id: string;
  accountId: string;
  sku: string;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  status: string;
  policyTriggered?: boolean; // Flag to indicate if this order was flagged by our policies
  error?: string;
}

interface Stats {
  totalOrders: number;
  totalAmountPaid: number;
}

export default function ReviewDashboard() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch pending orders
      const ordersResponse = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/orders/pending`,
      );
      if (!ordersResponse.ok) {
        throw new Error(
          `Error fetching pending orders: ${ordersResponse.status}`,
        );
      }
      const ordersData = await ordersResponse.json();
      setPendingOrders(ordersData);

      // Fetch overall stats
      const statsResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/stats`);
      if (!statsResponse.ok) {
        throw new Error(`Error fetching stats: ${statsResponse.status}`);
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch agent status
      const statusResponse = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/agent/status`,
      );
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAgentRunning(statusData.running);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        "Failed to fetch dashboard data. Please ensure the agent server is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();

    // Set up polling to refresh data every 5 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Function to approve an order
  const approveOrder = async (orderId: string) => {
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/order/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: "Order approved successfully",
          type: "success",
        });

        // Remove the approved order from the list
        setPendingOrders((prevOrders) =>
          prevOrders.filter((order) => order.id !== orderId),
        );

        // Refresh dashboard data
        fetchDashboardData();
      } else {
        setMessage({
          text: data.error || "Error approving order",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error approving order:", error);
      setMessage({
        text: "Network error. Please try again.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Function to toggle the autonomous agent
  const toggleAgent = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const url = agentRunning
        ? `${env.NEXT_PUBLIC_API_URL}/api/agent/stop`
        : `${env.NEXT_PUBLIC_API_URL}/api/agent/start`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: agentRunning
            ? "Agent stopped successfully"
            : "Agent started successfully",
          type: "success",
        });

        setAgentRunning(!agentRunning);

        // Refresh dashboard data after a brief delay
        setTimeout(() => fetchDashboardData(), 1000);
      } else {
        setMessage({
          text: data.error || "Error toggling agent",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error toggling agent:", error);
      setMessage({
        text: "Network error. Please try again.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && pendingOrders.length === 0 && !stats) {
    return <div className="p-4 text-center">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500">{error}</div>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => fetchDashboardData()}
        >
          Retry
        </button>
      </div>
    );
  }

  const totalPendingAmount = pendingOrders.reduce(
    (sum, order) => sum + order.totalPrice,
    0,
  );

  return (
    <div className="bg-white text-black rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Review Dashboard</h2>
        <button
          className={`px-4 py-2 rounded text-white ${
            agentRunning
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } ${actionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={toggleAgent}
          disabled={actionLoading}
        >
          {agentRunning ? "Stop Agent" : "Start Agent"}
        </button>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-800">Pending Orders</h3>
          <p className="text-2xl font-bold">{pendingOrders.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-green-800">Pending Amount</h3>
          <p className="text-2xl font-bold">${totalPendingAmount.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-purple-800">Agent Status</h3>
          <p
            className={`text-xl font-bold ${
              agentRunning ? "text-green-600" : "text-red-600"
            }`}
          >
            {agentRunning ? "Running" : "Stopped"}
          </p>
        </div>
      </div>

      {stats && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium mb-2">Overall Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black">Total Delivered Orders</p>
              <p className="text-xl font-bold">{stats.totalOrders}</p>
            </div>
            <div>
              <p className="text-sm text-black">Total Amount Paid</p>
              <p className="text-xl font-bold">
                ${stats.totalAmountPaid.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-medium mb-2">Pending Orders</h3>

      {pendingOrders.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg text-center text-black">
          No pending orders found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {order.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    ${order.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-blue-600 hover:text-blue-900 disabled:text-blue-300 disabled:cursor-not-allowed"
                      onClick={() => approveOrder(order.id)}
                      disabled={actionLoading}
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
