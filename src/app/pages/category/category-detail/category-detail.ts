import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { CategoryService } from '../../../services/category-service';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { IMAGE_URL, NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../../shared/common.config';

@Component({
	selector: 'app-category-detail',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		NzIconModule,
		NzButtonModule,
		NzFormModule,
		NzInputModule,
		NzInputNumberModule,
		NzCheckboxModule,
		NzTreeSelectModule,
		NzGridModule,
		NzUploadModule,
		NzSpinModule
	],
	templateUrl: './category-detail.html',
	styleUrl: './category-detail.css',
	standalone: true,
	providers: [CategoryService]
})
export class CategoryDetail implements OnInit {
	private categoryService = inject(CategoryService);
	private fb = inject(NonNullableFormBuilder);
	private modal = inject(NzModalRef<CategoryDetail>);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	@Input() category: any = {};
	@Input() categoryNodes: NzTreeNodeOptions[] = [];
	@Input() isParent: boolean = false;

	isEdit = false;
	isLoadingDetail = signal(false);
	loading = false;
	categoryFiles: NzUploadFile[] = [];

	validateForm = this.fb.group({
		ID: [0],
		STT: [0, [Validators.required]],
		CategoryCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
		CategoryName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
		ParentID: ['0'],
		IsDeleted: [false],
	});

	ngOnInit(): void {
		const modalData = this.modal.getConfig().nzData;
		this.category = modalData?.category;
		this.categoryNodes = modalData?.categoryNodes || [];
		this.isParent = modalData?.isParent ?? false;

		if (this.category?.ID) {
			this.isEdit = true;
			this.loadCategoryDetail(this.category.ID);
		} else {
			this.initForm();
			this.loadAutoValues();
		}
	}

	private loadAutoValues(): void {
		this.validateForm.patchValue({ STT: 0 });

		this.categoryService.suggestCategoryCode().subscribe({
			next: (res) => {
				const code = res?.data;
				if (code) {
					this.validateForm.patchValue({ CategoryCode: code });
				}
			}
		});
	}

	loadCategoryDetail(categoryID: number): void {
		this.isLoadingDetail.set(true);
		this.categoryService.getByID(categoryID).subscribe({
			next: (res) => {
				const item = res.data;
				this.validateForm.patchValue({
					ID: item.ID || 0,
					STT: item.STT ?? 0,
					CategoryCode: item.CategoryCode || '',
					CategoryName: item.CategoryName || '',
					ParentID: item.ParentID?.toString() || '0',
					IsDeleted: item.IsDeleted || false
				});

				if (item.ImageName) {
					this.categoryFiles = [{
						uid: item.ID,
						name: item.ImageName,
						status: 'done',
						url: IMAGE_URL + '/category/' + item.CategoryCode + '/' + item.ImageName,
						thumbUrl: IMAGE_URL + '/category/' + item.CategoryCode + '/' + item.ImageName
					}];
				}

				this.isLoadingDetail.set(false);
				this.cdr.detectChanges();
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
			STT: 0,
			CategoryCode: '',
			CategoryName: '',
			ParentID: '0',
			IsDeleted: false
		});
	}

	onRemoveFile = (): boolean => true;

	handleOk(): void {
		if (this.validateForm.valid) {
			const formValue = this.validateForm.value;
			const data = {
				...formValue,
				ParentID: formValue.ParentID === '0' ? 0 : parseInt(formValue.ParentID as string, 10)
			};
			this.saveData(data);
		} else {
			Object.values(this.validateForm.controls).forEach(control => {
				if (control.invalid) {
					control.markAsDirty();
					control.updateValueAndValidity({ onlySelf: true });
				}
			});
		}
	}

	handleCancel(): void {
		this.modal.close();
	}

	saveData(data: any): void {
		this.loading = true;
		this.categoryService.saveData(data).subscribe({
			next: (res) => {
				this.uploadFile(res.data.ID);
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

	private uploadFile(categoryID: number): void {
		const files: File[] = this.categoryFiles
			.map(f => f.originFileObj as File)
			.filter(f => !!f);

		if (files.length === 0) return;

		this.categoryService.uploadFile(files, categoryID).subscribe({
			next: () => {},
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
}
