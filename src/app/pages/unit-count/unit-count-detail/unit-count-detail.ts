import { Component, inject, Input, OnInit } from '@angular/core';
import { UnitCountService } from '../../../services/unit-count-service';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { CommonModule } from '@angular/common';
import { NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from '../../../shared/common.config';

@Component({
	selector: 'app-unit-count-detail',
	imports: [
		CommonModule,
		NzIconModule,
		ReactiveFormsModule,
		NzFormModule,
		NzInputModule,
		NzInputNumberModule,
		NzButtonModule
	],
	templateUrl: './unit-count-detail.html',
	styleUrl: './unit-count-detail.css',
	standalone: true,
	providers: [UnitCountService]
})
export class UnitCountDetail implements OnInit {
	private unitService = inject(UnitCountService);
	private fb = inject(NonNullableFormBuilder);
	private modal = inject(NzModalRef<UnitCountDetail>);
	private notification = inject(NzNotificationService);

	@Input() unitCount: any = {};

	isLoading = false;

	validateForm = this.fb.group({
		ID: [0],
		UnitCode: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
		UnitName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
		Descriptions: ['']
	});

	ngOnInit(): void {
		this.unitCount = this.modal.getConfig().nzData?.unitCount;
		if (this.unitCount) {
			this.validateForm.patchValue(this.unitCount);
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
		this.unitService.saveData(data).subscribe({
			next: (res) => {
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
}
