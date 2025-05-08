import React from 'react';
import { DEFAULT_EXCLUDED_ITEMS } from '../utils/dataProcessing';

export const ExcludedItems = ({ 
  excludedItemsList, 
  customExcludedItems, 
  data, 
  onToggleExcludeItem 
}) => {
  return (
    <div className="stats-card">
      <h2 className="stats-title">
        <svg className="stats-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        排除项目管理
      </h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>项目名称</th>
              <th>类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {excludedItemsList.map((item) => {
              const isDefaultExcluded = DEFAULT_EXCLUDED_ITEMS.includes(item);
              const isLargeAmount = data.some(row => 
                row.itemKey === item && Math.abs(row.amount) >= 1000
              );
              const isCustomExcluded = customExcludedItems.has(item) && !isDefaultExcluded && !isLargeAmount;
              
              return (
                <tr key={item}>
                  <td>{item}</td>
                  <td>
                    {isDefaultExcluded ? '默认排除' : 
                     isLargeAmount ? '大额排除' : 
                     isCustomExcluded ? '自定义排除' : '-'}
                  </td>
                  <td className="action-cell">
                    {!isDefaultExcluded && (
                      <button
                        onClick={() => onToggleExcludeItem(item)}
                        className={`action-button ${customExcludedItems.has(item) ? 'include' : 'exclude-item'}`}
                      >
                        {customExcludedItems.has(item) ? '包含项目' : '排除项目'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 