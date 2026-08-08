import { Injectable, Injector, inject, signal } from '@angular/core';
import { SiteSettingService } from '../services/site-setting-service';
import { SiteSettingModel } from '../models/site-setting-model';
import { environment } from '../environments/environment';

const CACHE_KEY = 'site_settings_cache';
const CACHE_TTL_MS = 30 * 60 * 1000;

const DEFAULT_HEADER_BG = '#80001c';
const DEFAULT_FOOTER_BG = '#2c1810';
const DEFAULT_FOOTER_TEXT = '#d4c5b0';

const ALLOWED_HEADER_BG = ['#80001c', '#1f4e79', '#2d6a4f', '#5a3e1b', '#212529'];
const ALLOWED_FOOTER_BG = ['#2c1810', '#1a1a1a', '#1f2a44', '#3a2a1f', '#212529'];
const ALLOWED_FOOTER_TEXT = ['#d4c5b0', '#e9ecef', '#cbd5e1', '#f5e6d3', '#dee2e6'];

export const THEME_PRESETS = {
	header_bg_color: ALLOWED_HEADER_BG,
	footer_bg_color: ALLOWED_FOOTER_BG,
	footer_text_color: ALLOWED_FOOTER_TEXT
} as const;

export const THEME_PRESET_KEYS: readonly string[] = [
	'header_bg_color',
	'footer_bg_color',
	'footer_text_color'
];

function pickAllowed(value: string | undefined, fallback: string): string {
	if (!value) return fallback;
	const normalized = value.trim().toLowerCase();
	return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
}

interface CacheShape {
	ts: number;
	map: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class SiteSettingsStore {
	private injector = inject(Injector);

	private readonly _map = signal<Record<string, string>>({});
	private readonly _loading = signal<boolean>(false);
	private readonly _loaded = signal<boolean>(false);

	readonly values = this._map.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly loaded = this._loaded.asReadonly();

	constructor() {
		this.loadFromCache();
	}

	get(key: string, fallback: string = ''): string {
		const v = this._map()[key];
		return (v === undefined || v === null) ? fallback : v;
	}

	// [Settings reactive 2024]: getSignal không còn dùng — component chuyển sang computed(() => siteSettings.map()) / computed(() => siteSettings.imageUrl()). Có thể xoá khi đã ổn định.
	//public getSignal(key: string, fallback: string = '')
	//{
	//    return computed(() => {
	//        const v = this._map()[key];
	//        return (v === undefined || v === null) ? fallback : v;
	//    });
	//}

	imageUrl(key: string, fallback: string = ''): string {
		const raw = this.get(key, fallback);
		if (!raw) return fallback;
		// [Settings image 2024-fix]: khôi phục chuẩn hoá URL — cloudinary (https) giữ nguyên, assets/ giữ nguyên, còn lại prefix với environment.host.
		if (/^https?:\/\//i.test(raw)) return raw;
		if (raw.startsWith('assets/')) return raw;
		let clean = raw.replace(/^\/+/, '');
		const doubledPrefix = 'api/shared/images/';
		if (clean.toLowerCase().startsWith(doubledPrefix)) {
			clean = clean.substring(doubledPrefix.length);
		}
		return `${environment.host}api/shared/images/${clean}`;
	}

	// [Settings reactive 2024]: imageUrlSignal không còn dùng — computed imageUrl đã reactive qua _map trực tiếp. Có thể xoá khi đã ổn định.
	//public imageUrlSignal(key: string, fallback: string = '')
	//{
	//    return computed(() => this.imageUrl(key, fallback));
	//}

	loadFromCache(): void {
		try {
			const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
			if (!raw) return;
			const parsed = JSON.parse(raw) as CacheShape;
			if (!parsed || !parsed.map || !parsed.ts) return;
			if (Date.now() - parsed.ts > CACHE_TTL_MS) return;
			// [SiteSettingsStore 2024-fix]: chỉ coi cache là "loaded" khi có ít nhất 1 key — tránh đóng băng store rỗng 30 phút khi BE lỗi lần đầu.
			if (Object.keys(parsed.map).length === 0) return;
			this._map.set(parsed.map);
			this._loaded.set(true);
			this.applyThemeVars();
		} catch {
		}
	}

	private persistCache(): void {
		try {
			if (typeof localStorage === 'undefined') return;
			const payload: CacheShape = { ts: Date.now(), map: this._map() };
			localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
		} catch {
		}
	}

	load(force: boolean = false): Promise<void> {
		if (this._loading()) return Promise.resolve();
		if (this._loaded() && !force) return Promise.resolve();

		this._loading.set(true);
		// [SiteSettingsStore 2024]: Lazy resolve SiteSettingService để tránh circular DI (SiteSettingService cũng inject SiteSettingsStore để refresh).
		const service = this.injector.get(SiteSettingService);

		const fetchOnce = (): Promise<void> => new Promise((resolve) => {
			service.getPublic().subscribe({
				next: (res) => {
					const items: SiteSettingModel[] = res?.data ?? [];
					// [SiteSettingsStore 2024-fix]: cảnh báo khi BE trả rỗng — thường do setting bị IsPublic=false.
					if (!items || items.length === 0) {
						console.warn('[SiteSettingsStore] getPublic trả 0 items — kiểm tra IsPublic filter ở BE hoặc seed data');
					}
					const map: Record<string, string> = {};
					for (const item of items) {
						if (item?.SettingKey) {
							map[item.SettingKey] = item.SettingValue ?? '';
						}
					}
					this._map.set(map);
					this._loaded.set(true);
					this._loading.set(false);
					this.persistCache();
					this.applyThemeVars();
					resolve();
				},
				error: (err) => {
					// [SiteSettingsStore 2024-fix]: log lỗi thay vì nuốt im lặng, để admin biết BE đang fail.
					console.error('[SiteSettingsStore] getPublic failed', err);
					this._loading.set(false);
					resolve();
				}
			});
		});

		// [SiteSettingsStore 2024-fix]: retry 1 lần sau 2s nếu lỗi mạng — phòng Cold Start BE.
		return fetchOnce().then(() => {
			if (this._loaded()) return;
			return new Promise<void>((resolve) => setTimeout(resolve, 2000)).then(fetchOnce);
		});
	}

	refresh(): Promise<void> {
		return this.load(true);
	}

	applyFavicon(): void {
		if (typeof document === 'undefined') return;
		const url = this.imageUrl('favicon', '');
		if (!url) return;
		let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
		if (!link) {
			link = document.createElement('link');
			link.rel = 'icon';
			document.head.appendChild(link);
		}
		link.href = url;
	}

	applyThemeVars(): void {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		const headerBg = pickAllowed(this.get('header_bg_color'), DEFAULT_HEADER_BG);
		const footerBg = pickAllowed(this.get('footer_bg_color'), DEFAULT_FOOTER_BG);
		const footerText = pickAllowed(this.get('footer_text_color'), DEFAULT_FOOTER_TEXT);
		root.style.setProperty('--header-bg', headerBg);
		root.style.setProperty('--footer-bg', footerBg);
		root.style.setProperty('--footer-text', footerText);
	}
}
