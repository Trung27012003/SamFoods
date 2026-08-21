import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { TableModule } from 'primeng/table';

import { ProductService } from '../../services/product-service';
import { CategoryService } from '../../services/category-service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ColumnTable } from '../../models/column-table';
import { ProductDetail } from './product-detail/product-detail';
import { NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../shared/common.config';
import { AdminPageHeader, AdminListToolbar, AdminStatusTag } from '../../shared';
import { NzTagComponent } from "ng-zorro-antd/tag";

interface StatusOption {
	label: string;
	value: number;
}

@Component({
	selector: 'app-product',
	imports: [
    CommonModule,
    FormsModule,
    TableModule,
    NzIconModule,
    NzButtonModule,
    NzEmptyModule,
    AdminPageHeader,
    AdminListToolbar,
    AdminStatusTag,
    NzTagComponent
],
	templateUrl: './product.html',
	styleUrl: './product.css',
	standalone: true,
	providers: [ProductService, CategoryService, NzModalService, NzNotificationService],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Product implements OnInit {
	private productService = inject(ProductService);
	private categoryService = inject(CategoryService);
	private modal = inject(NzModalService);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	products: any[] = [];
	categories = signal<any[]>([]);

	totalRecords = signal(0);
	pageIndex = signal(1);
	pageSize = signal(20);

	isLoadingData = signal(false);
	isLoadingModal = signal(false);

	selectedItem: any = {};
	selectedItemRaw: any = {};
	searchKeywords = signal<string[]>([]);
	currentKeywordInput = signal('');
	selectedCategory = signal<number | null>(null);
	selectedStatus = signal<number | null>(null);

	statusOptions: StatusOption[] = [
		{ label: 'Còn hàng', value: 1 },
		{ label: 'Hết hàng', value: 2 },
		{ label: 'Hàng mới', value: 3 }
	];

	get categoryOptions() {
		return (this.categories() || []).map(c => ({ label: c.CategoryName, value: c.ID }));
	}

	cols: ColumnTable[] = [
		{ field: 'ProductCode', header: 'Mã SP' },
		{ field: 'ProductName', header: 'Tên sản phẩm' },
		{ field: 'CategoryNamesDisplay', header: 'Danh mục' },
		{ field: 'UnitPrice', header: 'Đơn giá' },
		{ field: 'UnitName', header: 'ĐVT' },
		{ field: 'StatusName', header: 'Tình trạng' }
	];

	ngOnInit(): void {
		this.loadCategories();
		this.loadData();
	}

	loadCategories(): void {
		this.categoryService.getData().subscribe({
			next: (res) => {
				this.categories.set(res.data || []);
				this.cdr.markForCheck();
			},
			error: (err) => {
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || err.message
				);
			}
		});
	}

	loadData(): void {
		this.isLoadingData.set(true);
		this.productService.getProductsPaged({
			keywords: this.searchKeywords(),
			categoryID: this.selectedCategory(),
			status: this.selectedStatus(),
			sortBy: 'newest',
			pageIndex: this.pageIndex(),
			pageSize: this.pageSize()
		}).subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					const payload = (res?.data ?? res) as any;
					const list = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
					this.products = list.map((item: any) => ({
						...item,
						StatusName: this.getStatusName(item.Status),
						UnitPrice: this.formatCurrency(item.UnitPrice),
						CategoryNamesDisplay: this.parseCategoryNames(item.CategoryNames)
					}));
					this.totalRecords.set(payload?.total ?? list.length);
					this.isLoadingData.set(false);
					this.cdr.markForCheck();
					this.cdr.detectChanges();
				});
			},
			error: (err) => {
				Promise.resolve().then(() => {
					this.products = [];
					this.totalRecords.set(0);
					this.isLoadingData.set(false);
					this.cdr.markForCheck();
					this.cdr.detectChanges();
					this.notification.create(
						NOTIFICATION_TYPE_MAP[err.status] || 'error',
						NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
						err?.error?.message || err.message,
						{ nzStyle: { whiteSpace: 'pre-line' } }
					);
				});
			}
		});
	}

	getStatusName(status: number): string {
		const statusMap: Record<number, string> = {
			1: 'Còn hàng',
			2: 'Hết hàng',
			3: 'Hàng mới'
		};
		return statusMap[status] || 'Không xác định';
	}

	formatCurrency(value: number): string {
		if (value == null || value === 0) return '0';
		return new Intl.NumberFormat('en-US').format(value);
	}

	applyFilters(): void {
		this.pageIndex.set(1);
		this.loadData();
	}

	private parseCategoryNames(raw: any): string[] {
		if (Array.isArray(raw)) return raw.filter((x: any) => x != null && x !== '');
		if (raw == null || raw === '') return [];
		return String(raw).split(',').map(x => x.trim()).filter(Boolean);
	}

	onSearch(value: string): void {
		this.onKeywordInput(value);
		this.commitKeywordInput();
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
		this.applyFilters();
	}

	removeKeyword(kw: string): void {
		this.searchKeywords.update(list => list.filter(x => x !== kw));
		this.applyFilters();
	}

	clearKeywords(): void {
		this.searchKeywords.set([]);
		this.currentKeywordInput.set('');
		this.applyFilters();
	}

	onCategoryChange(value: number | null): void {
		this.selectedCategory.set(value);
		this.applyFilters();
	}

	onStatusChange(value: number | null): void {
		this.selectedStatus.set(value);
		this.applyFilters();
	}

	onFilterChange(e: { key: string; value: any }): void {
		if (e.key === 'category') this.onCategoryChange(e.value ?? null);
		if (e.key === 'status') this.onStatusChange(e.value ?? null);
	}

	onPageChange(event: { first?: number; rows?: number; page?: number }): void {
		const page = (event?.page ?? 0) + 1; // PrimeNG uses 0-based page
		const rows = event?.rows ?? this.pageSize();
		this.pageIndex.set(page);
		this.pageSize.set(rows);
		this.loadData();
	}

	onRowSelect(event: any): void {
		const selectedId = event.data?.ID;
		if (selectedId) {
			this.selectedItemRaw = this.products.find(p => p.ID === selectedId) || event.data;
		}
	}

	onRowUnselect(event: any): void {
		this.selectedItemRaw = {};
	}

	clearFilters(): void {
		this.searchKeywords.set([]);
		this.currentKeywordInput.set('');
		this.selectedCategory.set(null);
		this.selectedStatus.set(null);
		this.applyFilters();
	}

	openModal(data: any | null, isEdit: boolean): void {
		const modalRef = this.modal.create({
			nzTitle: isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm',
			nzContent: ProductDetail,
			nzWidth: '80vw',
			nzStyle: { top: '20px' },
			nzBodyStyle: { height: '85vh', overflow: 'auto' },
			nzFooter: [
				{ label: 'Hủy', onClick: () => modalRef.close() },
				{
					label: 'Lưu',
					type: 'primary',
					loading: () => this.isLoadingModal(),
					onClick: (componentInstance: any) => {
						if (componentInstance?.isLoading?.()) {
							return;
						}
						componentInstance?.handleOk();
					}
				}
			],
			nzData: { product: data }
		});

		modalRef.afterClose.subscribe(result => {
			if (result) {
				this.loadData();
			}
			this.isLoadingModal.set(false);
		});
	}

	onCreate(): void {
		this.openModal(null, false);
	}

	onEdit(): void {
		if (!this.selectedItem?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một sản phẩm để sửa!');
			return;
		}
		this.openModal(this.selectedItemRaw, true);
	}

	onDelete(): void {
		if (!this.selectedItem?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một sản phẩm để xóa!');
			return;
		}

		this.modal.confirm({
			nzTitle: 'Xác nhận xóa',
			nzContent: `<b style="color: red;">
				Bạn có chắc muốn xóa sản phẩm
				<span class="text-primary">${this.selectedItem.ProductName}</span> không?
			</b>`,
			nzOkText: 'Xóa',
			nzOkType: 'primary',
			nzOkDanger: true,
			nzOnOk: () => {
				const data = { ID: this.selectedItem.ID, IsDeleted: true };
				this.productService.saveData(data).subscribe({
					next: (res) => {
						this.loadData();
						this.notification.success(
							NOTIFICATION_TITLE_MAP[res.status as RESPONSE_STATUS],
							res.message
						);
					},
					error: (err) => {
						this.notification.create(
							NOTIFICATION_TYPE_MAP[err.status] || 'error',
							NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
							err?.error?.message || err.message,
							{ nzStyle: { whiteSpace: 'pre-line' } }
						);
					}
				});
			},
			nzCancelText: 'Hủy'
		});
	}
}
