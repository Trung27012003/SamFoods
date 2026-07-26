import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
	selector: 'app-admin-page-header',
	standalone: true,
	imports: [CommonModule, NzBreadCrumbModule, NzIconModule],
	templateUrl: './admin-page-header.html',
	styleUrl: './admin-page-header.css'
})
export class AdminPageHeader {
	@Input() title = '';
	@Input() subtitle?: string;
	@Input() breadcrumbs: string[] = [];
}
