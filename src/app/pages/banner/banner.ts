import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { BannerService } from '../../services/banner-service';
import { ColumnTable } from '../../models/column-table';
import { NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../shared/common.config';
import { AdminPageHeader, AdminListToolbar, AdminStatusTag } from '../../shared';
import { BannerDetail } from './banner-detail/banner-detail';

@Component({
	selector: 'app-banner',
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
	templateUrl: './banner.html',
	styleUrl: './banner.css',
	standalone: true,
	providers: [BannerService, NzModalService, NzNotificationService]
})
export class Banner implements OnInit {
	private bannerService = inject(BannerService);
	private modal = inject(NzModalService);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	banners: any[] = [];
	bannersOriginal: any[] = [];

	isLoadingData = signal(false);
	isLoadingModal = signal(false);
	selectedItem: any = {};
	selectedItemRaw: any = {};
	searchValue = signal('');

	cols: ColumnTable[] = [
		{ field: 'BannerCode', header: 'Mã Banner' },
		{ field: 'BannerName', header: 'Tên Banner' },
		{ field: 'SlideshowInterval', header: 'Khoảng giãn (giây)' },
		{ field: 'StatusName', header: 'Trạng thái' }
	];

	ngOnInit(): void {
		this.loadData();
	}

	loadData(): void {
		this.isLoadingData.set(true);
		this.bannerService.getData().subscribe({
			next: (res) => {
				this.bannersOriginal = res.data.map((item: any) => ({
					...item,
					DetailCount: item.Details?.length || 0,
					StatusName: this.getStatusName(item.IsActive)
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

	getStatusName(isActive: boolean): string {
		return isActive ? 'Hoạt động' : 'Tắt';
	}

	applySearch(): void {
		const search = this.searchValue().toLowerCase().trim();
		if (!search) {
			this.banners = [...this.bannersOriginal];
		} else {
			this.banners = this.bannersOriginal.filter(item =>
				item.BannerName?.toLowerCase().includes(search) ||
				item.BannerCode?.toLowerCase().includes(search)
			);
		}
	}

	onSearch(value: string): void {
		this.searchValue.set(value);
		this.applySearch();
	}

	onRowSelect(event: any): void {
		const selectedId = event.data?.ID;
		if (selectedId) {
			this.selectedItemRaw = this.bannersOriginal.find(b => b.ID === selectedId) || event.data;
		}
	}

	onRowUnselect(event: any): void {
		this.selectedItemRaw = {};
	}

	openModal(data: any | null, isEdit: boolean): void {
		this.isLoadingModal.set(true);
		const modalRef = this.modal.create({
			nzTitle: isEdit ? 'Sửa Banner' : 'Thêm Banner',
			nzContent: BannerDetail,
			nzWidth: 800,
			nzStyle: { top: '20px' },
			nzBodyStyle: { height: '85vh', overflow: 'auto' },
			nzFooter: [
				{ label: 'Hủy', onClick: () => modalRef.close() },
				{ label: 'Lưu', type: 'primary', onClick: (c) => c?.handleOk() }
			],
			nzData: { banner: data }
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
			this.notification.warning('Thông báo', 'Vui lòng chọn một banner để sửa!');
			return;
		}
		this.openModal(this.selectedItemRaw, true);
	}

	onDelete(): void {
		if (!this.selectedItem?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một banner để xóa!');
			return;
		}

		const item = this.selectedItem;
		this.modal.confirm({
			nzTitle: 'Xác nhận xóa',
			nzContent: `<b style="color: red;">
				Bạn có chắc muốn xóa banner
				<span class="text-primary">${item.BannerName}</span> không?
			</b>`,
			nzOkText: 'Xóa',
			nzOkType: 'primary',
			nzOkDanger: true,
			nzOnOk: () => {
				this.bannerService.deleteBanner(item.ID).subscribe({
					next: (res) => {
						this.loadData();
						this.selectedItem = {};
						this.selectedItemRaw = {};
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
