export interface SiteSettingModel {
	ID?: number;
	SettingKey?: string;
	SettingValue?: string;
	ValueType?: string;
	Group?: string;
	DisplayName?: string;
	Description?: string;
	SortOrder?: number;
	IsPublic?: boolean;
	IsDeleted?: boolean;
	CreatedDate?: Date | string;
	UpdatedDate?: Date | string;
}

export type SiteSettingValueType = 'string' | 'text' | 'image' | 'json';

export interface SiteSettingGroup {
	Group: string;
	Items: SiteSettingModel[];
}
