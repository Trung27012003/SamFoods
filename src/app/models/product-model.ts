export interface ProductCategoryRef {
	ID: number;
	CategoryName: string;
}

export interface ProductModel {
	ID: number;
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

	// N-N categories
	CategoryIDs?: number[];
	CategoryNames?: string[];
	CategoryList?: ProductCategoryRef[];

	productIngres: any[];
	productProcess: any[];
}
