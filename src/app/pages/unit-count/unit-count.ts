import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { TableModule } from 'primeng/table';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { UnitCountDetail } from './unit-count-detail/unit-count-detail';
import { UnitCountService } from '../../services/unit-count-service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ColumnTable } from '../../models/column-table';
import { NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../shared/common.config';
import { AdminPageHeader, AdminListToolbar } from '../../shared';

@Component({
	selector: 'app-unit-count',
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		NzIconModule,
		NzButtonModule,
		NzEmptyModule,
		AdminPageHeader,
		AdminListToolbar
	],
	templateUrl: './unit-count.html',
	styleUrl: './unit-count.css',
	standalone: true,
	providers: [UnitCountService, NzModalService, NzNotificationService]
})
export class UnitCount implements OnInit {
	private unitService = inject(UnitCountService);
	private modal = inject(NzModalService);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	unitCounts: any[] = [];
	unitCountsOriginal: any[] = [];

	isLoadingData = signal(false);
	isLoadingModal = signal(false);
	selectedItem: any = {};
	searchValue = signal('');

	cols: ColumnTable[] = [
		{ field: 'UnitCode', header: 'Mã đơn vị' },
		{ field: 'UnitName', header: 'Tên đơn vị' },
		{ field: 'Descriptions', header: 'Mô tả' }
	];

	ngOnInit(): void {
		this.loadData();
	}

	loadData(): void {
		this.isLoadingData.set(true);
		this.unitService.getData().subscribe({
			next: (res) => {
				this.unitCountsOriginal = res.data;
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

	applySearch(): void {
		const search = this.searchValue().toLowerCase().trim();
		if (!search) {
			this.unitCounts = [...this.unitCountsOriginal];
		} else {
			this.unitCounts = this.unitCountsOriginal.filter(item =>
				item.UnitCode?.toLowerCase().includes(search) ||
				item.UnitName?.toLowerCase().includes(search) ||
				item.Descriptions?.toLowerCase().includes(search)
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
			nzTitle: data ? 'Sửa đơn vị tính' : 'Thêm đơn vị tính',
			nzContent: UnitCountDetail,
			nzWidth: 600,
			nzFooter: [
				{ label: 'Hủy', onClick: () => modalRef.close() },
				{ label: 'Lưu', type: 'primary', onClick: (c) => c?.handleOk() }
			],
			nzData: { unitCount: data }
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
			this.notification.warning('Thông báo', 'Vui lòng chọn một đơn vị tính để sửa!');
			return;
		}
		this.openModal(this.selectedItem);
	}

	onDelete(): void {
		if (!this.selectedItem?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một đơn vị tính để xóa!');
			return;
		}

		this.modal.confirm({
			nzTitle: 'Xác nhận xóa',
			nzContent: `<b style="color: red;">
				Bạn có chắc muốn xóa đơn vị tính
				<span class="text-primary">${this.selectedItem.UnitName}</span> không?
			</b>`,
			nzOkText: 'Xóa',
			nzOkType: 'primary',
			nzOkDanger: true,
			nzOnOk: () => {
				const data = { ID: this.selectedItem.ID, IsDeleted: true };
				this.unitService.saveData(data).subscribe({
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
