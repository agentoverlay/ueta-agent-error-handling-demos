// src/components/seller/SellerPolicies.tsx
"use client";

import { useState, useEffect } from "react";
import { env } from "../../lib/env";

interface SellerPolicy {
  id: string;
  name: string;
  description?: string;
  type: "auto_approve" | "auto_reject" | "manual_review";
  condition: {
    field: "total_price" | "quantity" | "sku" | "account_id";
    operator: ">" | "<" | "=" | "!=" | "contains";
    value: string | number;
  };
  enabled: boolean;
  createdAt: string;
}

export default function SellerPolicies() {
  const [policies, setPolicies] = useState<SellerPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Form state
  const [formState, setFormState] = useState<{
    name: string;
    description: string;
    type: "auto_approve" | "auto_reject" | "manual_review";
    condition: {
      field: "total_price" | "quantity" | "sku" | "account_id";
      operator: ">" | "<" | "=" | "!=" | "contains";
      value: string | number;
    };
    enabled: boolean;
  }>({
    name: "",
    description: "",
    type: "manual_review",
    condition: {
      field: "total_price",
      operator: ">",
      value: ""
    },
    enabled: true,
  });

  // Fetch policies
  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/seller/policies`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setPolicies(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching policies:", err);
      setError(
        "Failed to fetch policies. Please ensure the seller server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPolicies();
  }, []);

  // Reset form state
  const resetForm = () => {
    setFormState({
      name: "",
      description: "",
      type: "manual_review",
      condition: {
        field: "total_price",
        operator: ">",
        value: ""
      },
      enabled: true,
    });
  };

  // Format policy field for display
  const formatField = (field: string): string => {
    switch (field) {
      case "total_price":
        return "Total Price";
      case "quantity":
        return "Quantity";
      case "sku":
        return "Product SKU";
      case "account_id":
        return "Account ID";
      default:
        return field;
    }
  };

  // Format policy type for display
  const formatType = (type: string): string => {
    switch (type) {
      case "auto_approve":
        return "Auto Approve";
      case "auto_reject":
        return "Auto Reject";
      case "manual_review":
        return "Manual Review";
      default:
        return type;
    }
  };

  // Format policy value for display
  const formatValue = (
    value: string | number,
    field: string,
  ): string => {
    if (field === "total_price") {
      return `$${value}`;
    }
    return String(value);
  };

  // Handle edit policy
  const handleEditPolicy = (policy: SellerPolicy) => {
    setIsEditing(policy.id);
    setIsCreating(false);
    setFormState({
      name: policy.name,
      description: policy.description || "",
      type: policy.type,
      condition: {
        field: policy.condition.field,
        operator: policy.condition.operator,
        value: policy.condition.value
      },
      enabled: policy.enabled,
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      // Validate the form
      if (!formState.name.trim()) {
        setMessage({ type: "error", text: "Policy name is required" });
        setActionLoading(false);
        return;
      }

      if (formState.condition.value === "") {
        setMessage({ type: "error", text: "Condition value is required" });
        setActionLoading(false);
        return;
      }

      // Process value based on field
      let processedValue: string | number = formState.condition.value;

      // For numeric fields, convert to number
      if (
        formState.condition.field === "total_price" ||
        formState.condition.field === "quantity"
      ) {
        const numValue = Number(processedValue);
        if (isNaN(numValue)) {
          setMessage({ type: "error", text: "Please enter a valid number" });
          setActionLoading(false);
          return;
        }
        processedValue = numValue;
      }

      const payload = {
        name: formState.name,
        description: formState.description,
        type: formState.type,
        condition: {
          field: formState.condition.field,
          operator: formState.condition.operator,
          value: processedValue
        },
        enabled: formState.enabled,
      };

      let response;

      if (isEditing) {
        // Update existing policy
        response = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/api/seller/policies/${isEditing}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );
      } else {
        // Create new policy
        response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/seller/policies`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error saving policy");
      }

      const result = await response.json();

      setMessage({
        type: "success",
        text: isEditing
          ? "Policy updated successfully"
          : "Policy created successfully",
      });

      // Reset form and states
      resetForm();
      setIsCreating(false);
      setIsEditing(null);

      // Refresh policies
      fetchPolicies();
    } catch (error) {
      console.error("Error saving policy:", error);
      setMessage({
        type: "error",
        text: String(error),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete policy
  const handleDeletePolicy = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) {
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/seller/policies/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error deleting policy");
      }

      setMessage({ type: "success", text: "Policy deleted successfully" });

      // Refresh policies
      fetchPolicies();

      // Reset form if editing the deleted policy
      if (isEditing === id) {
        resetForm();
        setIsEditing(null);
      }
    } catch (error) {
      console.error("Error deleting policy:", error);
      setMessage({
        type: "error",
        text: String(error),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle toggle policy enabled state
  const handleToggleEnabled = async (policy: SellerPolicy) => {
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/seller/policies/${policy.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: !policy.enabled,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error updating policy");
      }

      setMessage({
        type: "success",
        text: `Policy ${policy.enabled ? "disabled" : "enabled"} successfully`,
      });

      // Refresh policies
      fetchPolicies();
    } catch (error) {
      console.error("Error toggling policy:", error);
      setMessage({
        type: "error",
        text: String(error),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    
    // Handle nested condition fields
    if (name.startsWith("condition.")) {
      const conditionField = name.split(".")[1];
      setFormState((prev) => ({
        ...prev,
        condition: {
          ...prev.condition,
          [conditionField]: value
        }
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  if (loading && policies.length === 0) {
    return <div className="p-4 text-center">Loading policies...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500">{error}</div>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => fetchPolicies()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white text-black rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Seller Policies</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define automated rules for handling orders from purchasing agents.
          </p>
        </div>
        {!isCreating && !isEditing && (
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => {
              resetForm();
              setIsCreating(true);
              setIsEditing(null);
            }}
          >
            Create New Policy
          </button>
        )}
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

      {/* Policy Form */}
      {(isCreating || isEditing) && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium mb-3">
            {isEditing ? "Edit Policy" : "Create New Policy"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Policy Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formState.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formState.description}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Policy Type *
              </label>
              <select
                id="type"
                name="type"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formState.type}
                onChange={handleInputChange}
              >
                <option value="manual_review">Manual Review</option>
                <option value="auto_approve">Auto Approve</option>
                <option value="auto_reject">Auto Reject</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formState.type === "manual_review" 
                  ? "Orders matching this policy will require manual review by a seller" 
                  : formState.type === "auto_approve" 
                  ? "Orders matching this policy will be automatically approved" 
                  : "Orders matching this policy will be automatically rejected"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label
                  htmlFor="condition.field"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Condition Field *
                </label>
                <select
                  id="condition.field"
                  name="condition.field"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formState.condition.field}
                  onChange={handleInputChange}
                >
                  <option value="total_price">Total Price</option>
                  <option value="quantity">Quantity</option>
                  <option value="sku">Product SKU</option>
                  <option value="account_id">Account ID</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="condition.operator"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Operator *
                </label>
                <select
                  id="condition.operator"
                  name="condition.operator"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formState.condition.operator}
                  onChange={handleInputChange}
                >
                  <option value=">">Greater Than (&gt;)</option>
                  <option value="<">Less Than (&lt;)</option>
                  <option value="=">Equal To (=)</option>
                  <option value="!=">Not Equal To (!=)</option>
                  {(formState.condition.field === "sku" || formState.condition.field === "account_id") && (
                    <option value="contains">Contains</option>
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="condition.value"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Value *
                </label>
                <input
                  type={
                    formState.condition.field === "total_price" || formState.condition.field === "quantity"
                      ? "number"
                      : "text"
                  }
                  id="condition.value"
                  name="condition.value"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formState.condition.value}
                  onChange={handleInputChange}
                  required
                />
                {formState.condition.field === "total_price" && (
                  <span className="text-xs text-gray-500">
                    Enter dollar amount (e.g., 100 for $100)
                  </span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formState.enabled}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Policy enabled
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => {
                  resetForm();
                  setIsCreating(false);
                  setIsEditing(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : "Save Policy"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policies List */}
      {!policies.length ? (
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-gray-500">
            No seller policies found. Create your first policy to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {policy.name}
                    </div>
                    {policy.description && (
                      <div className="text-xs text-gray-500">
                        {policy.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${policy.type === 'auto_approve' ? 'bg-green-100 text-green-800' : 
                        policy.type === 'auto_reject' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {formatType(policy.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatField(policy.condition.field)} {policy.condition.operator}{" "}
                    {formatValue(policy.condition.value, policy.condition.field)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        policy.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {policy.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={() => handleEditPolicy(policy)}
                        disabled={actionLoading}
                      >
                        Edit
                      </button>
                      <button
                        className={`${
                          policy.enabled
                            ? "text-amber-600 hover:text-amber-900"
                            : "text-green-600 hover:text-green-900"
                        }`}
                        onClick={() => handleToggleEnabled(policy)}
                        disabled={actionLoading}
                      >
                        {policy.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeletePolicy(policy.id)}
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </div>
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
