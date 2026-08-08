import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { AuthHero } from '../auth-hero/auth-hero';
import { AuthService } from '../auth-service';
import { SiteSettingsStore } from '../../../shared/site-settings';

@Component({
	selector: 'app-login',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		RouterLink,
		NzFormModule,
		NzInputModule,
		NzButtonModule,
		NzIconModule,
		NzSpinModule,
		AuthHero
	],
	templateUrl: './login.html',
	styleUrls: ['./login.css', '../auth-shared.css'],
	standalone: true
})
export class Login implements OnInit {
	validateForm!: FormGroup;
	isLoading = false;
	showPassword = false;

	private siteSettings = inject(SiteSettingsStore);
	logoURL = computed(() => this.siteSettings.imageUrl('logo_auth', 'assets/image/logo.jpg'));
	brandName = computed(() => this.siteSettings.get('brand_name', 'SamFoods'));

	constructor(
		private fb: FormBuilder,
		private authService: AuthService,
		private router: Router
	) { }

	ngOnInit(): void {
		this.validateForm = this.fb.group({
			userName: ['', [Validators.required, Validators.minLength(3)]],
			password: ['', [Validators.required, Validators.minLength(6)]]
		});
	}

	isFieldInvalid(name: string): boolean {
		const c = this.validateForm?.get(name);
		return !!(c && c.invalid && (c.dirty || c.touched));
	}

	handleOk(): void {
		if (this.validateForm.valid) {
			this.isLoading = true;
			const { userName, password } = this.validateForm.value;

			this.authService.login({ userName, password }).subscribe({
				next: (res) => {
					this.isLoading = false;
					if (res?.access_token) {
						if (this.authService.isAdmin()) {
							this.router.navigate(['/admin/dashboard']);
						} else {
							this.router.navigate(['/home']);
						}
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

	goToRegister(): void {
		this.router.navigate(['/register']);
	}
}
