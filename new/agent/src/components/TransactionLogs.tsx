// src/components/TransactionLogs.tsx
"use client";

import { useState, useEffect } from "react";
import { env } from "../lib/env";

interface LogEntry {
  timestamp: string;
  message: string;
}

export default function TransactionLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);

  // Function to fetch transaction logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/logs`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      // Sort logs by timestamp, newest first
      const sortedLogs = data.sort(
        (a: LogEntry, b: LogEntry) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setLogs(sortedLogs);
      setError(null);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError(
        "Failed to fetch transaction logs. Please ensure the agent server is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and set up polling if autoRefresh is enabled
  useEffect(() => {
    fetchLogs();

    let interval: NodeJS.Timeout | null = null;

    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs();
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Filter logs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLogs(logs);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = logs.filter(
      (log) =>
        log.message.toLowerCase().includes(term) ||
        log.timestamp.toLowerCase().includes(term),
    );

    setFilteredLogs(filtered);
  }, [logs, searchTerm]);

  // Format datetime for display
  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(date);
    } catch (e) {
      return timestamp;
    }
  };

  // Format log message for display
  const formatLogMessage = (message: string) => {
    // Highlight JSON objects
    if (message.includes("{") && message.includes("}")) {
      try {
        // Find JSON strings within the message
        const jsonRegex = /{.*?}/g;
        const matches = message.match(jsonRegex);

        if (matches) {
          let formattedMessage = message;

          matches.forEach((match) => {
            try {
              // Parse and stringify the JSON to ensure it's valid and properly formatted
              const json = JSON.parse(match);
              const formattedJson = JSON.stringify(json, null, 0); // Compact JSON

              // Replace the original JSON string with a highlighted version
              formattedMessage = formattedMessage.replace(
                match,
                `<span class="text-blue-600 font-mono">${formattedJson}</span>`,
              );
            } catch (e) {
              // If parsing fails, just leave the original text
            }
          });

          return <div dangerouslySetInnerHTML={{ __html: formattedMessage }} />;
        }
      } catch (e) {
        // If any error in processing, return the original message
      }
    }

    // Highlight keywords
    const keywords: Record<string, string> = {
      created: "text-green-600 font-medium",
      placed: "text-blue-600 font-medium",
      approved: "text-purple-600 font-medium",
      failed: "text-red-600 font-medium",
      error: "text-red-600 font-medium",
      updated: "text-yellow-600 font-medium",
      started: "text-green-600 font-medium",
      stopped: "text-red-600 font-medium",
    };

    let formattedMessage = message;

    Object.keys(keywords).forEach((keyword) => {
      const regex = new RegExp(keyword, "gi");
      formattedMessage = formattedMessage.replace(
        regex,
        `<span class="${keywords[keyword]}">${keyword}</span>`,
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: formattedMessage }} />;
  };

  if (loading && logs.length === 0) {
    return <div className="p-4 text-center">Loading transaction logs...</div>;
  }

  return (
    <div className="bg-white text-black rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Transaction Logs</h2>
        <div className="flex items-center">
          <label className="flex items-center mr-4 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
            />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={fetchLogs}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error ? (
        <div className="p-4 text-center">
          <div className="text-red-500">{error}</div>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={fetchLogs}
          >
            Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
          No transaction logs found
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[600px] border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(searchTerm ? filteredLogs : logs).map((log, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatLogMessage(log.message)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Showing {searchTerm ? filteredLogs.length : logs.length} logs{" "}
        {searchTerm && `(filtered from ${logs.length})`}
      </div>
    </div>
  );
}
