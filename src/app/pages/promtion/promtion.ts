import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { TableModule } from 'primeng/table';

import { PromtionService } from '../../services/promtion-service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ColumnTable } from '../../models/column-table';
import { PromotionDetail } from './promotion-detail/promotion-detail';
import { NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../shared/common.config';
import { AdminPageHeader, AdminListToolbar, AdminStatusTag } from '../../shared';
import { AdminStatusColor } from '../../shared/status-maps';

@Component({
	selector: 'app-promtion',
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		NzIconModule,
		NzButtonModule,
		NzEmptyModule,
		AdminPageHeader,
		AdminListToolbar,
		AdminStatusTag
	],
	templateUrl: './promtion.html',
	styleUrl: './promtion.css',
	standalone: true,
	providers: [PromtionService, NzModalService, NzNotificationService]
})
export class Promtion implements OnInit {
	private promotionService = inject(PromtionService);
	private modal = inject(NzModalService);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	promotions: any[] = [];
	promotionsOriginal: any[] = [];

	isLoadingData = signal(false);
	isLoadingModal = signal(false);
	selectedItem: any = {};
	searchValue = signal('');

	cols: ColumnTable[] = [
		{ field: 'PromotionCode', header: 'Mã KM' },
		{ field: 'PromotionName', header: 'Tên khuyến mại' },
		{ field: 'DiscountDisplay', header: 'Giảm giá' },
		{ field: 'DateStart', header: 'Bắt đầu' },
		{ field: 'DateEnd', header: 'Kết thúc' },
		{ field: 'StatusText', header: 'Trạng thái' }
	];

	ngOnInit(): void {
		this.loadData();
	}

	loadData(): void {
		this.isLoadingData.set(true);
		this.promotionService.getData().subscribe({
			next: (res) => {
				this.promotionsOriginal = res.data.map((item: any) => ({
					...item,
					DateStart: this.formatDate(item.DateStart),
					DateEnd: this.formatDate(item.DateEnd),
					DiscountDisplay: this.getDiscountDisplay(item),
					StatusText: this.getStatusText(item)
				}));
				this.applySearch();
				this.isLoadingData.set(false);
			},
			error: (err) => {
				this.isLoadingData.set(false);
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || err.message,
					{ nzStyle: { whiteSpace: 'pre-line' } }
				);
			}
		});
	}

	formatDate(date: string | Date): string {
		if (!date) return '-';
		const d = new Date(date);
		return d.toLocaleDateString('vi-VN', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	getDiscountDisplay(item: any): string {
		if (!item.DiscountValue || item.DiscountValue <= 0) return '-';
		if (item.DiscountType === 1) {
			return `${item.DiscountValue}%`;
		}
		return this.formatCurrency(item.DiscountValue);
	}

	formatCurrency(value: number): string {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
			maximumFractionDigits: 0
		}).format(value);
	}

	getStatusText(item: any): string {
		const now = new Date();
		const start = item.DateStart ? new Date(item.DateStart) : null;
		const end = item.DateEnd ? new Date(item.DateEnd) : null;

		if (!item.IsActive) return 'Đã tắt';
		if (start && now < start) return 'Sắp diễn ra';
		if (end && now > end) return 'Đã hết hạn';
		return 'Đang hoạt động';
	}

	getStatusColor(item: any): AdminStatusColor {
		const text = this.getStatusText(item);
		switch (text) {
			case 'Đang hoạt động': return 'success';
			case 'Sắp diễn ra': return 'processing';
			case 'Đã hết hạn':
			case 'Đã tắt': return 'error';
			default: return 'default';
		}
	}

	applySearch(): void {
		const search = this.searchValue().toLowerCase().trim();
		if (!search) {
			this.promotions = [...this.promotionsOriginal];
		} else {
			this.promotions = this.promotionsOriginal.filter(item =>
				item.PromotionName?.toLowerCase().includes(search) ||
				item.PromotionCode?.toLowerCase().includes(search) ||
				item.PromotionContent?.toLowerCase().includes(search)
			);
		}
	}

	onSearch(value: string): void {
		this.searchValue.set(value);
		this.applySearch();
	}

	openModal(data: any | null): void {
		this.isLoadingModal.set(true);
		const modalRef = this.modal.create({
			nzTitle: data ? 'Sửa khuyến mại' : 'Thêm khuyến mại',
			nzContent: PromotionDetail,
			nzWidth: '70vw',
			nzStyle: { top: '20px' },
			nzBodyStyle: { height: '80vh', overflow: 'auto' },
			nzFooter: [
				{ label: 'Hủy', onClick: () => modalRef.close() },
				{ label: 'Lưu', type: 'primary', onClick: (c) => c?.handleOk() }
			],
			nzData: { promotion: data }
		});

		modalRef.afterClose.subscribe(result => {
			if (result) {
				this.loadData();
			}
			this.isLoadingModal.set(false);
		});
	}

	onCreate(): void {
		this.openModal(null);
	}

	onEdit(item?: any): void {
		if (item) {
			this.selectedItem = item;
		}
		if (!this.selectedItem?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một khuyến mại để sửa!');
			return;
		}
		this.openModal(this.selectedItem);
	}

	onDelete(): void {
		if (!this.selectedItem?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một khuyến mại để xóa!');
			return;
		}

		this.modal.confirm({
			nzTitle: 'Xác nhận xóa',
			nzContent: `<b style="color: red;">
				Bạn có chắc muốn xóa khuyến mại
				<span class="text-primary">${this.selectedItem.PromotionName}</span> không?
			</b>`,
			nzOkText: 'Xóa',
			nzOkType: 'primary',
			nzOkDanger: true,
			nzOnOk: () => {
				const data = { ID: this.selectedItem.ID, IsDeleted: true };
				this.promotionService.saveData(data).subscribe({
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
