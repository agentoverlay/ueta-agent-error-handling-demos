// src/components/seller/SellerDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { env } from "../../lib/env";

interface SellerStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  errorOrders: number;
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats from seller service
      const statsResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/seller/stats`);
      if (!statsResponse.ok) {
        throw new Error(`Error fetching stats: ${statsResponse.status}`);
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent orders
      const ordersResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/seller/orders`);
      if (!ordersResponse.ok) {
        throw new Error(`Error fetching orders: ${ordersResponse.status}`);
      }
      const ordersData = await ordersResponse.json();
      
      // Sort by orderDate desc and take the 5 most recent
      const sortedOrders = ordersData.sort((a: any, b: any) => 
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      ).slice(0, 5);
      
      setRecentOrders(sortedOrders);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to fetch dashboard data. Please ensure the seller server is running.");
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

  if (loading && !stats) {
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

  return (
    <div className="bg-white text-black rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Seller Dashboard</h2>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => fetchDashboardData()}
        >
          Refresh Data
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800">Total Orders</h3>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-green-800">Total Revenue</h3>
            <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-yellow-800">Pending Orders</h3>
            <p className="text-2xl font-bold">{stats.pendingOrders}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-red-800">Error Orders</h3>
            <p className="text-2xl font-bold">{stats.errorOrders}</p>
          </div>
        </div>
      )}

      <h3 className="text-lg font-medium mb-4">Recent Orders</h3>
      
      {recentOrders.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-500">No recent orders found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.id.substring(0, 8)}...</td>
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
                        'bg-gray-100 text-gray-800'}`}>
                      {order.status}
                    </span>
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
