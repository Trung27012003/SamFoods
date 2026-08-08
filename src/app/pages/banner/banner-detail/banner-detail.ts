import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { BannerService } from '../../../services/banner-service';
import { IMAGE_URL, NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../../shared/common.config';
import { BannerDetailModel, BannerModel } from '../../../models/banner-model';

@Component({
	selector: 'app-banner-detail',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		NzIconModule,
		NzButtonModule,
		NzFormModule,
		NzInputModule,
		NzInputNumberModule,
		NzSwitchModule,
		NzSpinModule
	],
	templateUrl: './banner-detail.html',
	styleUrl: './banner-detail.css',
	standalone: true,
	providers: [BannerService]
})
export class BannerDetail implements OnInit {
	private bannerService = inject(BannerService);
	private fb = inject(NonNullableFormBuilder);
	private modal = inject(NzModalRef<BannerDetail>);
	private notification = inject(NzNotificationService);

	@Input() banner: any = {};

	isEdit = false;
	isLoadingDetail = signal(false);
	loading = false;
	deletedDetailIds: number[] = [];
	newFiles: Map<number, File> = new Map<number, File>();
	blobUrls: Map<number, string> = new Map<number, string>();

	validateForm = this.fb.group({
		ID: [0],
		BannerCode: ['', [
			Validators.required,
			Validators.minLength(2),
			Validators.maxLength(50),
			Validators.pattern(/^[A-Za-z0-9_-]+$/)
		]],
		BannerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
		Description: ['', [Validators.maxLength(1000)]],
		SlideshowInterval: [5, [Validators.required, Validators.min(1), Validators.max(60)]],
		IsActive: [false],
		Details: this.fb.array([])
	});

	get details() {
		return (this.validateForm.get('Details') as any);
	}

	ngOnInit(): void {
		const modalData = this.modal.getConfig().nzData;
		this.banner = modalData?.banner;

		if (this.banner?.ID) {
			this.isEdit = true;
			this.loadBannerDetail(this.banner.ID);
		} else {
			this.initForm();
		}
	}

	loadBannerDetail(bannerID: number): void {
		this.isLoadingDetail.set(true);
		this.bannerService.getByID(bannerID).subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					const item: BannerModel = res.data;
					this.validateForm.patchValue({
						ID: item.ID || 0,
						BannerCode: item.BannerCode || '',
						BannerName: item.BannerName || '',
						Description: item.Description || '',
						SlideshowInterval: item.SlideshowInterval || 5,
						IsActive: item.IsActive ?? true
					});

					const details = (item.Details || []).filter((d: BannerDetailModel) => !d.IsDeleted);
					details.forEach((d: BannerDetailModel) => this.addDetail(d));

					this.isLoadingDetail.set(false);
				});
			},
			error: (err) => {
				this.isLoadingDetail.set(false);
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || err.message,
					{ nzStyle: { whiteSpace: 'pre-line' } }
				);
			}
		});
	}

	initForm(): void {
		this.validateForm.patchValue({
			ID: 0,
			BannerCode: '',
			BannerName: '',
			Description: '',
			SlideshowInterval: 5,
			IsActive: false
		});
		this.details.clear();
		this.newFiles.clear();
		this.blobUrls.clear();
		this.deletedDetailIds = [];
	}

	addDetail(detail?: BannerDetailModel): void {
		const item = detail || {
			ID: 0,
			BannerID: 0,
			ImageName: '',
			SortOrder: this.details.length,
			LinkURL: '',
			CreatedDate: new Date(),
			UpdatedDate: new Date(),
			IsDeleted: false
		};
		const group = this.fb.group({
			ID: [item.ID],
			BannerID: [item.BannerID || 0],
			ImageName: [item.ImageName || ''],
			SortOrder: [item.SortOrder || 0],
			LinkURL: [item.LinkURL || ''],
			IsDeleted: [false]
		});
		this.details.push(group);
	}

	removeDetail(index: number): void {
		const group = this.details.at(index);
		const id = group.get('ID')?.value;
		if (id && id > 0) {
			this.deletedDetailIds.push(id);
		}
		this.newFiles.delete(index);
		URL.revokeObjectURL(this.blobUrls.get(index) || '');
		this.blobUrls.delete(index);
		this.details.removeAt(index);
	}

	private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
	private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

	onFileChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const files = Array.from(input.files);
		files.forEach(f => this.processFile(f));
		input.value = '';
	}

	private processFile(realFile: File): void {
		if (!this.ALLOWED_IMAGE_TYPES.includes(realFile.type)) {
			this.notification.error(
				NOTIFICATION_TITLE_MAP[400] || 'Lỗi',
				`File "${realFile.name}" không phải định dạng ảnh hợp lệ (chỉ chấp nhận jpg, jpeg, png, gif, webp)!`
			);
			return;
		}

		if (realFile.size > this.MAX_FILE_SIZE) {
			this.notification.error(
				NOTIFICATION_TITLE_MAP[400] || 'Lỗi',
				`File "${realFile.name}" vượt quá dung lượng cho phép (tối đa 10MB)!`
			);
			return;
		}

		const newIndex = this.details.length;
		const blobUrl = URL.createObjectURL(realFile);
		this.newFiles.set(newIndex, realFile);
		this.blobUrls.set(newIndex, blobUrl);

		const group = this.fb.group({
			ID: [0],
			BannerID: [this.validateForm.get('ID')?.value || 0],
			ImageName: [`__pending_${realFile.name}`],
			SortOrder: [newIndex],
			LinkURL: [''],
			IsDeleted: [false]
		});
		this.details.push(group);
	}

	getImagePreview(index: number): string {
		const group = this.details.at(index);
		if (!group) return '';
		const imageName = group.get('ImageName')?.value;
		if (!imageName) return '';

		if (imageName.startsWith('data:')) {
			return imageName;
		}

		if (imageName.startsWith('__pending_')) {
			return this.blobUrls.get(index) || '';
		}

		const bannerCode = this.validateForm.get('BannerCode')?.value || '';
		// return `${IMAGE_URL}/banner/${bannerCode}/${imageName}`;
		return `${imageName}`;
	}

	handleOk(): void {
		if (!this.validateForm.valid) {
			Object.values(this.validateForm.controls).forEach(control => {
				if (control.invalid) {
					control.markAsDirty();
					control.updateValueAndValidity({ onlySelf: true });
				}
			});
			return;
		}

		this.loading = true;

		const data = this.buildPayload();
		this.saveData(data);
	}

	private buildPayload(): BannerModel {
		const formValue = this.validateForm.value;
		const isEdit = (formValue.ID ?? 0) > 0;
		const sanitizedDetails = ((formValue.Details as any[]) || [])
			.filter((d: any) => isEdit || !d.IsDeleted)
			.map((d: any) => {
				const isPending = typeof d.ImageName === 'string' && d.ImageName.startsWith('__pending_');
				return {
					...d,
					ImageName: isPending ? '' : d.ImageName,
					BannerID: formValue.ID || 0
				};
			});
		return {
			...formValue,
			Details: isEdit ? sanitizedDetails : [],
			CreatedDate: new Date(),
			UpdatedDate: new Date(),
			IsDeleted: false
		};
	}

	private uploadPendingFiles(bannerID: number): void {
		const files: File[] = Array.from(this.newFiles.values());
		if (files.length === 0) return;

		const allDetails: any[] = this.validateForm.value.Details || [];
		const pendingDetails = allDetails
			.filter((d: any) => typeof d.ImageName === 'string' && d.ImageName.startsWith('__pending_'))
			.map((d: any) => ({
				ID: 0,
				BannerID: bannerID,
				SortOrder: d.SortOrder,
				LinkURL: d.LinkURL,
				IsDeleted: false
			}));

		this.bannerService.uploadFile(files, bannerID, pendingDetails).subscribe({
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

	private saveDeletedDetails(bannerID: number): void {
		if (this.deletedDetailIds.length === 0) return;
		const payload = this.deletedDetailIds.map(id => ({ ID: id, IsDeleted: true, BannerID: bannerID }));
		this.bannerService.saveDetails(payload).subscribe({
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

	handleCancel(): void {
		this.modal.close();
	}

	saveData(data: BannerModel): void {
		this.bannerService.saveData(data).subscribe({
			next: (res) => {
				const savedBanner = res.data as BannerModel;
				const bannerID = savedBanner.ID ?? 0;
				this.uploadPendingFiles(bannerID);
				this.saveDeletedDetails(bannerID);
				this.loading = false;
				this.notification.success(
					NOTIFICATION_TITLE_MAP[res.status as RESPONSE_STATUS],
					res.message
				);
				this.modal.close(true);
			},
			error: (err) => {
				this.loading = false;
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
