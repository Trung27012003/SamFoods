import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Input } from '@angular/core';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

import { PromtionService } from '../../../services/promtion-service';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { IMAGE_URL, NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../../shared/common.config';

@Component({
	selector: 'app-promotion-detail',
	imports: [
		CommonModule,
		NzIconModule,
		ReactiveFormsModule,
		NzFormModule,
		NzInputModule,
		NzInputNumberModule,
		NzButtonModule,
		NzTabsModule,
		NzSelectModule,
		NzUploadModule,
		NzDatePickerModule
	],
	templateUrl: './promotion-detail.html',
	styleUrl: './promotion-detail.css',
	standalone: true,
	providers: [PromtionService]
})
export class PromotionDetail {
	private promotionService = inject(PromtionService);
	private fb = inject(NonNullableFormBuilder);
	private modal = inject(NzModalRef<PromotionDetail>);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	@Input() promotion: any = {};

	isLoading = false;
	promotionFiles: NzUploadFile[] = [];
	dateFormat = 'dd/MM/yyyy HH:mm';

	validateForm = this.fb.group({
		ID: [0],
		STT: [1, [Validators.required, Validators.min(1)]],
		PromotionCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
		PromotionName: ['', [Validators.required, Validators.maxLength(200)]],
		PromotionContent: ['', [Validators.required, Validators.maxLength(1000)]],
		DiscountType: [1, Validators.required],
		DiscountValue: [0, [Validators.required, Validators.min(0)]],
		MinOrderAmount: [0],
		MaxDiscountAmount: [0],
		UsageLimit: [null],
		UsedCount: [0],
		DateStart: [new Date(), Validators.required],
		DateEnd: [null, Validators.required],
		BannerImg: [''],
		IsActive: [true]
	});

	discountTypeOptions = [
		{ label: 'Phần trăm (%)', value: 1 },
		{ label: 'Số tiền cố định (VNĐ)', value: 2 }
	];

	disabledDate = (current: Date): boolean => {
		const start = this.validateForm.get('DateStart')?.value;
		return start ? current.getTime() <= new Date(start).getTime() : false;
	};

	ngOnInit(): void {
		this.promotion = this.modal.getConfig().nzData?.promotion;
		if (this.promotion) {
			this.validateForm.patchValue({
				...this.promotion,
				DateStart: this.promotion.DateStart ? new Date(this.promotion.DateStart) : new Date(),
				DateEnd: this.promotion.DateEnd ? new Date(this.promotion.DateEnd) : null,
				DiscountType: this.promotion.DiscountType || 1,
				DiscountValue: this.promotion.DiscountValue || 0,
				MinOrderAmount: this.promotion.MinOrderAmount || 0,
				MaxDiscountAmount: this.promotion.MaxDiscountAmount || 0,
				UsageLimit: this.promotion.UsageLimit || null,
				UsedCount: this.promotion.UsedCount || 0,
				IsActive: this.promotion.IsActive ?? true
			});
			if (this.promotion.ID) {
				this.loadImage(this.promotion.ID);
			}
		}
	}

	handleOk(): void {
		if (this.validateForm.valid) {
			this.saveData(this.validateForm.value);
		} else {
			this.validateForm.markAllAsTouched();
		}
	}

	handleCancel(): void {
		this.modal.close();
	}

	saveData(data: any): void {
		this.isLoading = true;
		this.promotionService.saveData(data).subscribe({
			next: (res) => {
				this.uploadFile(res.data.ID);
				this.isLoading = false;
				this.notification.success(
					NOTIFICATION_TITLE_MAP[res.status as RESPONSE_STATUS],
					res.message
				);
				this.modal.close(true);
			},
			error: (err) => {
				this.isLoading = false;
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || err.message,
					{ nzStyle: { whiteSpace: 'pre-line' } }
				);
			}
		});
	}

	uploadFile(promotionID: number): void {
		const files: File[] = this.promotionFiles
			.map(f => f.originFileObj as File)
			.filter(f => !!f);

		if (files.length === 0) return;

		this.promotionService.uploadFile(files, promotionID).subscribe({
			next: () => {},
			error: (err) => {
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || err.message
				);
			}
		});
	}

	onRemoveFile = (): boolean => true;

	loadImage(id: number): void {
		this.promotionFiles = [];
		const urlImage = IMAGE_URL + '/promotion';

		this.promotionService.getByID(id).subscribe({
			next: (res) => {
				const item = res.data;
				if (item.BannerImg) {
					this.promotionFiles = [{
						uid: item.ID,
						name: item.BannerImg,
						status: 'done',
						url: urlImage + `/${item.PromotionCode}/${item.BannerImg}`,
						thumbUrl: urlImage + `/${item.PromotionCode}/${item.BannerImg}`
					}];
				}
				this.cdr.detectChanges();
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

	getDiscountDisplay(): string {
		const type = this.validateForm.get('DiscountType')?.value;
		const value = this.validateForm.get('DiscountValue')?.value;
		if (!value || value <= 0) return '';
		return type === 1 ? `${value}%` : `${this.formatCurrency(value)}`;
	}

	formatCurrency(value: number): string {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(value);
	}
}
