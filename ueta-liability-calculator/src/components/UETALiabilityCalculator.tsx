import { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface Mitigation {
  name: string;
  discount: number; // discount factor (e.g., 0.05 for 5% reduction)
  checked: boolean;
}

export const UetaLiabilityCalculator = () => {
  // Inputs using sliders:
  const [transactionsPerMonth, setTransactionsPerMonth] = useState(10000);
  const [agentHandledPercentage, setAgentHandledPercentage] = useState(50);
  const [errorRate, setErrorRate] = useState(1);
  const [claimProbability, setClaimProbability] = useState(20);
  const [averageTransactionValue, setAverageTransactionValue] = useState(100);
  const [averageClaimCost, setAverageClaimCost] = useState(200);

  // Mitigation strategies: each gives a discount on the liability.
  const [mitigations, setMitigations] = useState<Mitigation[]>([
    { name: "Logging & Audit Trails", discount: 0.05, checked: false },
    { name: "Automated Error Handling", discount: 0.1, checked: false },
    { name: "Agent Training", discount: 0.07, checked: false },
    { name: "Explicit Agent Authority Terms", discount: 0.08, checked: false },
    { name: "Encryption & Security", discount: 0.05, checked: false },
  ]);

  // Calculation logic for base liability given a number of transactions
  const calculateLiability = (transPerMonth: number) => {
    const effectiveTransactions =
      (transPerMonth * agentHandledPercentage) / 100;
    const expectedErrors = (effectiveTransactions * errorRate) / 100;
    const expectedClaims = (expectedErrors * claimProbability) / 100;
    return expectedClaims * averageClaimCost;
  };

  // Calculate revenue based on transactions
  const calculateRevenue = (transPerMonth: number) => {
    return transPerMonth * averageTransactionValue;
  };

  // Calculate liability as a percentage of revenue
  const calculateLiabilityPercentage = (transPerMonth: number) => {
    const revenue = calculateRevenue(transPerMonth);
    const liability = calculateLiability(transPerMonth) * (1 - cappedDiscount);
    return revenue > 0 ? (liability / revenue) * 100 : 0;
  };

  const baseMonthlyLiability = calculateLiability(transactionsPerMonth);
  const monthlyRevenue = calculateRevenue(transactionsPerMonth);

  // Sum the discount factors of all checked mitigations.
  const totalDiscount = mitigations.reduce(
    (acc, m) => (m.checked ? acc + m.discount : acc),
    0,
  );
  // Cap total discount at 50%
  const cappedDiscount = Math.min(totalDiscount, 0.5);
  const adjustedMonthlyLiability = baseMonthlyLiability * (1 - cappedDiscount);
  const annualLiability = adjustedMonthlyLiability * 12;
  const liabilityPercentage =
    calculateLiabilityPercentage(transactionsPerMonth);

  // Handler for mitigation checkboxes
  const handleMitigationChange = (index: number) => {
    const newMitigations = [...mitigations];
    newMitigations[index].checked = !newMitigations[index].checked;
    setMitigations(newMitigations);
  };

  // CSV Export function
  const exportCSV = () => {
    const headers = [
      "Transactions per Month",
      "Agent-Handled Percentage (%)",
      "Error Rate (%)",
      "Claim Probability (%)",
      "Average Transaction Value ($)",
      "Average Claim Cost ($)",
      "Monthly Revenue ($)",
      "Total Discount (%)",
      "Monthly Liability ($)",
      "Annual Liability ($)",
      "Liability as % of Revenue",
    ];
    const rows = [
      [
        transactionsPerMonth,
        agentHandledPercentage,
        errorRate,
        claimProbability,
        averageTransactionValue,
        averageClaimCost,
        monthlyRevenue.toFixed(2),
        (cappedDiscount * 100).toFixed(2),
        adjustedMonthlyLiability.toFixed(2),
        annualLiability.toFixed(2),
        liabilityPercentage.toFixed(2),
      ],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ueta_liability_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export function using jsPDF and autotable.
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("UETA Liability Report", 14, 20);
    const tableColumn = ["Parameter", "Value"];
    const tableRows = [
      ["Transactions per Month", transactionsPerMonth.toLocaleString()],
      ["Agent-Handled Percentage (%)", agentHandledPercentage],
      ["Error Rate (%)", errorRate],
      ["Claim Probability (%)", claimProbability],
      ["Average Transaction Value ($)", averageTransactionValue],
      ["Average Claim Cost ($)", averageClaimCost],
      [
        "Monthly Liability ($)",
        adjustedMonthlyLiability.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ],
      [
        "Annual Liability ($)",
        annualLiability.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ],
      ["Liability as % of Revenue", liabilityPercentage.toFixed(2) + "%"],
    ];

    (doc as any).autoTable(tableColumn, tableRows, { startY: 30 });
    doc.save("ueta_liability_report.pdf");
  };

  // Generate data for the graph (varying transactions per month)
  const minTransactions = 1000;
  const maxTransactions = 1000000;
  const steps = 10;
  const transactionValues = Array.from({ length: steps }, (_, i) =>
    Math.round(
      minTransactions + (i * (maxTransactions - minTransactions)) / (steps - 1),
    ),
  );
  const liabilityData = transactionValues.map(
    (val) => calculateLiability(val) * (1 - cappedDiscount),
  );
  const liabilityPercentageData = transactionValues.map((val) =>
    calculateLiabilityPercentage(val),
  );

  const chartData = {
    labels: transactionValues.map((val) => val.toLocaleString()),
    datasets: [
      {
        label: "Monthly Liability ($)",
        data: liabilityData,
        fill: false,
        borderColor: "#EF4444", // Red
        backgroundColor: "#FCA5A5",
        borderWidth: 2,
        pointBackgroundColor: "#EF4444",
        pointRadius: 4,
        yAxisID: "y",
      },
      {
        label: "Liability as % of Revenue",
        data: liabilityPercentageData,
        fill: false,
        borderColor: "#8B5CF6", // Purple
        backgroundColor: "#C4B5FD",
        borderWidth: 2,
        pointBackgroundColor: "#8B5CF6",
        pointRadius: 4,
        yAxisID: "y1",
      },
    ],
  };

  // Updated chart options for better readability
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Liability Projection by Transaction Volume",
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              if (context.dataset.yAxisID === "y") {
                label += new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(context.parsed.y);
              } else {
                label += context.parsed.y.toFixed(2) + "%";
              }
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Transactions per Month",
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: "Liability ($)",
        },
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "$" + value.toLocaleString();
          },
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: "Liability as % of Revenue",
        },
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return value.toFixed(1) + "%";
          },
        },
      },
    },
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: "24px",
        }}
      >
        UETA Agent Liability Calculator
      </h1>
      This is for demonstration purposes only. Do not make any financial
      decisions based on this calculator.
      {/* Two-column layout with direct styles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Left column - Inputs */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Input Parameters
          </h2>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Transactions per Month */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <label style={{ fontWeight: "500" }}>
                  Transactions per Month
                </label>
                <span style={{ fontWeight: "600" }}>
                  {transactionsPerMonth.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="1000000"
                step="1000"
                value={transactionsPerMonth}
                onChange={(e) =>
                  setTransactionsPerMonth(Number(e.target.value))
                }
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#6B7280",
                }}
              >
                <span>1,000</span>
                <span>1,000,000</span>
              </div>
            </div>

            {/* Agent-Handled Percentage */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <label style={{ fontWeight: "500" }}>
                  Agent-Handled Percentage
                </label>
                <span style={{ fontWeight: "600" }}>
                  {agentHandledPercentage}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={agentHandledPercentage}
                onChange={(e) =>
                  setAgentHandledPercentage(Number(e.target.value))
                }
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#6B7280",
                }}
              >
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Error Rate */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <label style={{ fontWeight: "500" }}>Error Rate</label>
                <span style={{ fontWeight: "600" }}>{errorRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={errorRate}
                onChange={(e) => setErrorRate(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#6B7280",
                }}
              >
                <span>0%</span>
                <span>10%</span>
              </div>
            </div>

            {/* Claim Probability */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <label style={{ fontWeight: "500" }}>Claim Probability</label>
                <span style={{ fontWeight: "600" }}>{claimProbability}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={claimProbability}
                onChange={(e) => setClaimProbability(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#6B7280",
                }}
              >
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Average Transaction Value */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <label style={{ fontWeight: "500" }}>
                  Average Transaction Value
                </label>
                <span style={{ fontWeight: "600" }}>
                  ${averageTransactionValue}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={averageTransactionValue}
                onChange={(e) =>
                  setAverageTransactionValue(Number(e.target.value))
                }
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#6B7280",
                }}
              >
                <span>$10</span>
                <span>$1,000</span>
              </div>
            </div>

            {/* Average Claim Cost */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <label style={{ fontWeight: "500" }}>Average Claim Cost</label>
                <span style={{ fontWeight: "600" }}>${averageClaimCost}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="50"
                value={averageClaimCost}
                onChange={(e) => setAverageClaimCost(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#6B7280",
                }}
              >
                <span>$0</span>
                <span>$5,000</span>
              </div>
            </div>
          </div>

          {/* Mitigation Strategies */}
          <div style={{ marginTop: "24px" }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "12px",
              }}
            >
              Mitigation Strategies
            </h3>
            <div
              style={{
                backgroundColor: "#F9FAFB",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              {mitigations.map((mitigation, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom:
                      index < mitigations.length - 1
                        ? "1px solid #E5E7EB"
                        : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={mitigation.checked}
                      onChange={() => handleMitigationChange(index)}
                      style={{ marginRight: "8px" }}
                    />
                    <label>{mitigation.name}</label>
                  </div>
                  <span style={{ color: "#2563EB", fontSize: "14px" }}>
                    {(mitigation.discount * 100).toFixed(0)}% reduction
                  </span>
                </div>
              ))}
              <p
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginTop: "12px",
                  fontStyle: "italic",
                }}
              >
                Total mitigation discount is capped at 50%
              </p>
            </div>
          </div>

          {/* Results */}
          <div
            style={{
              marginTop: "24px",
              backgroundColor: "#EFF6FF",
              padding: "16px",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "12px",
              }}
            >
              Results
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ fontSize: "12px", color: "#6B7280" }}>
                  Monthly Liability
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#DC2626",
                  }}
                >
                  $
                  {adjustedMonthlyLiability.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ fontSize: "12px", color: "#6B7280" }}>
                  Annual Liability
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#DC2626",
                  }}
                >
                  $
                  {annualLiability.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "12px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  gridColumn: "span 2",
                }}
              >
                <div style={{ fontSize: "12px", color: "#6B7280" }}>
                  Liability as % of Revenue
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#8B5CF6",
                  }}
                >
                  {liabilityPercentage.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div style={{ marginTop: "24px", display: "flex", gap: "16px" }}>
            <button
              onClick={exportCSV}
              style={{
                flex: 1,
                padding: "8px 0",
                backgroundColor: "#2563EB",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Export CSV
            </button>
            <button
              onClick={exportPDF}
              style={{
                flex: 1,
                padding: "8px 0",
                backgroundColor: "#059669",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Right column - Graph */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Liability Projection
          </h2>
          <div style={{ height: "500px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
          This is for demonstration purposes. Do not make any financial
          decisions on this.
        </div>
      </div>
    </div>
  );
};
