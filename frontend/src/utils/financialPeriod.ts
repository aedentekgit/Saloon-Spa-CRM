import dayjs from 'dayjs';

export interface DateWindow {
  startDate: string;
  endDate: string;
}

export const FINANCIAL_PERIOD_START_DAY = 9;
export const FINANCIAL_PERIOD_END_DAY = 8;

export const getFinancialPeriodForMonth = (month: string): DateWindow => {
  const start = dayjs(`${month}-01`).date(FINANCIAL_PERIOD_START_DAY);
  const end = start.add(1, 'month').date(FINANCIAL_PERIOD_END_DAY);
  return {
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD')
  };
};

export const getCurrentFinancialPeriod = (referenceDate = dayjs()): DateWindow => {
  const anchor = referenceDate.date() >= FINANCIAL_PERIOD_START_DAY
    ? referenceDate
    : referenceDate.subtract(1, 'month');
  return getFinancialPeriodForMonth(anchor.format('YYYY-MM'));
};

export const buildFinancialDateWindow = (dateRange: any): DateWindow => {
  if (!dateRange || dateRange === 'All') return { startDate: '', endDate: '' };

  const now = dayjs();
  if (typeof dateRange === 'string') {
    if (dateRange === 'Today') return { startDate: now.format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
    if (dateRange === 'Week') return { startDate: now.subtract(7, 'day').format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
    if (dateRange === 'Month') return getCurrentFinancialPeriod(now);

    if (dateRange.length === 7) {
      return getFinancialPeriodForMonth(dateRange);
    }

    if (dateRange.length === 10) {
      return { startDate: dateRange, endDate: dateRange };
    }

    return { startDate: '', endDate: '' };
  }

  if (dateRange.from || dateRange.to) {
    return {
      startDate: dateRange.from || dateRange.to || '',
      endDate: dateRange.to || dateRange.from || ''
    };
  }

  return { startDate: '', endDate: '' };
};
