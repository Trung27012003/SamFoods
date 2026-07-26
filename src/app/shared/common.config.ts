import { environment } from '../environments/environment';

export enum RESPONSE_STATUS {
	ERROR = 0,
	SUCCESS = 1,
	FORBIDDEN = 403
}

export const NOTIFICATION_TITLE_MAP: Record<RESPONSE_STATUS | number, string> = {
	[RESPONSE_STATUS.ERROR]: 'Lỗi',
	[RESPONSE_STATUS.SUCCESS]: 'Thành công',
	[RESPONSE_STATUS.FORBIDDEN]: 'Không có quyền truy cập',
	400: 'Yêu cầu không hợp lệ',
	401: 'Chưa xác thực',
	404: 'Không tìm thấy',
	500: 'Lỗi server'
};

export const NOTIFICATION_TYPE_MAP: Record<number, string> = {
	1: 'success',
	200: 'success',
	201: 'success',
	204: 'success',
	400: 'warning',
	401: 'warning',
	403: 'warning',
	404: 'warning',
	0: 'error',
	500: 'error'
};

export const FAVOURITE_KEY = 'favourite_products';
export const CART_PRODUCT_KEY = 'cart_products';
export const IMAGE_URL = environment.host + 'api/shared/images';
export const LOGO_URL = 'assets/image/logo.png';

export const SOCIAL_DEFAULT_ICONS = {
	zalo: 'assets/image/social/icons8-zalo-32.png',
	facebook: 'assets/image/social/icons8-facebook-32.png',
	messenger: 'assets/image/social/icons8-messenger-32.png',
	phone: 'assets/image/social/icons8-phone-32.png'
};

// Helper Functions
export function formatCurrency(value: number | null | undefined, currency = 'VND'): string {
	if (value == null || isNaN(value)) return '0 ₫';
	return new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency,
		maximumFractionDigits: 0
	}).format(value);
}

export function formatDate(
	date: string | Date | null | undefined,
	options?: Intl.DateTimeFormatOptions
): string {
	if (!date) return '-';
	const d = new Date(date);
	if (isNaN(d.getTime())) return '-';

	const defaultOptions: Intl.DateTimeFormatOptions = {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	};

	return d.toLocaleDateString('vi-VN', options || defaultOptions);
}

export function formatDateTime(date: string | Date | null | undefined): string {
	if (!date) return '-';
	const d = new Date(date);
	if (isNaN(d.getTime())) return '-';

	return d.toLocaleDateString('vi-VN', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function getNotificationTitle(status: number): string {
	return NOTIFICATION_TITLE_MAP[status] || NOTIFICATION_TITLE_MAP[0];
}

export function getNotificationType(status: number): string {
	return NOTIFICATION_TYPE_MAP[status] || 'error';
}

export function truncateText(text: string | null | undefined, maxLength: number): string {
	if (!text) return '';
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength) + '...';
}

// Helper: build full URL for product image.
// Accepts either a relative path from DB (e.g. "/Product/SP001/img.jpg") or an already-absolute URL.
// spGetProduct returns full relative path "api/shared/images/product/..." — strip that to avoid duplication.
export function getProductImageUrl(path: string | null | undefined): string {
	if (!path) return '';
	if (/^https?:\/\//i.test(path)) return path;

	// Strip leading slash
	let clean = path.replace(/^\/+/, '');

	// spGetProduct returns "api/shared/images/product/..." → strip to avoid /api/shared/images/api/shared/images/...
	const doubledPrefix = 'api/shared/images/';
	if (clean.toLowerCase().startsWith(doubledPrefix)) {
		clean = clean.substring(doubledPrefix.length);
	}

	return `${environment.host}api/shared/images/${clean}`;
}

export function getStatusColor(status: number, statusMap: Record<number, string>): string {
	return statusMap[status] || 'default';
}

export function getStatusName(status: number, statusMap: Record<number, string>): string {
	return statusMap[status] || 'Không xác định';
}

// Pagination Helper
export interface PaginationParams {
	page: number;
	pageSize: number;
	total?: number;
}

export function createPaginationParams(
	page = 1,
	pageSize = 20
): Record<string, number> {
	return { page, pageSize };
}
