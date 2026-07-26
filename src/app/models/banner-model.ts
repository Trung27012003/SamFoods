export interface BannerModel {
	ID?: number;
	BannerCode?: string;
	BannerName?: string;
	Description?: string;
	SlideshowInterval?: number;
	IsActive?: boolean;
	CreatedDate?: Date | string;
	UpdatedDate?: Date | string;
	IsDeleted?: boolean;
	Details?: BannerDetailModel[];
}

export interface BannerDetailModel {
	ID?: number;
	BannerID?: number;
	ImageName?: string;
	SortOrder?: number;
	LinkURL?: string;
	CreatedDate?: Date | string;
	UpdatedDate?: Date | string;
	IsDeleted?: boolean;
}
