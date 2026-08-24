import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { CategoryService } from '../../services/category-service';
import { CategoryModel } from '../../models/category-model';
import { ColumnTable } from '../../models/column-table';
import { NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../shared/common.config';
import { AdminPageHeader, AdminListToolbar, AdminStatusTag } from '../../shared';
import { CategoryDetail } from './category-detail/category-detail';

@Component({
	selector: 'app-category',
	imports: [
		CommonModule,
		FormsModule,
		TreeTableModule,
		NzIconModule,
		NzButtonModule,
		NzEmptyModule,
		AdminPageHeader,
		AdminListToolbar,
		AdminStatusTag
	],
	templateUrl: './category.html',
	styleUrl: './category.css',
	standalone: true,
	providers: [CategoryService, NzModalService, NzNotificationService]
})
export class Category implements OnInit {
	private categoryService = inject(CategoryService);
	private modal = inject(NzModalService);
	private notification = inject(NzNotificationService);
	private cdr = inject(ChangeDetectorRef);

	categorys: TreeNode[] = [];
	categorysOriginal: any[] = [];
	category = signal<CategoryModel>({});
	categoryNodes: NzTreeNodeOptions[] = [];

	isLoadingData = signal(false);
	isLoadingModal = signal(false);
	selectedNode!: TreeNode;
	searchValue = signal('');

	get hasSelection(): boolean {
		return !!this.selectedNode?.data;
	}

	cols: ColumnTable[] = [
		{ field: 'STT', header: 'STT' },
		{ field: 'CategoryCode', header: 'Mã danh mục' },
		{ field: 'CategoryName', header: 'Tên danh mục' },
		{ field: 'StatusText', header: 'Trạng thái' }
	];

	ngOnInit(): void {
		this.loadData();
	}

	loadData(): void {
		this.isLoadingData.set(true);
		this.categoryService.getData().subscribe({
			next: (res) => {
				this.categorysOriginal = res.data.map((item: any) => ({
					...item,
					StatusText: item.IsDeleted ? 'Ngừng hoạt động' : 'Hoạt động'
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

	applySearch(): void {
		const searchTerm = this.searchValue().toLowerCase().trim();
		let filtered = this.categorysOriginal;

		if (searchTerm) {
			filtered = this.categorysOriginal.filter(item =>
				item.CategoryName?.toLowerCase().includes(searchTerm) ||
				item.CategoryCode?.toLowerCase().includes(searchTerm)
			);
		}

		this.categorys = this.getTreeNodeData(filtered);
		this.categoryNodes = this.getTreeNodeOptions(filtered);
	}

	onSearch(value: string): void {
		this.searchValue.set(value);
		this.applySearch();
	}

	getTreeNodeData(data: any[]): TreeNode[] {
		const map = new Map<number, TreeNode>();
		const roots: TreeNode[] = [];

		data.forEach(item => {
			map.set(item.ID, { data: item, children: [] });
		});

		data.forEach(item => {
			const node = map.get(item.ID)!;
			if (item.ParentID === 0 || item.ParentID === null || item.ParentID === undefined) {
				roots.push(node);
			} else {
				const parent = map.get(item.ParentID);
				if (parent) {
					parent.children!.push(node);
				}
			}
		});

		return roots;
	}

	getTreeNodeOptions(data: any[]): NzTreeNodeOptions[] {
		const map = new Map<number, NzTreeNodeOptions>();
		const roots: NzTreeNodeOptions[] = [];

		data.forEach(item => {
			map.set(item.ID, {
				title: item.CategoryName,
				key: item.ID.toString(),
				value: item.ID
			});
		});

		data.forEach(item => {
			const node = map.get(item.ID)!;
			if (item.ParentID === 0 || item.ParentID === null || item.ParentID === undefined) {
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

	openModal(category: any | null, isEdit: boolean): void {
		const modalRef = this.modal.create({
			nzTitle: isEdit ? 'Sửa danh mục' : 'Thêm danh mục',
			nzContent: CategoryDetail,
			nzWidth: 600,
			nzFooter: [
				{
					label: 'Hủy',
					onClick: () => modalRef.close()
				},
				{
					label: 'Lưu',
					type: 'primary',
					loading: () => this.isLoadingModal(),
					onClick: (contentComponent) => contentComponent?.handleOk()
				}
			],
			nzData: {
				category: category,
				categoryNodes: this.categoryNodes,
				isParent: false
			}
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

	onEdit(node?: any): void {
		if (node) {
			this.selectedNode = node.node ? node.node : node;
		}
		if (!this.selectedNode?.data) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một danh mục để sửa!');
			return;
		}
		this.openModal(this.selectedNode.data, true);
	}

	onDelete(): void {
		if (!this.selectedNode?.data) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một danh mục để xóa!');
			return;
		}

		const item = this.selectedNode.data;
		const newStatus = !item.IsDeleted;

		this.modal.confirm({
			nzTitle: 'Xác nhận thay đổi trạng thái',
			nzContent: `<b style="color: ${newStatus ? 'red' : 'green'};">
				Bạn có chắc muốn ${newStatus ? 'ngừng hoạt động' : 'kích hoạt'} danh mục
				<span class="text-primary">${item.CategoryName}</span> không?
			</b>`,
			nzOkText: newStatus ? 'Ngừng hoạt động' : 'Kích hoạt',
			nzOkType: 'primary',
			nzOkDanger: newStatus,
			nzOnOk: () => {
				const data = { ID: item.ID, IsDeleted: newStatus };
				this.categoryService.saveData(data).subscribe({
					next: (res) => {
						this.loadData();
						this.notification.success(
							NOTIFICATION_TITLE_MAP[res.status as RESPONSE_STATUS],
							res.message
						);
					}
				});
			},
			nzCancelText: 'Hủy'
		});
	}

	onRealDelete(): void {
		if (!this.selectedNode?.data) {
			this.notification.warning('Thông báo', 'Vui lòng chọn một danh mục để xóa!');
			return;
		}

		const item = this.selectedNode.data;

		// Kiểm tra danh mục con trực tiếp ở giao diện
		if (this.selectedNode.children && this.selectedNode.children.length > 0) {
			this.notification.error('Thông báo', 'Không thể xóa danh mục này vì đang có danh mục con bên trong!');
			return;
		}

		this.modal.confirm({
			nzTitle: 'Xác nhận xóa vĩnh viễn',
			nzContent: `<b style="color: red;">
				Bạn có chắc chắn muốn xóa vĩnh viễn danh mục
				<span class="text-primary">${item.CategoryName}</span> không?
				<br><small class="text-muted">Lưu ý: Hành động này không thể hoàn tác và chỉ thực hiện được nếu không có sản phẩm liên kết.</small>
			</b>`,
			nzOkText: 'Xóa vĩnh viễn',
			nzOkType: 'primary',
			nzOkDanger: true,
			nzOnOk: () => {
				this.categoryService.delete(item.ID).subscribe({
					next: (res) => {
						this.loadData();
						this.notification.success(
							NOTIFICATION_TITLE_MAP[res.status as RESPONSE_STATUS] || 'Thành công',
							res.message || 'Xóa danh mục thành công!'
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

	nodeSelect(event: any): void {}
}
