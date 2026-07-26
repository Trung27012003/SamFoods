import { Component, inject, OnInit, signal } from '@angular/core';
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

import { ProductService } from '../../services/product-service';
import { CategoryService } from '../../services/category-service';
import { UnitCountService } from '../../services/unit-count-service';
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
		NzSpinModule
	],
	templateUrl: './products-list.html',
	styleUrl: './products-list.css',
	standalone: true,
	providers: [ProductService, CategoryService, UnitCountService]
})
export class ProductsList implements OnInit {
	private productService = inject(ProductService);
	private categoryService = inject(CategoryService);
	private unitService = inject(UnitCountService);
	private notification = inject(NzNotificationService);
	private route = inject(ActivatedRoute);

	searchKeyword = signal('');
	selectedCategoryID = signal<number | null>(null);
	selectedStatus = signal<number | null>(null);
	minPrice = signal<number | null>(null);
	maxPrice = signal<number | null>(null);
	selectedUnitCountID = signal<number | null>(null);
	sortBy = signal<SortBy>('newest');
	pageIndex = signal(1);
	pageSize = signal(12);

	allProducts = signal<any[]>([]);
	filteredProducts = signal<any[]>([]);
	pagedProducts = signal<any[]>([]);
	total = signal(0);
	isLoading = signal(false);

	categoryTree = signal<NzTreeNodeOptions[]>([]);
	unitCounts = signal<any[]>([]);

	isFilterDrawerOpen = signal(false);

	statusOptions = [
		{ label: 'Còn hàng', value: 1 },
		{ label: 'Hết hàng', value: 2 },
		{ label: 'Hàng mới', value: 3 }
	];

	sortOptions: { label: string; value: SortBy }[] = [
		{ label: 'Mới nhất', value: 'newest' },
		{ label: 'Giá tăng dần', value: 'price_asc' },
		{ label: 'Giá giảm dần', value: 'price_desc' },
		{ label: 'Tên A-Z', value: 'name_asc' }
	];

	ngOnInit(): void {
		this.loadCategories();
		this.loadUnitCounts();
		this.loadProducts();

		// Đọc keyword từ query param (?keyword=...) do header search truyền sang
		this.route.queryParamMap.subscribe(params => {
			const keyword = (params.get('keyword') || '').trim();
			if (keyword) {
				this.searchKeyword.set(keyword);
				this.applyFilters();
			}
		});
	}

	loadCategories(): void {
		this.categoryService.getData().subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					this.categoryTree.set(this.buildTreeOptions(res.data || []));
				});
			},
			error: (err) => this.notifyError(err)
		});
	}

	loadUnitCounts(): void {
		this.unitService.getData().subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					this.unitCounts.set(res.data || []);
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
	}	loadProducts(): void {
		this.isLoading.set(true);
		this.productService.getData('').subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					const raw = res.data || [];
					const list = Array.isArray(raw) ? raw : [];
					const mapped = list.map((p: any) => ({
						...p,
						ImageURL: getProductImageUrl(p.ImageURL)
					}));
					this.allProducts.set(mapped);
					this.applyFilters();
					this.isLoading.set(false);
				});
			},
			error: (err) => {
				this.isLoading.set(false);
				this.notifyError(err);
			}
		});
	}

	applyFilters(): void {
		const keyword = this.searchKeyword().toLowerCase().trim();
		const categoryId = this.selectedCategoryID();
		const status = this.selectedStatus();
		const minP = this.minPrice();
		const maxP = this.maxPrice();
		const unitId = this.selectedUnitCountID();
		const sort = this.sortBy();

		// Build set of valid category IDs if a parent is selected (include children)
		const validCategoryIds = categoryId != null
			? this.collectCategoryIds(categoryId, this.categoryTree())
			: null;

		let filtered = this.allProducts().filter((p: any) => {
			if (keyword) {
				const name = (p.ProductName || '').toLowerCase();
				const code = (p.ProductCode || '').toLowerCase();
				if (!name.includes(keyword) && !code.includes(keyword)) return false;
			}
			if (validCategoryIds && !validCategoryIds.has(p.CategoryID)) return false;
			if (status != null && p.Status !== status) return false;
			if (minP != null && p.UnitPrice < minP) return false;
			if (maxP != null && p.UnitPrice > maxP) return false;
			if (unitId != null && p.UnitCountID !== unitId) return false;
			return true;
		});

		filtered = this.sortProducts(filtered, sort);

		this.filteredProducts.set(filtered);
		this.total.set(filtered.length);
		this.pageIndex.set(1);
		this.applyPagination();
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

	private sortProducts(list: any[], sort: SortBy): any[] {
		const arr = [...list];
		switch (sort) {
			case 'price_asc':
				arr.sort((a, b) => (a.UnitPrice || 0) - (b.UnitPrice || 0));
				break;
			case 'price_desc':
				arr.sort((a, b) => (b.UnitPrice || 0) - (a.UnitPrice || 0));
				break;
			case 'name_asc':
				arr.sort((a, b) => (a.ProductName || '').localeCompare(b.ProductName || ''));
				break;
			case 'newest':
			default:
				arr.sort((a, b) => (b.ID || 0) - (a.ID || 0));
		}
		return arr;
	}

	applyPagination(): void {
		const start = (this.pageIndex() - 1) * this.pageSize();
		const end = start + this.pageSize();
		this.pagedProducts.set(this.filteredProducts().slice(start, end));
	}

	onPageChange(page: number): void {
		this.pageIndex.set(page);
		this.applyPagination();
		if (typeof window !== 'undefined') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	clearFilters(): void {
		this.searchKeyword.set('');
		this.selectedCategoryID.set(null);
		this.selectedStatus.set(null);
		this.minPrice.set(null);
		this.maxPrice.set(null);
		this.selectedUnitCountID.set(null);
		this.sortBy.set('newest');
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
