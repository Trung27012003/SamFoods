import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { ProductService } from '../../../services/product-service';
import { FormArray, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { of, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CategoryService } from '../../../services/category-service';
import { UnitCountService } from '../../../services/unit-count-service';
import { IMAGE_URL, NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../../shared/common.config';

@Component({
	selector: 'app-product-detail',
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
		NzTreeSelectModule,
		NzUploadModule,
		NzSpinModule
	],
	templateUrl: './product-detail.html',
	styleUrl: './product-detail.css',
	providers: [ProductService, CategoryService, UnitCountService]
})
export class ProductDetail implements OnInit, OnDestroy {
	private productService = inject(ProductService);
	private categoryService = inject(CategoryService);
	private unitService = inject(UnitCountService);
	private fb = inject(NonNullableFormBuilder);
	private modal = inject(NzModalRef<ProductDetail>);
	private notification = inject(NzNotificationService);

	@Input() product: any = {};

	isLoading = signal(false);
	categoryNodes: NzTreeNodeOptions[] = [];
	unitCounts: any[] = [];
	productFileList: NzUploadFile[] = [];
	productFileRemoves: any[] = [];
	primaryImageId: string | null = null;

	private destroy$ = new Subject<void>();
	private uploadSubscription: Subscription | null = null;

	validateForm = this.fb.group({
		ID: [0],
		CategoryID: [null, Validators.required],
		STT: [1, [Validators.required, Validators.min(1)]],
		ProductCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
		ProductName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
		Status: [1, Validators.required],
		UnitPrice: [0, [Validators.required, Validators.min(0)]],
		Origin: ['', Validators.required],
		Descriptions: [''],
		Weight: [0, [Validators.required, Validators.min(0)]],
		UnitCountID: [null, Validators.required],
		StorageInstructions: [''],
		ProductIngredients: this.fb.array([]),
		ProductProcessingRecipes: this.fb.array([])
	});

	get ingredients(): FormArray {
		return this.validateForm.get('ProductIngredients') as FormArray;
	}

	get processRecipes(): FormArray {
		return this.validateForm.get('ProductProcessingRecipes') as FormArray;
	}

	ngOnInit(): void {
		this.loadCombo();
		this.product = this.modal.getConfig().nzData?.product;

		if (this.product) {
			const productEdit = {
				...this.product,
				CategoryID: this.product.CategoryID
			};
			this.validateForm.patchValue(productEdit);
			this.loadProductDetail(this.product.ID);
		} else {
			this.addIngredient();
			this.addProcessRecipe();
		}
	}

	loadCombo(): void {
		this.categoryService.getData().subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					this.categoryNodes = this.buildTreeOptions(res.data);
				});
			},
			error: (err) => {
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || err.message
				);
			}
		});

		this.unitService.getData().subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					this.unitCounts = res.data;
				});
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

	buildTreeOptions(data: any[]): NzTreeNodeOptions[] {
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
			const node = map.get(item.ID)!;
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
	}

	loadProductDetail(id: number): void {
		this.isLoading.set(true);
		this.productService.getByID(id).subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					const productIngres = res.data.productIngres || [];
					productIngres.forEach((item: any) => this.addIngredient(item));

					const productProcess = res.data.productProcess || [];
					productProcess.forEach((item: any) => this.addProcessRecipe(item));

					const urlImage = IMAGE_URL + '/product';
					const productImages = res.data.productImages || [];
					this.productFileList = productImages.map((item: any) => {
						if (item.IsPrimary) {
							this.primaryImageId = item.ID.toString();
						}
						return {
							uid: item.ID,
							name: item.FileName,
							status: 'done',
							url: urlImage + `/${item.ProductCode}/${item.FileName}`,
							thumbUrl: urlImage + `/${item.ProductCode}/${item.FileName}`
						};
					});

					this.isLoading.set(false);
				});
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

	setPrimaryImage(imageId: string): void {
		this.primaryImageId = imageId;
	}

	handleOk(): void {
		if (this.validateForm.valid) {
			this.saveData(this.validateForm.value);
		} else {
			Object.values(this.validateForm.controls).forEach(control => {
				if (control.invalid) {
					control.markAsDirty();
					control.updateValueAndValidity({ onlySelf: true });
				}
			});
			this.validateForm.markAllAsTouched();
			const invalidFields = this.collectInvalidFields();
			this.notification.warning(
				'Thông báo',
				`Vui lòng kiểm tra các trường: ${invalidFields}`,
				{ nzStyle: { whiteSpace: 'pre-line' } }
			);
		}
	}

	private collectInvalidFields(): string {
		const labels: string[] = [];
		if (this.validateForm.get('CategoryID')?.invalid) labels.push('Danh mục');
		if (this.validateForm.get('ProductCode')?.invalid) labels.push('Mã sản phẩm');
		if (this.validateForm.get('ProductName')?.invalid) labels.push('Tên sản phẩm');
		if (this.validateForm.get('Origin')?.invalid) labels.push('Nguồn gốc');
		if (this.validateForm.get('Status')?.invalid) labels.push('Tình trạng');
		if (this.validateForm.get('UnitPrice')?.invalid) labels.push('Đơn giá');
		if (this.validateForm.get('Weight')?.invalid) labels.push('Trọng lượng');
		if (this.validateForm.get('UnitCountID')?.invalid) labels.push('Đơn vị tính');
		this.ingredients.controls.forEach((ctrl, idx) => {
			if (ctrl.invalid) labels.push(`Nguyên liệu #${idx + 1}`);
		});
		this.processRecipes.controls.forEach((ctrl, idx) => {
			if (ctrl.invalid) labels.push(`Bước ${idx + 1}`);
		});
		return labels.join(', ') || 'Có trường không hợp lệ';
	}

	handleCancel(): void {
		this.modal.close();
	}

	saveData(data: any): void {
		this.isLoading.set(true);
		this.productService.saveData(data)
			.pipe(takeUntil(this.destroy$))
			.subscribe({
				next: (res) => {
					const productID = res.data.ID;
					this.uploadSubscription?.unsubscribe();
					this.uploadSubscription = this.performUpload(productID).subscribe({
					next: () => {
						this.isLoading.set(false);
							this.notification.success(
								NOTIFICATION_TITLE_MAP[res.status as RESPONSE_STATUS],
								res.message
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

	private performUpload(productID: number) {
		const files: File[] = this.productFileList
			.map(f => f.originFileObj instanceof File ? f.originFileObj : null)
			.filter((f): f is File => f !== null);

		if (files.length === 0 && this.productFileRemoves.length === 0) {
			return of(null);
		}

		const primaryImageIdNum = this.primaryImageId ? Number(this.primaryImageId) : null;
		const removesJson = JSON.stringify(this.productFileRemoves);

		return this.productService.uploadFile(files, productID, removesJson, primaryImageIdNum);
	}

	onRemoveFile = (file: NzUploadFile): boolean => {
		const rawUid = file.uid;
		const fileId = rawUid !== undefined && rawUid !== null ? String(rawUid) : '';
		const isExistingFile = fileId.length > 0 && !fileId.startsWith('-');

		if (this.primaryImageId !== null && fileId && this.primaryImageId === fileId) {
			this.primaryImageId = null;
			const remainingFiles = this.productFileList.filter(f => String(f.uid) !== fileId);
			if (remainingFiles.length > 0) {
				const existingImage = remainingFiles.find(f => {
					const uid = f.uid !== undefined && f.uid !== null ? String(f.uid) : '';
					return uid.length > 0 && !uid.startsWith('-');
				});
				if (existingImage && existingImage.uid !== undefined && existingImage.uid !== null) {
					this.primaryImageId = String(existingImage.uid);
				} else if (remainingFiles[0].uid !== undefined && remainingFiles[0].uid !== null) {
					this.primaryImageId = String(remainingFiles[0].uid);
				}
			}
		}

		if (isExistingFile) {
			const numericId = Number(fileId);
			if (!Number.isNaN(numericId)) {
				this.productFileRemoves.push({ ID: numericId, IsDeleted: true });
			}
		}
		this.productFileList = this.productFileList.filter(f => String(f.uid) !== fileId);
		return true;
	};

	uploadFile(productID: number): void {
		this.uploadSubscription?.unsubscribe();
		this.uploadSubscription = this.performUpload(productID)
			.pipe(takeUntil(this.destroy$))
			.subscribe({
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

	ngOnDestroy(): void {
		this.uploadSubscription?.unsubscribe();
		this.destroy$.next();
		this.destroy$.complete();
	}

	addIngredient(data: any = { ID: 0, IngredientName: '', Quantity: 0, UnitCountID: null }): void {
		this.ingredients.push(
			this.fb.group({
				IngredientName: [data.IngredientName || '', [Validators.required, Validators.minLength(2)]],
				Quantity: [data.Quantity || 0, [Validators.required, Validators.min(0)]],
				UnitCountID: [data.UnitCountID || null, Validators.required]
			})
		);
	}

	removeIngredient(index: number): void {
		this.ingredients.removeAt(index);
	}

	addProcessRecipe(data: any = { ID: 0, Step: 1, StepName: '', Description: '' }): void {
		const step = data.ID > 0 ? data.Step : this.processRecipes.length + 1;
		const stepName = data.ID > 0 ? data.StepName : `Bước ${step}`;

		this.processRecipes.push(this.fb.group({
			Step: [step, [Validators.required, Validators.min(1)]],
			StepName: [stepName, [Validators.required, Validators.minLength(2)]],
			Description: [data.Description || '', Validators.required]
		}));
	}

	removeProcessRecipe(index: number): void {
		this.processRecipes.removeAt(index);
	}

	handleFileUpload = (file: NzUploadFile, _fileList: NzUploadFile[]): boolean => {
		if (this.primaryImageId === null && file.uid !== undefined && file.uid !== null) {
			this.primaryImageId = String(file.uid);
		}
		return true;
	};

	handleCustomRequest = (_item: NzUploadXHRArgs): Subscription => {
		return new Subscription();
	};
}
