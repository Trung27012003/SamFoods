import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

export interface AdminToolbarFilter {
	key: string;
	placeholder: string;
	options: { label: string; value: number | string }[];
	value: number | string | null;
}

@Component({
	selector: 'app-admin-list-toolbar',
	standalone: true,
	imports: [CommonModule, FormsModule, NzInputModule, NzSelectModule, NzButtonModule, NzIconModule],
	templateUrl: './admin-list-toolbar.html',
	styleUrl: './admin-list-toolbar.css'
})
export class AdminListToolbar {
	@Input() placeholder = 'Tìm kiếm...';
	@Input() searchValue = '';
	@Input() filters: AdminToolbarFilter[] = [];
	@Input() showClear = true;
	@Input() clearLabel = 'Xóa lọc';

	@Output() searchChange = new EventEmitter<string>();
	@Output() filterChange = new EventEmitter<{ key: string; value: any }>();
	@Output() clear = new EventEmitter<void>();

	onSearchInput(value: string): void {
		this.searchValue = value;
		this.searchChange.emit(value);
	}

	onFilterChange(key: string, value: any): void {
		const f = this.filters.find(x => x.key === key);
		if (f) f.value = value;
		this.filterChange.emit({ key, value });
	}

	onClear(): void {
		this.searchValue = '';
		this.filters.forEach(f => (f.value = null));
		this.clear.emit();
	}
}
