import { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/storage';
import { 
  DEFAULT_EXCLUDED_ITEMS, 
  DEFAULT_LARGE_AMOUNT_THRESHOLD,
  groupData,
  parseCSVData
} from '../utils/dataProcessing';

export const useBankData = () => {
  const [data, setData] = useState([]);
  const [groupedData, setGroupedData] = useState(loadFromLocalStorage('groupedData', {}));
  const [groupBy, setGroupBy] = useState(loadFromLocalStorage('groupBy', 'week'));
  const [excludedRows, setExcludedRows] = useState(new Set());
  const [headers, setHeaders] = useState([]);
  const [customExcludedItems, setCustomExcludedItems] = useState(
    new Set(loadFromLocalStorage('customExcludedItems', []))
  );
  const [excludeLargeAmount, setExcludeLargeAmount] = useState(
    loadFromLocalStorage('excludeLargeAmount', true)
  );
  const [largeAmountThreshold, setLargeAmountThreshold] = useState(
    loadFromLocalStorage('largeAmountThreshold', DEFAULT_LARGE_AMOUNT_THRESHOLD)
  );
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

    setUploadedFiles(prev => [...prev, ...files]);

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

            if (headers.length === 0) {
              const allHeaders = Object.keys(results.data[0] || {});
              const filteredHeaders = allHeaders.filter(header => 
                header !== 'ForeignCurrencyAmount' && header !== 'ConversionCharge'
              );
              setHeaders(filteredHeaders);
            }
            
            const parsedData = parseCSVData(results, headers);
            parsedData.forEach(item => item.fileName = file.name);

            const newExcludedItems = new Set(customExcludedItems);
            parsedData.forEach(item => {
              if (Math.abs(item.amount) >= DEFAULT_LARGE_AMOUNT_THRESHOLD) {
                newExcludedItems.add(item.itemKey);
              }
            });
            setCustomExcludedItems(newExcludedItems);

            resolve(parsedData);
          },
        });
      });
    };

    Promise.all(files.map(processFile))
      .then(results => {
        const newData = results.flat();
        setData(prevData => {
          const updatedData = [...prevData, ...newData];
          updateGroupedData(updatedData);
          return updatedData;
        });
      });
  };

  const removeFile = (fileName) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    setData(prev => {
      const updatedData = prev.filter(item => item.fileName !== fileName);
      updateGroupedData(updatedData);
      return updatedData;
    });
  };

  const updateGroupedData = (data) => {
    const grouped = groupData(
      data,
      groupBy,
      excludedRows,
      excludedItems,
      excludeLargeAmount,
      largeAmountThreshold
    );
    setGroupedData(grouped);
  };

  const handleGroupChange = (type) => {
    setGroupBy(type);
    updateGroupedData(data);
  };

  const handleLargeAmountThresholdChange = (value) => {
    if (!isNaN(value) && value > 0) {
      setLargeAmountThreshold(value);
      updateGroupedData(data);
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
    updateGroupedData(data);
  };

  const toggleExcludeItem = (itemKey) => {
    if (DEFAULT_EXCLUDED_ITEMS.includes(itemKey)) return;

    const newCustomExcludedItems = new Set(customExcludedItems);
    if (newCustomExcludedItems.has(itemKey)) {
      newCustomExcludedItems.delete(itemKey);
    } else {
      newCustomExcludedItems.add(itemKey);
    }
    setCustomExcludedItems(newCustomExcludedItems);
    updateGroupedData(data);
  };

  const resetSettings = () => {
    setCustomExcludedItems(new Set());
    setExcludeLargeAmount(true);
    setLargeAmountThreshold(DEFAULT_LARGE_AMOUNT_THRESHOLD);
    updateGroupedData(data);
  };

  return {
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
  };
}; 