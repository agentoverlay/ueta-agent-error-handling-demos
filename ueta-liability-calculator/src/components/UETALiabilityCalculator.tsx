import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Mitigation {
  name: string;
  discount: number; // discount factor (e.g., 0.05 for 5% reduction)
  checked: boolean;
}

export const UetaLiabilityCalculator = () => {
  // Inputs using sliders:
  const [transactionsPerMonth, setTransactionsPerMonth] = useState(1000);
  const [agentHandledPercentage, setAgentHandledPercentage] = useState(50);
  const [errorRate, setErrorRate] = useState(1);
  const [claimProbability, setClaimProbability] = useState(20);
  const [averageTransactionValue, setAverageTransactionValue] = useState(100);
  const [averageClaimCost, setAverageClaimCost] = useState(200);
  const [legalDefenseCost, setLegalDefenseCost] = useState(500);

  // Mitigation strategies: each gives a discount on the liability.
  const [mitigations, setMitigations] = useState<Mitigation[]>([
    { name: 'Logging & Audit Trails', discount: 0.05, checked: false },
    { name: 'Automated Error Handling', discount: 0.10, checked: false },
    { name: 'Agent Training', discount: 0.07, checked: false },
    { name: 'Explicit Agent Authority Terms', discount: 0.08, checked: false },
    { name: 'Encryption & Security', discount: 0.05, checked: false },
  ]);

  // Calculation logic for base liability given a number of transactions
  const calculateLiability = (transPerMonth: number) => {
    const effectiveTransactions = (transPerMonth * agentHandledPercentage) / 100;
    const expectedErrors = (effectiveTransactions * errorRate) / 100;
    const expectedClaims = (expectedErrors * claimProbability) / 100;
    const costPerClaim = averageClaimCost + legalDefenseCost;
    return expectedClaims * costPerClaim;
  };

  const baseMonthlyLiability = calculateLiability(transactionsPerMonth);

  // Sum the discount factors of all checked mitigations.
  const totalDiscount = mitigations.reduce(
    (acc, m) => (m.checked ? acc + m.discount : acc),
    0
  );
  // Cap total discount at 50%
  const cappedDiscount = Math.min(totalDiscount, 0.5);
  const adjustedMonthlyLiability = baseMonthlyLiability * (1 - cappedDiscount);
  const annualLiability = adjustedMonthlyLiability * 12;

  // Handler for mitigation checkboxes
  const handleMitigationChange = (index: number) => {
    const newMitigations = [...mitigations];
    newMitigations[index].checked = !newMitigations[index].checked;
    setMitigations(newMitigations);
  };

  // CSV Export function
  const exportCSV = () => {
    const headers = [
      'Transactions per Month',
      'Agent-Handled Percentage (%)',
      'Error Rate (%)',
      'Claim Probability (%)',
      'Average Transaction Value ($)',
      'Average Claim Cost ($)',
      'Legal Defense Cost ($)',
      'Total Discount (%)',
      'Monthly Liability ($)',
      'Annual Liability ($)',
    ];
    const rows = [
      [
        transactionsPerMonth,
        agentHandledPercentage,
        errorRate,
        claimProbability,
        averageTransactionValue,
        averageClaimCost,
        legalDefenseCost,
        (cappedDiscount * 100).toFixed(2),
        adjustedMonthlyLiability.toFixed(2),
        annualLiability.toFixed(2),
      ],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ueta_liability_report.csv');
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export function using jsPDF and autotable.
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('UETA Liability Report', 14, 20);
    const tableColumn = ['Parameter', 'Value'];
    const tableRows = [
      ['Transactions per Month', transactionsPerMonth],
      ['Agent-Handled Percentage (%)', agentHandledPercentage],
      ['Error Rate (%)', errorRate],
      ['Claim Probability (%)', claimProbability],
      ['Average Transaction Value ($)', averageTransactionValue],
      ['Average Claim Cost ($)', averageClaimCost],
      ['Legal Defense Cost ($)', legalDefenseCost],
      ['Total Discount (%)', (cappedDiscount * 100).toFixed(2)],
      ['Monthly Liability ($)', adjustedMonthlyLiability.toFixed(2)],
      ['Annual Liability ($)', annualLiability.toFixed(2)],
    ];

    (doc as any).autoTable(tableColumn, tableRows, { startY: 30 });
    doc.save('ueta_liability_report.pdf');
  };

  // Generate data for the graph (varying transactions per month)
  const minTransactions = 100;
  const maxTransactions = 10000;
  const steps = 10;
  const transactionValues = Array.from({ length: steps }, (_, i) =>
    Math.round(minTransactions + (i * (maxTransactions - minTransactions)) / (steps - 1))
  );
  const liabilityData = transactionValues.map((val) =>
    calculateLiability(val) * (1 - cappedDiscount)
  );

  const chartData = {
    labels: transactionValues,
    datasets: [
      {
        label: 'Adjusted Monthly Liability ($)',
        data: liabilityData,
        fill: false,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Liability vs. Transactions per Month',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Transactions per Month',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Adjusted Monthly Liability ($)',
        },
      },
    },
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded space-y-6">
      <h2 className="text-2xl font-semibold mb-4">UETA Liability Calculator</h2>

      {/* Sliders for Inputs */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block font-medium text-gray-700">
            Transactions per Month: {transactionsPerMonth}
          </label>
          <input
            type="range"
            min="100"
            max="10000"
            step="100"
            value={transactionsPerMonth}
            onChange={(e) => setTransactionsPerMonth(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">
            Agent-Handled Percentage (%): {agentHandledPercentage}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={agentHandledPercentage}
            onChange={(e) => setAgentHandledPercentage(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">
            Error Rate per Transaction (%): {errorRate}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={errorRate}
            onChange={(e) => setErrorRate(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">
            Claim Probability (%): {claimProbability}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={claimProbability}
            onChange={(e) => setClaimProbability(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">
            Average Transaction Value ($): {averageTransactionValue}
          </label>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={averageTransactionValue}
            onChange={(e) => setAverageTransactionValue(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">
            Average Claim Cost ($): {averageClaimCost}
          </label>
          <input
            type="range"
            min="50"
            max="5000"
            step="50"
            value={averageClaimCost}
            onChange={(e) => setAverageClaimCost(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">
            Legal Defense Cost per Incident ($): {legalDefenseCost}
          </label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={legalDefenseCost}
            onChange={(e) => setLegalDefenseCost(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Mitigation Strategies */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Mitigation Strategies</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mitigations.map((mitigation, index) => (
            <label key={index} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={mitigation.checked}
                onChange={() => handleMitigationChange(index)}
                className="h-4 w-4"
              />
              <span className="text-gray-700">
                {mitigation.name} ({(mitigation.discount * 100).toFixed(0)}% reduction)
              </span>
            </label>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Total mitigation discount is capped at 50% of the base liability.
        </p>
      </div>

      {/* Results */}
      <div className="mt-6 space-y-2">
        <p className="text-lg font-medium text-gray-700">
          📅 Adjusted Monthly Liability:{' '}
          <span className="text-red-600">${adjustedMonthlyLiability.toFixed(2)}</span>
        </p>
        <p className="text-lg font-medium text-gray-700">
          📆 Annual Liability:{' '}
          <span className="text-red-600">${annualLiability.toFixed(2)}</span>
        </p>
      </div>

      {/* Graph */}
      <div className="mt-8">
        {/* Using a key to force remount if data changes */}
        <Line key={JSON.stringify(chartData)} data={chartData} options={chartOptions} />
      </div>

      {/* Export Buttons */}
      <div className="flex space-x-4 mt-6">
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Export CSV
        </button>
        <button
          onClick={exportPDF}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
};