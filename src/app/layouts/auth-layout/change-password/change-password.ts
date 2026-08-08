import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../auth-service';

@Component({
	selector: 'app-change-password',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		NzFormModule,
		NzInputModule,
		NzButtonModule,
		NzIconModule,
		NzSpinModule
	],
	templateUrl: './change-password.html',
	styleUrl: './change-password.css',
	standalone: true,
	providers: [NzMessageService]
})
export class ChangePassword implements OnInit {
	validateForm!: FormGroup;
	isLoading = false;
	showOldPassword = false;
	showNewPassword = false;
	showConfirmPassword = false;

	constructor(
		private fb: FormBuilder,
		private authService: AuthService,
		private router: Router,
		private msg: NzMessageService
	) { }

	ngOnInit(): void {
		if (!this.authService.isLoggedIn()) {
			this.router.navigate(['/login']);
			return;
		}

		this.validateForm = this.fb.group({
			OldPassword: ['', [Validators.required, Validators.minLength(6)]],
			NewPassword: ['', [Validators.required, Validators.minLength(6)]],
			ConfirmPassword: ['', [Validators.required, this.confirmValidator]]
		});
	}

	confirmValidator = (control: FormGroup): { [s: string]: boolean } => {
		if (!control.value) {
			return { error: true, required: true };
		}
		if (control.value !== this.validateForm?.get('NewPassword')?.value) {
			return { confirm: true, error: true };
		}
		return {};
	};

	handleOk(): void {
		if (this.validateForm.valid) {
			this.isLoading = true;
			const { OldPassword, NewPassword } = this.validateForm.value;

			this.authService.changePassword({ OldPassword, NewPassword }).subscribe({
				next: (res) => {
					this.isLoading = false;
					if (res?.status === 1) {
						this.msg.success(res.message || 'Đổi mật khẩu thành công!');
						this.validateForm.reset();
					}
				},
				error: () => {
					this.isLoading = false;
				}
			});
		} else {
			Object.values(this.validateForm.controls).forEach(control => {
				if (control.invalid) {
					control.markAsDirty();
					control.updateValueAndValidity({ onlySelf: true });
				}
			});
		}
	}

	toggleOldPassword(): void {
		this.showOldPassword = !this.showOldPassword;
	}

	toggleNewPassword(): void {
		this.showNewPassword = !this.showNewPassword;
	}

	toggleConfirmPassword(): void {
		this.showConfirmPassword = !this.showConfirmPassword;
	}

	goBack(): void {
		this.router.navigate(['/admin/dashboard']);
	}
}
