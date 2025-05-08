import { parse, format, getMonth, getYear, startOfWeek, endOfWeek } from 'date-fns';

export const DEFAULT_EXCLUDED_ITEMS = [
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

export const DEFAULT_LARGE_AMOUNT_THRESHOLD = 1000;

export const groupData = (data, type, excludedRows, excludedItems, excludeLargeAmount, largeAmountThreshold) => {
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
  return Object.fromEntries(sortedEntries);
};

export const calculateAverage = (values) => {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
};

export const parseCSVData = (results, headers) => {
  if (results.data.length === 0) return [];

  return results.data.map((row) => ({
    date: parse(row.Date, 'dd/MM/yyyy', new Date()),
    amount: parseFloat(row.Amount),
    originalRow: row,
    itemKey: `${row.Type || ''}_${row.Details || ''}`,
    fileName: row.fileName
  }));
}; 