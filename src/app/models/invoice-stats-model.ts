export interface InvoiceStatsModel {
	NewCount: number;
	ShippingCount: number;
	CompletedCount: number;
	CancelledCount: number;
	ActiveCount: number;
	TotalCount: number;
	MonthRevenue: number;
	Trend: string | null;
}
