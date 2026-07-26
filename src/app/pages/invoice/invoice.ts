import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { TableModule } from 'primeng/table';

import { InvoiceService } from '../../services/invoice-service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ColumnTable } from '../../models/column-table';
import { InvoiceDetail } from './invoice-detail/invoice-detail';
import { InvoiceStatsModel } from '../../models/invoice-stats-model';
import {
	NOTIFICATION_TITLE_MAP,
	NOTIFICATION_TYPE_MAP,
	RESPONSE_STATUS,
	formatCurrency,
	formatDateTime
} from '../../shared/common.config';
import { AdminPageHeader, AdminListToolbar, AdminStatusTag, AdminStatusColor, CurrencyVndPipe } from '../../shared';

interface StatusOption {
	label: string;
	value: number;
	color: string;
}

@Component({
	selector: 'app-invoice',
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		NzIconModule,
		NzButtonModule,
		NzEmptyModule,
		NzDropDownModule,
		NzMenuModule,
		AdminPageHeader,
		AdminListToolbar,
		AdminStatusTag,
		CurrencyVndPipe
	],
	templateUrl: './invoice.html',
	styleUrl: './invoice.css',
	standalone: true,
	providers: [InvoiceService, NzModalService, NzNotificationService]
})
export class Invoice implements OnInit {
	private invoiceService = inject(InvoiceService);
	private modal = inject(NzModalService);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	invoices: any[] = [];
	invoicesRaw: any[] = [];

	isLoadingData = signal(false);
	isLoadingModal = signal(false);

	stats = signal<InvoiceStatsModel | null>(null);

	selectedItem: any = {};
	selectedItemRaw: any = {};
	searchValue = signal('');
	selectedStatus = signal<number | null>(null);

	statusOptions: StatusOption[] = [
		{ label: 'Mới', value: 0, color: 'processing' },
		{ label: 'Đang giao', value: 2, color: 'warning' },
		{ label: 'Hoàn thành', value: 3, color: 'success' },
		{ label: 'Đã huỷ', value: 4, color: 'error' }
	];

	changeableStatusOptions: StatusOption[] = [
		{ label: 'Đang giao', value: 2, color: 'warning' },
		{ label: 'Hoàn thành', value: 3, color: 'success' },
		{ label: 'Huỷ đơn', value: 4, color: 'error' }
	];

	/** Filter dropdown cho AdminListToolbar (thêm "Tất cả" trên cùng, "Đã huỷ" dưới cùng) */
	get filterStatusOptions(): { label: string; value: number | string }[] {
		return [
			{ label: 'Tất cả', value: 'all' },
			...this.statusOptions.filter(s => s.value !== 4),
			{ label: 'Đã huỷ', value: 4 }
		];
	}

	get hasSelection(): boolean {
		return !!this.selectedItemRaw?.ID;
	}

	get currentInvoice(): any {
		return this.selectedItemRaw?.ID ? this.selectedItemRaw : this.selectedItem;
	}

	cols: ColumnTable[] = [
		{ field: 'BillCode', header: 'Mã đơn' },
		{ field: 'CustomerName', header: 'Khách hàng' },
		{ field: 'PhoneNumber', header: 'SĐT' },
		{ field: 'Address', header: 'Địa chỉ' },
		{ field: 'TotalAmountText', header: 'Tổng tiền' },
		{ field: 'StatusName', header: 'Trạng thái' },
		{ field: 'BillDateText', header: 'Ngày đặt' }
	];

	ngOnInit(): void {
		this.reloadAll();
	}

	reloadAll(): void {
		this.loadData();
		this.loadStats();
	}

	loadStats(): void {
		this.invoiceService.getStats().subscribe({
			next: (res) => {
				if (res?.data) this.stats.set(res.data);
			},
			error: () => this.stats.set(null)
		});
	}

	loadData(): void {
		this.isLoadingData.set(true);
		this.invoiceService.getData().subscribe({
			next: (res) => {
				this.invoicesRaw = (res.data || []).map((item: any) => ({
					...item,
					StatusName: this.getStatusName(item.Status),
					TotalAmountText: formatCurrency(item.TotalAmount),
					BillDateText: formatDateTime(item.BillDate)
				}));
				this.applyFilters();
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

	getStatusName(status: number): string {
		if (status === 4 || status === undefined || status === null) return 'Đã huỷ';
		const found = this.statusOptions.find(s => s.value === status);
		return found ? found.label : 'Đã huỷ';
	}

	getStatusColor(status: number): AdminStatusColor {
		if (status === 4 || status === undefined || status === null) return 'error';
		const found = this.statusOptions.find(s => s.value === status);
		return (found?.color as AdminStatusColor) || 'default';
	}

	applyFilters(): void {
		const search = this.searchValue().toLowerCase().trim();
		const status = this.selectedStatus();

		const filtered = this.invoicesRaw.filter(item => {
			const matchSearch = !search ||
				item.BillCode?.toLowerCase().includes(search) ||
				item.CustomerName?.toLowerCase().includes(search) ||
				item.PhoneNumber?.toLowerCase().includes(search);
			const matchStatus = status === null || item.Status === status;
			return matchSearch && matchStatus;
		});

		this.invoices = filtered.map((item: any) => ({
			...item,
			StatusName: this.getStatusName(item.Status),
			TotalAmountText: formatCurrency(item.TotalAmount),
			BillDateText: formatDateTime(item.BillDate)
		}));
	}

	onSearch(value: string): void {
		this.searchValue.set(value);
		this.applyFilters();
	}

	onStatusChange(value: number | null): void {
		this.selectedStatus.set(value);
		this.applyFilters();
	}

	/** Map filter dropdown value -> selectedStatus (signal) */
	get filterStatusValue(): (() => number | string | null) {
		return () => {
			const s = this.selectedStatus();
			return s === null ? 'all' : s;
		};
	}

	onFilterChange(e: { key: string; value: any }): void {
		if (e.key === 'status') {
			const v = e.value;
			if (v === 'all' || v === null || v === undefined) {
				this.onStatusChange(null);
			} else {
				this.onStatusChange(Number(v));
			}
		}
	}

	clearFilters(): void {
		this.searchValue.set('');
		this.selectedStatus.set(null);
		this.applyFilters();
	}

	onRowSelect(event: any): void {
		const selectedId = event.data?.ID;
		if (selectedId) {
			this.selectedItemRaw = this.invoicesRaw.find(i => i.ID === selectedId) || event.data;
		}
	}

	onRowUnselect(event: any): void {
		this.selectedItemRaw = {};
	}

	openModal(data: any, mode: 'view' | 'edit'): void {
		const invoiceId = data?.ID;
		if (!invoiceId) {
			this.notification.warning('Thông báo', 'Không tìm thấy mã đơn hàng hợp lệ!');
			return;
		}

		this.isLoadingModal.set(true);
		this.invoiceService.getByID(invoiceId).subscribe({
			next: (res) => {
				const payload = res?.data ?? {};
				// Backend GET /api/invoice/{id} trả { invoice, details }
				const invoiceDetail = payload.invoice ?? payload;
				const detailItems = payload.details ?? invoiceDetail?.InvoiceDetails ?? [];
				const merged = { ...invoiceDetail, InvoiceDetails: detailItems };
				this.showModal(merged, mode);
			},
			error: (err) => {
				// Fallback: dùng data từ list nếu API detail lỗi
				this.showModal(data, mode);
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'warning',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Cảnh báo',
					`Không tải được chi tiết đơn hàng (${err?.error?.message || err.message}). Hiển thị dữ liệu tạm.`,
					{ nzStyle: { whiteSpace: 'pre-line' } }
				);
			}
		});
	}

	private showModal(invoiceData: any, mode: 'view' | 'edit'): void {
		const modalRef: any = this.modal.create({
			nzTitle: mode === 'view' ? 'Chi tiết đơn hàng' : 'Sửa đơn hàng',
			nzContent: InvoiceDetail,
			nzWidth: 800,
			nzStyle: { top: '20px' },
			nzBodyStyle: { maxHeight: '85vh', overflow: 'auto' },
			nzFooter: mode === 'view'
				? [
					{
						label: 'Đóng',
						onClick: (): void => modalRef.close()
					}
				]
				: [
					{
						label: 'Hủy',
						onClick: (): void => modalRef.close()
					},
					{
						label: 'Lưu',
						type: 'primary',
						loading: (componentInstance?: any): boolean => !!componentInstance?.isLoading?.(),
						onClick: (componentInstance?: any): void => {
							if (componentInstance?.isLoading?.()) return;
							componentInstance?.handleOk();
						}
					}
				],
			nzData: { invoice: invoiceData, mode }
		});

		modalRef.afterClose.subscribe((result: any) => {
			if (result) this.reloadAll();
			this.isLoadingModal.set(false);
		});
	}

	onViewDetail(): void {
		const item = this.selectedItemRaw?.ID ? this.selectedItemRaw : this.selectedItem;
		if (!item?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một đơn hàng để xem chi tiết!');
			return;
		}
		this.openModal(item, 'view');
	}

	onEdit(): void {
		const item = this.selectedItemRaw?.ID ? this.selectedItemRaw : this.selectedItem;
		if (!item?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một đơn hàng để sửa!');
			return;
		}
		this.openModal(item, 'edit');
	}

	onChangeStatus(targetStatus: number): void {
		const item = this.currentInvoice;
		if (!item?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một đơn hàng để đổi trạng thái!');
			return;
		}

		const targetOpt = this.changeableStatusOptions.find(s => s.value === targetStatus);
		if (!targetOpt) return;

		const currentStatus = item.Status;
		if (currentStatus === targetStatus) {
			this.notification.info('Thông báo', `Đơn hàng đã ở trạng thái "${targetOpt.label}".`);
			return;
		}

		const isCancel = targetStatus === 4;
		this.modal.confirm({
			nzTitle: 'Xác nhận đổi trạng thái',
			nzContent: `
				<div style="line-height: 1.7;">
					<div>Đơn hàng <b style="color: var(--brand-primary);">${item.BillCode || '#' + item.ID}</b></div>
					<div>Hiện tại: <b>${this.getStatusName(currentStatus)}</b></div>
					<div>Chuyển sang: <b style="color: ${isCancel ? 'var(--color-error)' : 'var(--brand-primary)'};">${targetOpt.label}</b></div>
				</div>
			`,
			nzOkText: targetOpt.label,
			nzOkType: 'primary',
			nzOkDanger: isCancel,
			nzCancelText: 'Hủy',
			nzOnOk: () => {
				this.invoiceService.updateStatus({
					ID: item.ID,
					Status: targetStatus,
					Note: item.Note ?? ''
				}).subscribe({
					next: (res) => {
						this.notification.success(
							NOTIFICATION_TITLE_MAP[res.status as RESPONSE_STATUS] || 'Thành công',
							res.message || `Đã chuyển đơn sang trạng thái "${targetOpt.label}".`
						);
						this.reloadAll();
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
			}
		});
	}

	onDelete(): void {
		const item = this.currentInvoice;
		if (!item?.ID) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một đơn hàng để xóa!');
			return;
		}

		const target = item;
		this.modal.confirm({
			nzTitle: 'Xác nhận xóa',
			nzContent: `<b style="color: red;">
				Bạn có chắc muốn xóa đơn hàng
				<span class="text-primary">${target.BillCode || target.ID}</span> không?
			</b>`,
			nzOkText: 'Xóa',
			nzOkType: 'primary',
			nzOkDanger: true,
			nzOnOk: () => {
				this.invoiceService.softDelete(target.ID).subscribe({
					next: (res) => {
						this.reloadAll();
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
