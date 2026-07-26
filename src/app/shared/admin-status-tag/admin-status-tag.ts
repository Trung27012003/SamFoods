import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AdminStatusColor, STATUS_COLOR } from '../status-maps';

@Component({
	selector: 'app-admin-status-tag',
	standalone: true,
	imports: [CommonModule, NzTagModule],
	template: `
		<nz-tag [nzColor]="resolvedColor">
			{{ label }}
		</nz-tag>
	`
})
export class AdminStatusTag {
	@Input() status?: number;
	@Input() color?: AdminStatusColor;
	@Input() label = '';

	get resolvedColor(): AdminStatusColor {
		if (this.color) return this.color;
		if (this.status === undefined || this.status === null) return 'default';
		return STATUS_COLOR[this.status] ?? 'default';
	}
}
