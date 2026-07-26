/**
 * Shared status semantics + color mapping
 * Used by AdminStatusTag and list pages to render colored nz-tag.
 *
 * Each trang có thể override bằng cách truyền [color] cho AdminStatusTag.
 */
export type AdminStatusColor =
	| 'success'
	| 'warning'
	| 'error'
	| 'processing'
	| 'default'
	| 'magenta'
	| 'red'
	| 'volcano'
	| 'orange'
	| 'gold'
	| 'lime'
	| 'green'
	| 'cyan'
	| 'blue'
	| 'geekblue'
	| 'purple';

export const STATUS_COLOR: Record<number, AdminStatusColor> = {
	0: 'processing',
	1: 'success',
	2: 'warning',
	3: 'success',
	4: 'error',
};

/** Common status enum-like labels */
export const STATUS_LABEL: Record<number, string> = {
	0: 'Mới',
	1: 'Hoạt động',
	2: 'Đang xử lý',
	3: 'Hoàn thành',
	4: 'Đã hủy',
};
