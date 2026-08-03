import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { AuthHero } from '../auth-hero/auth-hero';
import { AuthService } from '../auth-service';
import { SiteSettingsStore } from '../../../shared/site-settings';

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
		NzCheckboxModule,
		AuthHero
	],
	templateUrl: './register.html',
	styleUrls: ['./register.css', '../auth-shared.css'],
	standalone: true
})
export class Register implements OnInit {
	validateForm!: FormGroup;
	isLoading = false;
	showPassword = false;
	showConfirmPassword = false;

	passwordValue = '';
	passwordScore = signal(0);

	passwordStrength = computed(() => this.passwordScore());
	passwordStrengthLabel = computed(() => {
		const s = this.passwordScore();
		switch (s) {
			case 0: return '—';
			case 1: return 'Yếu';
			case 2: return 'Trung bình';
			case 3: return 'Khá';
			case 4: return 'Mạnh';
			default: return '—';
		}
	});

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
			UserName: ['', [Validators.required, Validators.minLength(3)]],
			Password: ['', [Validators.required, Validators.minLength(6)]],
			ConfirmPassword: ['', [Validators.required, this.confirmValidator.bind(this)]],
			FullName: ['', [Validators.required, Validators.minLength(2)]],
			Email: ['', [Validators.email]],
			PhoneNumber: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
			AgreeTerms: [false, [Validators.requiredTrue]]
		});
	}

	confirmValidator(control: any): { [s: string]: boolean } | null {
		if (!control.value) {
			return { error: true, required: true };
		}
		if (control.value !== this.validateForm?.get('Password')?.value) {
			return { confirm: true, error: true };
		}
		return null;
	}

	isFieldInvalid(name: string): boolean {
		const c = this.validateForm?.get(name);
		return !!(c && c.invalid && (c.dirty || c.touched));
	}

	onPasswordInput(event: Event): void {
		const value = (event.target as HTMLInputElement).value;
		this.passwordValue = value;
		this.passwordScore.set(this.calculatePasswordStrength(value));
	}

	private calculatePasswordStrength(pwd: string): number {
		if (!pwd) return 0;
		let score = 0;
		if (pwd.length >= 8) score++;
		if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
		if (/[0-9]/.test(pwd)) score++;
		if (/[^A-Za-z0-9]/.test(pwd)) score++;
		return Math.min(score, 4);
	}

	handleOk(): void {
		if (this.validateForm.valid) {
			this.isLoading = true;
			const formData = { ...this.validateForm.value };
			delete formData.ConfirmPassword;
			delete formData.AgreeTerms;

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
