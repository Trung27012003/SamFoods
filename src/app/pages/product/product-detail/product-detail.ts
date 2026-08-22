import { AfterViewInit, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { ProductService } from '../../../services/product-service';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { of, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CategoryService } from '../../../services/category-service';
import { UnitCountService } from '../../../services/unit-count-service';
import { CategoryDetail } from '../../category/category-detail/category-detail';
import { UnitCountDetail } from '../../unit-count/unit-count-detail/unit-count-detail';
import { NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../../shared/common.config';

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
		NzSelectModule,
		NzTreeSelectModule,
		NzUploadModule,
		NzSpinModule,
		NzTooltipModule,

	],
	templateUrl: './product-detail.html',
	styleUrl: './product-detail.css',
	providers: [ProductService, CategoryService, UnitCountService]
})
export class ProductDetail implements OnInit, OnDestroy, AfterViewInit {
	private productService = inject(ProductService);
	private categoryService = inject(CategoryService);
	private unitService = inject(UnitCountService);
	private fb = inject(NonNullableFormBuilder);
	private modal = inject(NzModalRef<ProductDetail>);
	private modalService = inject(NzModalService);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	@Input() product: any = {};

	isLoading = signal(false);
	categoryNodes = signal<NzTreeNodeOptions[]>([]);
	categoryList = signal<any[]>([]);
	unitCounts = signal<any[]>([]);
	productFileList: NzUploadFile[] = [];
	productFileRemoves: any[] = [];
	primaryImageId: string | null = null;

	// Flag sửa: chờ nodes load xong mới patchValue UnitCountID vào dropdown
	private pendingUnitCountID: number | null = null;

	tagPlaceholder = (list: any[]): string => `+${list.length} danh mục`;

	private destroy$ = new Subject<void>();
	private uploadSubscription: Subscription | null = null;

	validateForm = this.fb.group({
		ID: [0],
		CategoryIDs: [[] as number[], [Validators.required, this.arrayMinLength(1)]],
		STT: [1, [Validators.required, Validators.min(1)]],
		ProductCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
		ProductName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
		Status: [1, Validators.required],
		UnitPrice: [0, [Validators.required, Validators.min(0)]],
		Origin: ['', Validators.required],
		Descriptions: [''],
		Weight: [0, [Validators.required, Validators.min(0)]],
		UnitCountID: [null, Validators.required],
	});

	private arrayMinLength(min: number) {
		return (control: any) => {
			const value = control?.value;
			if (Array.isArray(value) && value.length >= min) return null;
			return { required: true };
		};
	}

	ngOnInit(): void {
		const modalData = this.modal.getConfig().nzData;
		this.product = modalData?.product;

		if (this.product) {
			// Lưu UnitCountID để patch sau khi combos load xong
			this.pendingUnitCountID = this.product.UnitCountID ?? null;

			// Patch trước các trường còn lại (không cần combo)
			const productEdit = { ...this.product };
			delete (productEdit as any).UnitCountID;
			this.validateForm.patchValue(productEdit);
			this.validateForm.get('STT')?.disable();

			this.loadCombo();
			this.loadProductDetail(this.product.ID);
		} else {
			this.loadCombo();
			this.loadAutoValues();
		}
	}

	ngAfterViewInit(): void {
		// (placeholder, giữ để tương thích). Tree-select đã bỏ.
	}

	private loadAutoValues(): void {
		this.productService.getMaxSTT().subscribe({
			next: (res) => {
				const max = res?.data ?? 0;
				this.validateForm.patchValue({ STT: max + 1 });
				this.validateForm.get('STT')?.disable();
			},
			error: () => {
				this.validateForm.get('STT')?.disable();
			}
		});

		this.productService.suggestProductCode().subscribe({
			next: (res) => {
				const code = res?.data;
				if (code) {
					this.validateForm.patchValue({ ProductCode: code });
				}
			},
			error: () => {}
		});
	}

	loadCombo(): void {
		this.categoryService.getData().subscribe({
			next: (res) => {
				const flat = (res.data || []).map((x: any) => ({ ID: x.ID, CategoryName: x.CategoryName, ParentID: x.ParentID }));
				this.categoryList.set(flat);
				this.categoryNodes.set(this.buildTreeOptions(res.data || []));
			},
			error: (err) => {
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || err.message
				);
			}
		});

		this.loadUnitCounts();
	}

	private loadUnitCounts(): void {
		this.unitService.getData().subscribe({
			next: (res) => {
				this.unitCounts.set(res.data);
				// [Sửa] Patch lại UnitCountID khi combo load xong (setTimeout để @for render xong)
				if (this.pendingUnitCountID != null) {
					setTimeout(() => {
						this.validateForm.patchValue({ UnitCountID: this.pendingUnitCountID as any });
						this.pendingUnitCountID = null;
						this.cdr.markForCheck();
					}, 0);
				}
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

	displayCategory = (node: any): string => node?.title ?? '';

	formatPrice = (value: number | string | undefined): string => {
		if (value == null || value === '') return '';
		const num = typeof value === 'string' ? Number(value.replace(/,/g, '')) : value;
		if (Number.isNaN(num)) return '';
		return num.toLocaleString('en-US');
	};

	parsePrice = (value: string | undefined): number => {
		if (value == null || value === '') return 0;
		const num = Number(String(value).replace(/,/g, ''));
		return Number.isNaN(num) ? 0 : num;
	};

	loadProductDetail(id: number): void {
		this.isLoading.set(true);
		this.productService.getByID(id).subscribe({
			next: (res) => {
				const productImages = res.data.productImages || [];
				const productCategories = res.data.productCategories || [];
				const categoryIDs = (productCategories || [])
					.map((x: any) => Number(x.CategoryID))
					.filter((x: number) => !Number.isNaN(x) && x > 0);

				if (categoryIDs.length > 0) {
					setTimeout(() => {
						this.validateForm.patchValue({ CategoryIDs: categoryIDs as any });
						this.cdr.markForCheck();
					}, 0);
				}

				this.productFileList = productImages.map((item: any) => {
					if (item.IsPrimary) {
						this.primaryImageId = item.ID.toString();
					}
					return {
						uid: item.ID,
						name: item.FileName,
						status: 'done',
						url: item.FileName,
						thumbUrl: item.FileName
					};
				});

				this.isLoading.set(false);
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

	openQuickAddCategory(): void {
		const modalRef = this.modalService.create({
			nzTitle: 'Thêm danh mục',
			nzContent: CategoryDetail,
			nzWidth: '60vw',
			nzStyle: { top: '20px' },
			nzFooter: [
				{ label: 'Hủy', onClick: () => modalRef.close() },
				{
					label: 'Lưu',
					type: 'primary',
					onClick: (componentInstance: any) => {
						componentInstance?.handleOk();
					}
				}
			],
			nzData: {
				category: null,
				categoryNodes: this.categoryNodes(),
				isParent: false
			}
		});

		modalRef.afterClose.subscribe(result => {
			if (result) {
				this.categoryService.getData().subscribe(res => {
					const flat = (res.data || []).map((x: any) => ({ ID: x.ID, CategoryName: x.CategoryName, ParentID: x.ParentID }));
					this.categoryList.set(flat);
					this.categoryNodes.set(this.buildTreeOptions(res.data || []));
				});
			}
		});
	}

	openQuickAddUnitCount(): void {
		const modalRef = this.modalService.create({
			nzTitle: 'Thêm đơn vị tính',
			nzContent: UnitCountDetail,
			nzWidth: '60vw',
			nzStyle: { top: '20px' },
			nzFooter: [
				{ label: 'Hủy', onClick: () => modalRef.close() },
				{
					label: 'Lưu',
					type: 'primary',
					onClick: (componentInstance: any) => {
						componentInstance?.handleOk();
					}
				}
			],
			nzData: {}
		});

		modalRef.afterClose.subscribe(result => {
			if (result) {
				this.loadUnitCounts();
			}
		});
	}

	setPrimaryImage(imageId: string): void {
		this.primaryImageId = imageId;
	}

	handleOk(): void {
		if (this.validateForm.valid) {
			const rawValue = this.validateForm.getRawValue();
			
			// Đảm bảo CategoryIDs luôn là mảng số
			let parsedCategoryIDs: number[] = [];
			if (Array.isArray(rawValue.CategoryIDs)) {
				parsedCategoryIDs = rawValue.CategoryIDs.map((x: any) => Number(x)).filter((x: number) => x > 0);
			} else if (typeof rawValue.CategoryIDs === 'string' && (rawValue.CategoryIDs as string).trim() !== '') {
				parsedCategoryIDs = (rawValue.CategoryIDs as string).split(',').map(x => Number(x.trim())).filter(x => !Number.isNaN(x) && x > 0);
			}

			// Đảm bảo UnitPrice là số (nếu có dấu phẩy từ grid format)
			let parsedUnitPrice: any = rawValue.UnitPrice;
			if (typeof parsedUnitPrice === 'string') {
				parsedUnitPrice = Number(parsedUnitPrice.replace(/,/g, ''));
			}

			const data = {
				...rawValue,
				UnitPrice: parsedUnitPrice,
				CategoryIDs: parsedCategoryIDs,
				ProductIngredients: [],
				ProductProcessingRecipes: [],
				ProductCategories: []
			};
			this.saveData(data);
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
		if (this.validateForm.get('CategoryIDs')?.invalid) labels.push('Danh mục');
		if (this.validateForm.get('ProductCode')?.invalid) labels.push('Mã sản phẩm');
		if (this.validateForm.get('ProductName')?.invalid) labels.push('Tên sản phẩm');
		if (this.validateForm.get('Origin')?.invalid) labels.push('Xuất sứ');
		if (this.validateForm.get('Status')?.invalid) labels.push('Tình trạng');
		if (this.validateForm.get('UnitPrice')?.invalid) labels.push('Đơn giá');
		if (this.validateForm.get('Weight')?.invalid) labels.push('Trọng lượng');
		if (this.validateForm.get('UnitCountID')?.invalid) labels.push('Đơn vị tính');
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
