import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ProductService } from '../../services/product-service';
import { CategoryService } from '../../services/category-service';
import {
	FAVOURITE_KEY,
	NOTIFICATION_TITLE_MAP,
	NOTIFICATION_TYPE_MAP,
	RESPONSE_STATUS,
	getProductImageUrl
} from '../../shared/common.config';

type SortBy = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

@Component({
	selector: 'app-products-list',
	imports: [
		CommonModule,
		FormsModule,
		RouterLink,
		NzInputModule,
		NzInputNumberModule,
		NzIconModule,
		NzButtonModule,
		NzSelectModule,
		NzTreeSelectModule,
		NzDrawerModule,
		NzPaginationModule,
		NzEmptyModule,
		NzSpinModule,
		NzTagModule
	],
	templateUrl: './products-list.html',
	styleUrl: './products-list.css',
	standalone: true,
	providers: [ProductService, CategoryService]
})
export class ProductsList implements OnInit {
	private productService = inject(ProductService);
	private categoryService = inject(CategoryService);
	private notification = inject(NzNotificationService);
	private route = inject(ActivatedRoute);
	private cdr = inject(ChangeDetectorRef);

	searchKeywords = signal<string[]>([]);
	currentKeywordInput = signal('');
	selectedCategoryIDs = signal<number[]>([]);
	minPrice = signal<number | null>(null);
	maxPrice = signal<number | null>(null);
	sortBy = signal<SortBy>('newest');
	pageIndex = signal(1);
	pageSize = signal(12);

	// Server-paged products (chỉ lưu trang hiện tại)
	pagedProducts = signal<any[]>([]);
	total = signal(0);
	isLoading = signal(false);

	categoryTree = signal<NzTreeNodeOptions[]>([]);

	// Computed: chuyển selectedCategoryIDs sang string[] để bind nz-tree-select
	// Dùng computed thay vì .map() trong template để tránh vòng lặp vô hạn
	selectedCategoryKeys = computed(() => this.selectedCategoryIDs().map(id => id.toString()));

	isFilterDrawerOpen = signal(false);

	sortOptions: { label: string; value: SortBy }[] = [
		{ label: 'Mới nhất', value: 'newest' },
		{ label: 'Giá tăng dần', value: 'price_asc' },
		{ label: 'Giá giảm dần', value: 'price_desc' },
		{ label: 'Tên A-Z', value: 'name_asc' }
	];

	private categoriesLoaded = false;
	private pendingApplyFilters = false;

	ngOnInit(): void {
		this.loadCategories();

		// Đọc query param (?keywords=... hoặc ?keyword=... và ?categoryID=...) do home/header truyền sang
		this.route.queryParamMap.subscribe(params => {
			const keywordsParam = params.get('keywords');
			const keywordParam = params.get('keyword');
			let kws: string[] = [];
			if (keywordsParam) {
				kws = keywordsParam.split(',').map(x => x.trim()).filter(Boolean);
			} else if (keywordParam) {
				kws = keywordParam.split(/\s+/).filter(Boolean);
			}
			this.searchKeywords.set(kws);

			const categoryParam = params.get('categoryID');
			if (categoryParam) {
				const catId = Number(categoryParam);
				if (!Number.isNaN(catId)) {
					this.selectedCategoryIDs.set([catId]);
				}
			}

			this.pageIndex.set(1);
			if (this.categoriesLoaded) {
				this.applyFilters();
			} else {
				this.pendingApplyFilters = true;
			}
		});
	}

	loadCategories(): void {
		this.categoryService.getData().subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					this.categoryTree.set(this.buildTreeOptions(res.data || []));
					this.categoriesLoaded = true;
					if (this.pendingApplyFilters) {
						this.pendingApplyFilters = false;
						this.applyFilters();
					}
				});
			},
			error: (err) => this.notifyError(err)
		});
	}

	private buildTreeOptions(data: any[]): NzTreeNodeOptions[] {
		const map = new Map<number, NzTreeNodeOptions>();
		const roots: NzTreeNodeOptions[] = [];

		data.forEach((item: any) => {
			map.set(item.ID, {
				title: item.CategoryName,
				key: item.ID.toString(),
				value: item.ID
			});
		});

		data.forEach((item: any) => {
			const node = map.get(item.ID);
			if (!node) return;
			if (item.ParentID === 0) {
				roots.push(node);
			} else {
				const parent = map.get(item.ParentID);
				if (parent) {
					if (!parent.children) parent.children = [];
					parent.children.push(node);
				}
			}
		});

		return roots;
	}

	private buildCategoryIDsForServer(): string | undefined {
		const selectedIds = this.selectedCategoryIDs();
		if (!selectedIds || selectedIds.length === 0) return undefined;
		// Gom tất cả IDs (bao gồm children) của từng node được chọn
		const allIds = new Set<number>();
		for (const id of selectedIds) {
			allIds.add(id);
			const ids = this.collectCategoryIds(id, this.categoryTree());
			ids.forEach(x => allIds.add(x));
		}
		if (allIds.size === 0) return undefined;
		return Array.from(allIds).join(',');
	}

	applyFilters(): void {
		this.isLoading.set(true);
		const categoryIDs = this.buildCategoryIDsForServer();
		const pageIndex = this.pageIndex();
		const pageSize = this.pageSize();

		this.productService.getProductsPaged({
			keywords: this.searchKeywords(),
			categoryIDs,
			minPrice: this.minPrice(),
			maxPrice: this.maxPrice(),
			sortBy: this.sortBy(),
			pageIndex,
			pageSize
		}).subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					const payload = (res?.data ?? res) as any;
					const list = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
					const mapped = list.map((p: any) => ({
						...p,
						ImageURL: getProductImageUrl(p.ImageURL)
					}));
					this.pagedProducts.set(mapped);
					this.total.set(payload?.total ?? 0);
					this.isLoading.set(false);
					this.cdr.markForCheck();
				});
			},
			error: (err) => {
				Promise.resolve().then(() => {
					this.pagedProducts.set([]);
					this.total.set(0);
					this.isLoading.set(false);
					this.cdr.markForCheck();
					this.notifyError(err);
				});
			}
		});
	}

	private collectCategoryIds(rootId: number, nodes: NzTreeNodeOptions[]): Set<number> {
		const ids = new Set<number>();
		const findAndCollect = (list: NzTreeNodeOptions[]) => {
			for (const n of list) {
				if (n['value'] === rootId) {
					ids.add(rootId);
					const stack = [...(n.children || [])];
					while (stack.length) {
						const cur = stack.pop()!;
						ids.add(cur['value'] as number);
						if (cur.children) stack.push(...cur.children);
					}
					return true;
				}
				if (n.children && findAndCollect(n.children)) return true;
			}
			return false;
		};
		findAndCollect(nodes);
		return ids;
	}

	onPageChange(page: number): void {
		this.pageIndex.set(page);
		this.applyFilters();
		if (typeof window !== 'undefined') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	clearFilters(): void {
		this.searchKeywords.set([]);
		this.currentKeywordInput.set('');
		this.selectedCategoryIDs.set([]);
		this.minPrice.set(null);
		this.maxPrice.set(null);
		this.sortBy.set('newest');
		this.pageIndex.set(1);
		this.applyFilters();
	}

	onKeywordInput(value: string): void {
		this.currentKeywordInput.set(value);
	}

	commitKeywordInput(): void {
		const input = this.currentKeywordInput().trim();
		if (!input) return;
		if (!this.searchKeywords().includes(input)) {
			this.searchKeywords.update(list => [...list, input]);
		}
		this.currentKeywordInput.set('');
		this.pageIndex.set(1);
		this.applyFilters();
	}

	removeKeyword(kw: string): void {
		this.searchKeywords.update(list => list.filter(x => x !== kw));
		this.pageIndex.set(1);
		this.applyFilters();
	}

	clearKeywords(): void {
		this.searchKeywords.set([]);
		this.currentKeywordInput.set('');
		this.pageIndex.set(1);
		this.applyFilters();
	}

	onCategoryChange(value: any[] | null): void {
		// nz-tree-select [nzMultiple]=true trả về string[] (keys) hoặc NzTreeNode[]
		const raw = value || [];
		const ids = raw
			.map((v: any) => {
				// Nếu là string/number → parse trực tiếp
				if (typeof v === 'string' || typeof v === 'number') return Number(v);
				// Nếu là NzTreeNode object → lấy .key hoặc .value
				if (v && (v.key || v.value)) return Number(v.key ?? v.value);
				return NaN;
			})
			.filter((v: number) => !Number.isNaN(v) && v > 0);
		this.selectedCategoryIDs.set(ids);
		this.pageIndex.set(1);
		this.applyFilters();
	}

	onSortChange(value: SortBy): void {
		this.sortBy.set(value);
		this.pageIndex.set(1);
		this.applyFilters();
	}

	onApplyPriceFilter(): void {
		this.pageIndex.set(1);
		this.applyFilters();
	}

	openFilterDrawer(): void {
		this.isFilterDrawerOpen.set(true);
	}

	closeFilterDrawer(): void {
		this.isFilterDrawerOpen.set(false);
	}

	onAddToCart(item: any): void {
		this.productService.onAddToCart({
			ID: item.ID,
			ProductName: item.ProductName,
			UnitPrice: item.UnitPrice,
			Quantity: 1
		});
		this.notification.success('Thành công', `Đã thêm "${item.ProductName}" vào giỏ hàng`);
	}

	isFavourite(item: any): boolean {
		const favourites = localStorage.getItem(FAVOURITE_KEY);
		const list = favourites ? JSON.parse(favourites) : [];
		return list.some((x: any) => x.id === item.id);
	}

	onToggleFavourite(item: any): void {
		const favourites = localStorage.getItem(FAVOURITE_KEY);
		let list = favourites ? JSON.parse(favourites) : [];

		const index = list.findIndex((x: any) => x.id === item.id);
		if (index > -1) {
			list.splice(index, 1);
		} else {
			list.push(item);
		}
		localStorage.setItem(FAVOURITE_KEY, JSON.stringify(list));
	}

	getStatusName(status: number): string {
		const map: Record<number, string> = { 1: 'Còn hàng', 2: 'Hết hàng', 3: 'Hàng mới' };
		return map[status] || '';
	}

	getStatusColor(status: number): string {
		const map: Record<number, string> = { 1: 'success', 2: 'error', 3: 'processing' };
		return map[status] || 'default';
	}

	private notifyError(err: any): void {
		this.notification.create(
			NOTIFICATION_TYPE_MAP[err.status] || 'error',
			NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
			err?.error?.message || err.message,
			{ nzStyle: { whiteSpace: 'pre-line' } }
		);
	}
}
