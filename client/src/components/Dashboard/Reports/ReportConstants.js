export const POSITIONS = [
  'HUMAN_RESOURCE',
  'DIGITAL_TRANSFORMATION',
  'SALES',
  'MARKETING',
  'FULL_STACK_DEVELOPER',
  'POWER_BI_DEVELOPER',
  'TESTING',
  'SALESFORCE',
  'ERODE_INTERN',
  'PUBLIC'
];

export const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom Range', value: 'custom' }
];

export const getPresetDates = (preset) => {
  const now = new Date();
  let start = '';
  let end = '';

  if (preset === 'today') {
    start = new Date(now.setHours(0,0,0,0)).toISOString();
    end = new Date(now.setHours(23,59,59,999)).toISOString();
  } else if (preset === 'week') {
    const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
    start = new Date(firstDay.setHours(0,0,0,0)).toISOString();
    end = new Date().toISOString();
  } else if (preset === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    start = new Date(firstDay.setHours(0,0,0,0)).toISOString();
    end = new Date().toISOString();
  }
  return { start, end };
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
