/** Monthly income / expense / savings totals for column charts. */
export type MonthlyCashFlowPoint = {
  monthKey: string;
  /** Short label for chart axis */
  label: string;
  income: number;
  expense: number;
  savings: number;
};

export type CategorySlice = {
  id: string;
  name: string;
  value: number;
};
