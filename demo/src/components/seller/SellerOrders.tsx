// src/components/seller/SellerOrders.tsx
"use client";

import { useState, useEffect } from "react";
import { env } from "../../lib/env";

interface Order {
  id: string;
  accountId: string;
  sku: string;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  status: string;
  error?: string;
}

export default function SellerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Function to fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const ordersResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/seller/orders`);
      if (!ordersResponse.ok) {
        throw new Error(`Error fetching orders: ${ordersResponse.status}`);
      }
      const ordersData = await ordersResponse.json();
      setOrders(ordersData);
      filterOrders(activeFilter, ordersData);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders. Please ensure the seller server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on selected filter
  const filterOrders = (filter: string, orderList = orders) => {
    setActiveFilter(filter);
    if (filter === "all") {
      setFilteredOrders(orderList);
    } else {
      setFilteredOrders(orderList.filter(order => order.status === filter));
    }
  };

  // Approve an order
  const approveOrder = async (orderId: string) => {
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/seller/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: "Order approved successfully",
          type: "success",
        });
        fetchOrders(); // Refresh orders after approval
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

  // Reject an order
  const rejectOrder = async (orderId: string) => {
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/seller/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: "Order rejected successfully",
          type: "success",
        });
        fetchOrders(); // Refresh orders after rejection
      } else {
        setMessage({
          text: data.error || "Error rejecting order",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
      setMessage({
        text: "Network error. Please try again.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();

    // Set up polling to refresh data every 5 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading && orders.length === 0) {
    return <div className="p-4 text-center">Loading orders...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500">{error}</div>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => fetchOrders()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white text-black rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => fetchOrders()}
          disabled={actionLoading}
        >
          Refresh Orders
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

      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => filterOrders("all")}
            className={`px-3 py-1 rounded ${
              activeFilter === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => filterOrders("received")}
            className={`px-3 py-1 rounded ${
              activeFilter === "received"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Received
          </button>
          <button
            onClick={() => filterOrders("pending_confirmation")}
            className={`px-3 py-1 rounded ${
              activeFilter === "pending_confirmation"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => filterOrders("delivered")}
            className={`px-3 py-1 rounded ${
              activeFilter === "delivered"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Delivered
          </button>
          <button
            onClick={() => filterOrders("error")}
            className={`px-3 py-1 rounded ${
              activeFilter === "error"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Error
          </button>
          <button
            onClick={() => filterOrders("reverted")}
            className={`px-3 py-1 rounded ${
              activeFilter === "reverted"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Reverted
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-500">No orders found with the selected filter</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.accountId.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.totalPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.orderDate).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                        order.status === 'pending_confirmation' ? 'bg-yellow-100 text-yellow-800' : 
                        order.status === 'error' ? 'bg-red-100 text-red-800' : 
                        order.status === 'reverted' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {order.status === 'pending_confirmation' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => approveOrder(order.id)}
                          disabled={actionLoading}
                          className="text-green-600 hover:text-green-900 disabled:text-green-300 disabled:cursor-not-allowed"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectOrder(order.id)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-900 disabled:text-red-300 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {order.status === 'error' && (
                      <button
                        onClick={() => rejectOrder(order.id)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-900 disabled:text-red-300 disabled:cursor-not-allowed"
                      >
                        Revert
                      </button>
                    )}
                    {(order.status === 'delivered' || order.status === 'reverted') && (
                      <span className="text-gray-400">No actions</span>
                    )}
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
