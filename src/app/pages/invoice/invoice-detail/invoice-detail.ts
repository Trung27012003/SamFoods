import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzBreakpointEnum } from 'ng-zorro-antd/core/services';

import { InvoiceService } from '../../../services/invoice-service';
import {
	NOTIFICATION_TITLE_MAP,
	NOTIFICATION_TYPE_MAP,
	RESPONSE_STATUS,
	formatCurrency,
	formatDateTime
} from '../../../shared/common.config';

interface StatusOption {
	label: string;
	value: number;
}

interface ModalData {
	invoice: any;
	mode?: 'view' | 'edit';
}

@Component({
	selector: 'app-invoice-detail',
	imports: [
		CommonModule,
		ReactiveFormsModule,
		NzIconModule,
		NzFormModule,
		NzInputModule,
		NzButtonModule,
		NzRadioModule,
		NzSpinModule,
		NzDividerModule,
		NzDescriptionsModule,
		NzEmptyModule
	],
	templateUrl: './invoice-detail.html',
	standalone: true,
	providers: [InvoiceService]
})
export class InvoiceDetail implements OnInit {
	private invoiceService = inject(InvoiceService);
	private fb = inject(NonNullableFormBuilder);
	private modal = inject(NzModalRef<InvoiceDetail>);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);
	private modalData = inject(NZ_MODAL_DATA, { optional: true }) as ModalData | null;

	invoice: any = {};
	mode: 'view' | 'edit' = 'view';

	isLoading = signal(false);

	statusOptions: StatusOption[] = [
		{ label: 'Mới', value: 0 },
		{ label: 'Đang giao', value: 2 },
		{ label: 'Hoàn thành', value: 3 }
	];

	details: any[] = [];

	validateForm: FormGroup = this.fb.group({
		Status: [0, Validators.required],
		Note: ['']
	});

	ngOnInit(): void {
		if (this.modalData) {
			this.invoice = this.modalData.invoice ?? {};
			this.mode = this.modalData.mode ?? 'view';
		}

		// Load chi tiết sản phẩm: ưu tiên data truyền vào, nếu thiếu thì gọi API
		const hasDetails = Array.isArray(this.invoice?.InvoiceDetails) && this.invoice.InvoiceDetails.length > 0;
		const idFromInvoice = this.invoice?.ID ?? this.invoice?.id;

		if (hasDetails) {
			this.details = this.invoice.InvoiceDetails;
			this.populateForm();
		} else if (idFromInvoice) {
			this.isLoading.set(true);
			this.invoiceService.getByID(idFromInvoice).subscribe({
				next: (res) => {
					// Backend GET /api/invoice/{id} trả { invoice, details }
					const payload = res?.data ?? {};
					const invoiceObj = payload.invoice ?? payload;
					const detailItems = payload.details ?? invoiceObj?.InvoiceDetails ?? [];
					this.invoice = { ...this.invoice, ...invoiceObj, InvoiceDetails: detailItems };
					this.details = detailItems;
					this.populateForm();
					this.isLoading.set(false);
				},
				error: (err) => {
					this.isLoading.set(false);
					this.details = this.invoice?.InvoiceDetails || [];
					this.populateForm();
					this.notification.create(
						NOTIFICATION_TYPE_MAP[err.status] || 'warning',
						NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Cảnh báo',
						`Không tải được chi tiết sản phẩm (${err?.error?.message || err.message}).`,
						{ nzStyle: { whiteSpace: 'pre-line' } }
					);
				}
			});
			return;
		}

		this.populateForm();
	}

	private populateForm(): void {
		this.validateForm.patchValue({
			Status: this.invoice?.Status ?? 0,
			Note: this.invoice?.Note ?? ''
		});
	}

	get isReadonly(): boolean {
		return this.mode === 'view';
	}

	formatCurrency(value: number | null | undefined): string {
		return formatCurrency(value);
	}

	formatDateTime(value: any): string {
		return formatDateTime(value);
	}

	getSubTotal(detail: any): number {
		return (detail.Quantity ?? 0) * (detail.UnitPrice ?? 0);
	}

	getTotal(): number {
		return this.details.reduce((sum, d) => sum + this.getSubTotal(d), 0);
	}

	handleOk(): void {
		if (this.isReadonly) {
			this.modal.close();
			return;
		}

		this.validateForm.markAllAsTouched();
		if (this.validateForm.invalid) return;

		const formValue = this.validateForm.value;
		const payload = {
			ID: this.invoice?.ID,
			Status: formValue.Status,
			Note: formValue.Note ?? ''
		};

		this.isLoading.set(true);
		this.invoiceService.updateStatus(payload).subscribe({
			next: (res) => {
				this.isLoading.set(false);
				this.notification.success(
					NOTIFICATION_TITLE_MAP[res.status as RESPONSE_STATUS],
					res.message || 'Cập nhật đơn hàng thành công'
				);
				this.modal.close(true);
			},
			error: (err) => {
				this.isLoading.set(false);
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || err.message,
					{ nzStyle: { whiteSpace: 'pre-line' } }
				);
			}
		});
	}
}
