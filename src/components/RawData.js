import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';

export const RawData = ({ 
  data, 
  headers, 
  excludedItems, 
  excludedRows, 
  onToggleExcludeRow, 
  onToggleExcludeItem 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPositiveOnly, setShowPositiveOnly] = useState(false);
  const [showLargeOnly, setShowLargeOnly] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [highlightedItem, setHighlightedItem] = useState(null);

  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    if (searchTerm) {
      filtered = filtered.filter(row => 
        Object.values(row.originalRow).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (showPositiveOnly) {
      filtered = filtered.filter(row => row.amount > 0);
    }

    if (showLargeOnly) {
      filtered = filtered.filter(row => Math.abs(row.amount) > 100);
    }

    return filtered.sort((a, b) => b.date - a.date);
  }, [data, searchTerm, showPositiveOnly, showLargeOnly]);

  return (
    <div className="stats-card">
      <h2 className="stats-title">
        <svg className="stats-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        原始数据
      </h2>
      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-options">
          <label className="filter-label">
            <input
              type="checkbox"
              checked={showPositiveOnly}
              onChange={(e) => setShowPositiveOnly(e.target.checked)}
              className="filter-checkbox"
            />
            <span>仅显示正数</span>
          </label>
          <label className="filter-label">
            <input
              type="checkbox"
              checked={showLargeOnly}
              onChange={(e) => setShowLargeOnly(e.target.checked)}
              className="filter-checkbox"
            />
            <span>仅显示大额（&gt;100）</span>
          </label>
        </div>
        <div className="record-count">
          当前显示 {filteredData.length} 条记录
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>操作</th>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => (
              <tr 
                key={index} 
                style={{
                  backgroundColor: 
                    highlightedItem === row.itemKey 
                      ? '#fecaca'
                      : excludedItems.has(row.itemKey)
                        ? '#fee2e2'
                        : excludedRows.has(index)
                          ? '#e5e7eb'
                          : hoveredRow === index
                            ? '#dbeafe'
                            : 'transparent',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="action-cell">
                  <div className="action-buttons">
                    <button
                      onClick={() => onToggleExcludeRow(index)}
                      className={`action-button ${excludedRows.has(index) ? 'include' : 'exclude'}`}
                    >
                      {excludedRows.has(index) ? '包含' : '排除'}
                    </button>
                    <button
                      onClick={() => {
                        onToggleExcludeItem(row.itemKey);
                        setHighlightedItem(row.itemKey);
                      }}
                      className={`action-button ${excludedItems.has(row.itemKey) ? 'include' : 'exclude-item'}`}
                    >
                      {excludedItems.has(row.itemKey) ? '包含项目' : '排除项目'}
                    </button>
                  </div>
                </td>
                {headers.map((header) => (
                  <td key={header}>
                    {header === 'Date' ? format(row.date, 'yyyy-MM-dd') : row.originalRow[header] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 