export interface CategoryModel {
	ID?: number;
	STT?: number;
	CategoryCode?: string;
	CategoryName?: string;
	ParentID?: number;
	IsDeleted?: boolean;
	Children?: CategoryModel[];
}
