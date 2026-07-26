export interface InvoiceDetailModel {
	ID: number;
	CategoryID: number;
	ProductCode: string;
	ProductName: string;
	Descriptions: string;
	Origin: string;
	StorageInstructions: string;

	UnitCountID: number;
	UnitPrice: number;
	Weight: number;

	STT: number;
	Status: number;

	ProductID: number;
	Quantity: number;
	TotalPrice: number;
	ImageURL: string;
}
