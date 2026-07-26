import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { AuthService } from '../auth-service';

@Component({
	selector: 'app-register',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		NzFormModule,
		NzInputModule,
		NzButtonModule,
		NzIconModule,
		NzSpinModule,
		NzCheckboxModule
	],
	templateUrl: './register.html',
	styleUrl: './register.css',
	standalone: true
})
export class Register implements OnInit {
	validateForm!: FormGroup;
	isLoading = false;
	showPassword = false;
	showConfirmPassword = false;

	constructor(
		private fb: FormBuilder,
		private authService: AuthService,
		private router: Router
	) { }

	ngOnInit(): void {
		this.validateForm = this.fb.group({
			UserName: ['', [Validators.required, Validators.minLength(3)]],
			Password: ['', [Validators.required, Validators.minLength(6)]],
			ConfirmPassword: ['', [Validators.required, this.confirmValidator]],
			FullName: ['', [Validators.required, Validators.minLength(2)]],
			Email: ['', [Validators.email]],
			PhoneNumber: ['', [Validators.pattern(/^[0-9]{10,11}$/)]]
		});
	}

	confirmValidator = (control: FormGroup): { [s: string]: boolean } => {
		if (!control.value) {
			return { error: true, required: true };
		}
		if (control.value !== this.validateForm?.get('Password')?.value) {
			return { confirm: true, error: true };
		}
		return {};
	};

	handleOk(): void {
		if (this.validateForm.valid) {
			this.isLoading = true;
			const formData = this.validateForm.value;
			delete formData.ConfirmPassword;

			this.authService.register(formData).subscribe({
				next: (res) => {
					this.isLoading = false;
					if (res?.status === 1) {
						this.router.navigate(['/login']);
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

	togglePassword(): void {
		this.showPassword = !this.showPassword;
	}

	toggleConfirmPassword(): void {
		this.showConfirmPassword = !this.showConfirmPassword;
	}

	goToLogin(): void {
		this.router.navigate(['/login']);
	}
}
