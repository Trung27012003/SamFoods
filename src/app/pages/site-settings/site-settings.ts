import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { SiteSettingService } from '../../services/site-setting-service';
import { SiteSettingModel } from '../../models/site-setting-model';
import { SiteSettingsStore, THEME_PRESETS, THEME_PRESET_KEYS } from '../../shared/site-settings';
import { AdminPageHeader } from '../../shared';
import { environment } from '../../environments/environment';

@Component({
	selector: 'app-site-settings',
	imports: [
		CommonModule,
		FormsModule,
		NzIconModule,
		NzButtonModule,
		NzSpinModule,
		NzTabsModule,
		NzInputModule,
		NzEmptyModule,
		AdminPageHeader
	],
	templateUrl: './site-settings.html',
	styleUrl: './site-settings.css',
	standalone: true,
	providers: [SiteSettingService]
})
export class SiteSettings implements OnInit {
	private service = inject(SiteSettingService);
	private notification = inject(NzNotificationService);
	private store = inject(SiteSettingsStore);
	private cdr = inject(ChangeDetectorRef);

	groups = signal<{ group: string; items: SiteSettingModel[] }[]>([]);
	isLoading = signal(false);
	isSaving = signal(false);
	uploadingKey = signal<string | null>(null);

	groupOrder = ['Logo', 'Brand', 'Contact', 'Social', 'Footer'];

	constructor() {
		this.livePreviewTheme();
	}

	ngOnInit(): void {
		this.loadData();
	}

	private livePreviewTheme(): void {
		effect(() => {
			if (typeof document === 'undefined') return;
			const groups = this.groups();
			if (!groups.length) return;
			const find = (key: string): string | undefined =>
				groups.flatMap(g => g.items).find(it => it.SettingKey === key)?.SettingValue;
			const root = document.documentElement;
			for (const key of THEME_PRESET_KEYS) {
				const current = find(key);
				const normalized = (current || '').trim().toLowerCase();
				if (/^#[0-9a-f]{6}$/.test(normalized)) {
					root.style.setProperty('--' + key.replace(/_/g, '-'), normalized);
				}
			}
		}, { manualCleanup: false });
	}

	loadData(): void {
		this.isLoading.set(true);
		this.service.getAll().subscribe({
			next: (res) => {
				const items: SiteSettingModel[] = res?.data ?? [];
				const grouped = new Map<string, SiteSettingModel[]>();
				for (const item of items) {
					const g = item.Group || 'Khác';
					if (!grouped.has(g)) grouped.set(g, []);
					grouped.get(g)!.push(item);
				}
				const sorted = Array.from(grouped.entries())
					.sort((a, b) => this.indexOf(a[0]) - this.indexOf(b[0]))
					.map(([group, arr]) => ({ group, items: arr.sort((x, y) => (x.SortOrder ?? 0) - (y.SortOrder ?? 0)) }));
				this.groups.set(sorted);
				this.isLoading.set(false);
			},
			error: (err) => {
				this.isLoading.set(false);
				this.notification.error('Lỗi', err?.error?.message || err.message);
			}
		});
	}

	private indexOf(g: string): number {
		const i = this.groupOrder.indexOf(g);
		return i < 0 ? 999 : i;
	}

	allItems(): SiteSettingModel[] {
		return this.groups().flatMap(g => g.items);
	}

	onFileSelected(event: Event, key: string): void {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		input.value = '';

		this.uploadingKey.set(key);
		this.service.uploadImage(file, key).subscribe({
			next: (res) => {
				const path = res?.data?.path;
				if (path) {
					this.updateLocalValue(key, path);
					this.notification.success('Thành công', 'Upload ảnh thành công!');
					this.cdr.markForCheck();
				} else {
					this.notification.error('Lỗi', 'Upload không trả về đường dẫn!');
				}
				this.uploadingKey.set(null);
			},
			error: (err) => {
				this.uploadingKey.set(null);
				this.notification.error('Lỗi', err?.error?.message || err.message);
			}
		});
	}

	imagePreviewUrl(value: string | undefined): string {
		if (!value) return '';
		if (/^https?:\/\//i.test(value)) return value;
		if (value.startsWith('assets/')) return value;
		let clean = value.replace(/^\/+/, '');
		const doubledPrefix = 'api/shared/images/';
		if (clean.toLowerCase().startsWith(doubledPrefix)) {
			clean = clean.substring(doubledPrefix.length);
		}
		return `${environment.host}api/shared/images/${clean}`;
	}

	updateLocalValue(key: string, value: string): void {
		const groups = this.groups().map(g => ({
			group: g.group,
			items: g.items.map(it => it.SettingKey === key ? { ...it, SettingValue: value } : it)
		}));
		this.groups.set(groups);
	}

	onValueChange(key: string, value: string): void {
		this.updateLocalValue(key, value);
	}

	isColorPreset(key: string | undefined): boolean {
		return !!key && THEME_PRESET_KEYS.includes(key);
	}

	presetColors(key: string | undefined): string[] {
		if (!key) return [];
		const list = (THEME_PRESETS as Record<string, readonly string[]>)[key];
		return list ? [...list] : [];
	}

	isPresetActive(value: string | undefined, preset: string): boolean {
		return (value || '').trim().toLowerCase() === preset;
	}

	isCustomValue(value: string | undefined, key: string | undefined): boolean {
		if (!value || !key) return false;
		const v = value.trim().toLowerCase();
		if (!v) return false;
		const presets = (THEME_PRESETS as Record<string, readonly string[]>)[key] ?? [];
		return !presets.includes(v);
	}

	customPickerValue(value: string | undefined): string {
		const v = (value || '').trim();
		if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
		return '#000000';
	}

	onCustomColorChange(key: string, event: Event): void {
		const input = event.target as HTMLInputElement;
		const v = (input.value || '').trim().toLowerCase();
		if (!/^#[0-9a-f]{6}$/.test(v)) return;
		this.updateLocalValue(key, v);
	}

	parseJsonValue(value: string | undefined): string {
		if (!value) return '';
		try {
			const obj = JSON.parse(value);
			return JSON.stringify(obj, null, 2);
		} catch {
			return value;
		}
	}

	reformatJson(key: string): void {
		const item = this.findItem(key);
		if (!item) return;
		const formatted = this.parseJsonValue(item.SettingValue);
		this.updateLocalValue(key, formatted);
	}

	private findItem(key: string): SiteSettingModel | undefined {
		for (const g of this.groups()) {
			const found = g.items.find(it => it.SettingKey === key);
			if (found) return found;
		}
		return undefined;
	}

	save(): void {
		const items = this.allItems()
			.filter(it => it.ID && it.ID > 0)
			.map(it => ({ ID: it.ID, SettingKey: it.SettingKey, SettingValue: it.SettingValue }));

		if (items.length === 0) {
			this.notification.warning('Thông báo', 'Không có thay đổi để lưu.');
			return;
		}

		this.isSaving.set(true);
		this.service.bulkUpdate(items).subscribe({
			next: (res) => {
				this.isSaving.set(false);
				this.notification.success('Thành công', res?.message || 'Đã lưu cấu hình!');
				this.store.refresh().then(() => this.store.applyFavicon());
			},
			error: (err) => {
				this.isSaving.set(false);
				this.notification.error('Lỗi', err?.error?.message || err.message);
			}
		});
	}

	reload(): void {
		this.loadData();
	}
}
