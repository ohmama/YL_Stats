import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { parse, format, getMonth, getYear, startOfWeek, endOfWeek, addDays } from 'date-fns';
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
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const DEFAULT_EXCLUDED_ITEMS = [
  // 'Payment_Milford Investment F',
  'Salary_New Zealand Post',
  'Payment_Tiger Fintech Nz Ltd',
  'Payment_Milford Cash Fund',
  'Direct Debit_Milford Cash Fund',
  'Direct Debit_Smart Gold (Gld)',
  'Payment_Seedfintechlimited',
  'Payment_Interactive Broker',
  'Term Deposit Break_',
  'Automatic Payment_Serious Saver'
];

const DEFAULT_LARGE_AMOUNT_THRESHOLD = 1000;

// 保存数据到localStorage
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// 从localStorage读取数据
const loadFromLocalStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

function App() {
  const [data, setData] = useState([]);
  const [groupedData, setGroupedData] = useState(loadFromLocalStorage('groupedData', {}));
  const [groupBy, setGroupBy] = useState(loadFromLocalStorage('groupBy', 'week'));
  const [excludedRows, setExcludedRows] = useState(new Set());
  const [headers, setHeaders] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [customExcludedItems, setCustomExcludedItems] = useState(new Set(loadFromLocalStorage('customExcludedItems', [])));
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedItem, setHighlightedItem] = useState(null);
  const [showPositiveOnly, setShowPositiveOnly] = useState(false);
  const [showLargeOnly, setShowLargeOnly] = useState(false);
  const [excludeLargeAmount, setExcludeLargeAmount] = useState(loadFromLocalStorage('excludeLargeAmount', true));
  const [largeAmountThreshold, setLargeAmountThreshold] = useState(loadFromLocalStorage('largeAmountThreshold', DEFAULT_LARGE_AMOUNT_THRESHOLD));
  const [selectedStats, setSelectedStats] = useState(new Set());
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // 合并默认排除项和自定义排除项
  const excludedItems = useMemo(() => {
    return new Set([...DEFAULT_EXCLUDED_ITEMS, ...customExcludedItems]);
  }, [customExcludedItems]);

  // 当相关状态改变时保存到localStorage
  useEffect(() => {
    saveToLocalStorage('groupedData', groupedData);
  }, [groupedData]);

  useEffect(() => {
    saveToLocalStorage('groupBy', groupBy);
  }, [groupBy]);

  useEffect(() => {
    saveToLocalStorage('customExcludedItems', Array.from(customExcludedItems));
  }, [customExcludedItems]);

  useEffect(() => {
    saveToLocalStorage('excludeLargeAmount', excludeLargeAmount);
  }, [excludeLargeAmount]);

  useEffect(() => {
    saveToLocalStorage('largeAmountThreshold', largeAmountThreshold);
  }, [largeAmountThreshold]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // 更新已上传文件列表
    setUploadedFiles(prev => [...prev, ...files]);

    // 处理每个文件
    const processFile = (file) => {
      return new Promise((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length === 0) {
              resolve([]);
              return;
            }

            // 更新表头（如果还没有设置）
            if (headers.length === 0) {
              const allHeaders = Object.keys(results.data[0] || {});
              const filteredHeaders = allHeaders.filter(header => 
                header !== 'ForeignCurrencyAmount' && header !== 'ConversionCharge'
              );
              setHeaders(filteredHeaders);
            }
            
            const parsedData = results.data.map((row) => ({
              date: parse(row.Date, 'dd/MM/yyyy', new Date()),
              amount: parseFloat(row.Amount),
              originalRow: row,
              itemKey: `${row.Type || ''}_${row.Details || ''}`,
              fileName: file.name
            }));

            // 自动将大于等于1000的值添加到排除列表
            const newExcludedItems = new Set(customExcludedItems);
            parsedData.forEach(item => {
              if (Math.abs(item.amount) >= 1000) {
                newExcludedItems.add(item.itemKey);
              }
            });
            setCustomExcludedItems(newExcludedItems);

            resolve(parsedData);
          },
        });
      });
    };

    // 处理所有文件并更新数据
    Promise.all(files.map(processFile))
      .then(results => {
        const newData = results.flat();
        setData(prevData => {
          const updatedData = [...prevData, ...newData];
          // 在数据更新后立即更新统计结果
          groupData(updatedData, groupBy);
          return updatedData;
        });
      });
  };

  const removeFile = (fileName) => {
    // 从已上传文件列表中移除
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    // 从数据中移除该文件的数据
    setData(prev => {
      const updatedData = prev.filter(item => item.fileName !== fileName);
      // 在数据更新后立即更新统计结果
      groupData(updatedData, groupBy);
      return updatedData;
    });
  };

  const groupData = (data, type) => {
    const grouped = {};

    data.forEach(({ date, amount, itemKey }, index) => {
      if (excludedRows.has(index) || 
          excludedItems.has(itemKey) || 
          (excludeLargeAmount && Math.abs(amount) > largeAmountThreshold)) return;

      let key;
      let startDate;
      let endDate;

      if (type === 'month') {
        startDate = new Date(getYear(date), getMonth(date), 1);
        endDate = new Date(getYear(date), getMonth(date) + 1, 0);
        key = `${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
      } else if (type === 'week') {
        startDate = startOfWeek(date, { weekStartsOn: 1 });
        endDate = endOfWeek(date, { weekStartsOn: 1 });
        key = `${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
      }

      if (!grouped[key]) {
        grouped[key] = 0;
      }
      grouped[key] += amount;
    });

    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
    setGroupedData(Object.fromEntries(sortedEntries));
  };

  const handleGroupChange = (e) => {
    const type = e.target.value;
    setGroupBy(type);
    groupData(data, type);
  };

  const handleLargeAmountThresholdChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setLargeAmountThreshold(value);
      groupData(data, groupBy);
    }
  };

  const toggleExcludeRow = (index) => {
    const newExcludedRows = new Set(excludedRows);
    if (newExcludedRows.has(index)) {
      newExcludedRows.delete(index);
    } else {
      newExcludedRows.add(index);
    }
    setExcludedRows(newExcludedRows);
    groupData(data, groupBy);
  };

  const toggleExcludeItem = (itemKey) => {
    // 如果项目在默认排除列表中，不允许移除
    if (DEFAULT_EXCLUDED_ITEMS.includes(itemKey)) {
      return;
    }

    const newCustomExcludedItems = new Set(customExcludedItems);
    if (newCustomExcludedItems.has(itemKey)) {
      newCustomExcludedItems.delete(itemKey);
      setHighlightedItem(null);
    } else {
      newCustomExcludedItems.add(itemKey);
      setHighlightedItem(itemKey);
    }
    setCustomExcludedItems(newCustomExcludedItems);
    groupData(data, groupBy);
  };

  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    // 应用搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(row => 
        Object.values(row.originalRow).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // 应用正数过滤
    if (showPositiveOnly) {
      filtered = filtered.filter(row => row.amount > 0);
    }

    // 应用大额过滤
    if (showLargeOnly) {
      filtered = filtered.filter(row => Math.abs(row.amount) > 100);
    }

    // 按时间倒序排序
    return filtered.sort((a, b) => b.date - a.date);
  }, [data, searchTerm, showPositiveOnly, showLargeOnly]);

  const excludedItemsList = useMemo(() => {
    // 获取所有排除项
    const allItems = Array.from(excludedItems);
    
    // 获取大额排除项
    const largeAmountItems = data
      .filter(item => Math.abs(item.amount) >= DEFAULT_LARGE_AMOUNT_THRESHOLD)
      .map(item => item.itemKey);
    
    // 合并所有项目并去重，确保大额项目不会被其他类型覆盖
    const uniqueItems = new Set();
    largeAmountItems.forEach(item => uniqueItems.add(item));
    allItems.forEach(item => uniqueItems.add(item));
    
    return Array.from(uniqueItems).sort();
  }, [excludedItems, data]);

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

  const toggleStatSelection = (key) => {
    const newSelectedStats = new Set(selectedStats);
    if (newSelectedStats.has(key)) {
      newSelectedStats.delete(key);
    } else {
      newSelectedStats.add(key);
    }
    setSelectedStats(newSelectedStats);
  };

  const calculateAverage = (values) => {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  };

  const selectedAverage = useMemo(() => {
    const selectedValues = Array.from(selectedStats).map(key => groupedData[key]);
    return calculateAverage(selectedValues);
  }, [selectedStats, groupedData]);

  const totalAverage = useMemo(() => {
    const allValues = Object.values(groupedData);
    return calculateAverage(allValues);
  }, [groupedData]);

  const handleRowClick = (key, event) => {
    // 如果点击的是复选框，不触发行点击事件
    if (event.target.type === 'checkbox') return;
    toggleStatSelection(key);
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

            <div className="app-controls">
              <div className="file-upload">
                <label className="file-label">上传文件</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="file-input"
                  multiple
                />
              </div>
              <div className="group-select">
                <label className="group-label">按：</label>
                <select
                  value={groupBy}
                  onChange={handleGroupChange}
                  className="select-input"
                >
                  <option value="month">月</option>
                  <option value="week">周</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setCustomExcludedItems(new Set());
                  setExcludeLargeAmount(true);
                  setLargeAmountThreshold(DEFAULT_LARGE_AMOUNT_THRESHOLD);
                  groupData(data, groupBy);
                }}
                className="reset-button"
              >
                重置设置
              </button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                <h3 className="uploaded-files-title">已上传文件：</h3>
                <div className="uploaded-files-list">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="uploaded-file-item">
                      <span className="file-name">{file.name}</span>
                      <button
                        onClick={() => removeFile(file.name)}
                        className="remove-file-button"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                          onClick={(e) => handleRowClick(key, e)}
                        >
                          <td className="select-cell">
                            <input
                              type="checkbox"
                              checked={selectedStats.has(key)}
                              onChange={() => toggleStatSelection(key)}
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
                        row.itemKey === item && Math.abs(row.amount) >= DEFAULT_LARGE_AMOUNT_THRESHOLD
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
                                onClick={() => toggleExcludeItem(item)}
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
                  <div className="filter-group">
                    <label className="filter-label">
                      <input
                        type="checkbox"
                        checked={excludeLargeAmount}
                        onChange={(e) => {
                          setExcludeLargeAmount(e.target.checked);
                          groupData(data, groupBy);
                        }}
                        className="filter-checkbox"
                      />
                      <span>排除大额</span>
                    </label>
                    <input
                      type="number"
                      value={largeAmountThreshold}
                      onChange={handleLargeAmountThresholdChange}
                      min="0"
                      step="100"
                      className="threshold-input"
                    />
                  </div>
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
                              onClick={() => toggleExcludeRow(index)}
                              className={`action-button ${excludedRows.has(index) ? 'include' : 'exclude'}`}
                            >
                              {excludedRows.has(index) ? '包含' : '排除'}
                            </button>
                            <button
                              onClick={() => toggleExcludeItem(row.itemKey)}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
