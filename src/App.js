import React, { useState, useMemo } from 'react';
import { useBankData } from './hooks/useBankData';
import { FileUploader } from './components/FileUploader';
import { StatsSummary } from './components/StatsSummary';
import { ExcludedItems } from './components/ExcludedItems';
import { RawData } from './components/RawData';
import './App.css';

function App() {
  const [selectedStats, setSelectedStats] = useState(new Set());
  
  const {
    data,
    groupedData,
    groupBy,
    excludedRows,
    headers,
    excludedItems,
    customExcludedItems,
    excludeLargeAmount,
    largeAmountThreshold,
    uploadedFiles,
    handleFileUpload,
    removeFile,
    handleGroupChange,
    handleLargeAmountThresholdChange,
    toggleExcludeRow,
    toggleExcludeItem,
    resetSettings,
    setExcludeLargeAmount
  } = useBankData();

  const excludedItemsList = useMemo(() => {
    const allItems = Array.from(excludedItems);
    const largeAmountItems = data
      .filter(item => Math.abs(item.amount) >= 1000)
      .map(item => item.itemKey);
    
    const uniqueItems = new Set();
    largeAmountItems.forEach(item => uniqueItems.add(item));
    allItems.forEach(item => uniqueItems.add(item));
    
    return Array.from(uniqueItems).sort();
  }, [excludedItems, data]);

  const handleToggleStat = (key) => {
    const newSelectedStats = new Set(selectedStats);
    if (newSelectedStats.has(key)) {
      newSelectedStats.delete(key);
    } else {
      newSelectedStats.add(key);
    }
    setSelectedStats(newSelectedStats);
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <div className="app-card">
          <div className="app-card-content">
            <h1 className="app-title">
              <svg className="app-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              银行流水统计
            </h1>

            <FileUploader
              onFileUpload={handleFileUpload}
              uploadedFiles={uploadedFiles}
              onRemoveFile={removeFile}
            />

            <div className="app-controls">
              <div className="group-select">
                <label className="group-label">按：</label>
                <select
                  value={groupBy}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="select-input"
                >
                  <option value="month">月</option>
                  <option value="week">周</option>
                </select>
              </div>
              <button
                onClick={resetSettings}
                className="reset-button"
              >
                重置设置
              </button>
            </div>

            <StatsSummary
              groupedData={groupedData}
              selectedStats={selectedStats}
              onToggleStat={handleToggleStat}
            />

            <ExcludedItems
              excludedItemsList={excludedItemsList}
              customExcludedItems={customExcludedItems}
              data={data}
              onToggleExcludeItem={toggleExcludeItem}
            />

            <RawData
              data={data}
              headers={headers}
              excludedItems={excludedItems}
              excludedRows={excludedRows}
              onToggleExcludeRow={toggleExcludeRow}
              onToggleExcludeItem={toggleExcludeItem}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
