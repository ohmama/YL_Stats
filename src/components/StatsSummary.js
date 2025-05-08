import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { calculateAverage } from '../utils/dataProcessing';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const StatsSummary = ({ groupedData, selectedStats, onToggleStat }) => {
  const chartData = {
    labels: Object.keys(groupedData),
    datasets: [
      {
        label: '金额',
        data: Object.values(groupedData),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '金额趋势图'
      }
    }
  };

  const selectedAverage = calculateAverage(
    Array.from(selectedStats).map(key => groupedData[key])
  );

  const totalAverage = calculateAverage(Object.values(groupedData));

  return (
    <div className="stats-grid">
      <div className="stats-card">
        <h2 className="stats-title">
          <svg className="stats-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          统计结果
        </h2>
        <div className="stats-summary">
          <div className="stats-summary-item">
            <span className="stats-summary-label">总平均数：</span>
            <span className="stats-summary-value">{totalAverage.toFixed(2)}</span>
          </div>
          {selectedStats.size > 0 && (
            <div className="stats-summary-item">
              <span className="stats-summary-label">选中项平均数：</span>
              <span className="stats-summary-value">{selectedAverage.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="select-cell">选择</th>
                <th>时间段</th>
                <th>总金额</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedData).map(([key, value]) => (
                <tr 
                  key={key} 
                  className={`data-table-row ${selectedStats.has(key) ? 'selected-row' : ''}`}
                >
                  <td className="select-cell">
                    <input
                      type="checkbox"
                      checked={selectedStats.has(key)}
                      onChange={() => onToggleStat(key)}
                      className="stat-checkbox"
                    />
                  </td>
                  <td>{key}</td>
                  <td className="amount-cell">{value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stats-card">
        <h2 className="stats-title">
          <svg className="stats-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          金额趋势图
        </h2>
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}; 