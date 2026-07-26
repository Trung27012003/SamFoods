import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { CommonModule } from '@angular/common';
import { LOGO_URL } from '../../shared/common.config';
import { SiteSettingsStore } from '../../shared/site-settings';
import { AuthService } from '../auth-layout/auth-service';
import { UserInfo } from '../auth-layout/auth-service';

@Component({
	selector: 'app-admin-layout',
	imports: [
		RouterLink,
		RouterOutlet,
		NzIconModule,
		NzLayoutModule,
		NzMenuModule,
		NzAvatarModule,
		NzDropDownModule,
		NzButtonModule,
		CommonModule
	],
	templateUrl: './admin-layout.html',
	styleUrl: '../../app.css',
})
export class AdminLayout {
	isCollapsed = false;
	logoURL = computed(() => this.siteSettings.imageUrl('logo_sidebar', LOGO_URL));
	brandName = computed(() => this.siteSettings.get('brand_name', 'SamFoods'));
	currentUser: UserInfo | null = null;

	private authService = inject(AuthService);
	private notification = inject(NzNotificationService);
	private router = inject(Router);
	private siteSettings = inject(SiteSettingsStore);

	constructor() {
		this.loadUserInfo();
	}

	loadUserInfo(): void {
		this.currentUser = this.authService.getCurrentUser();
	}

	logout(): void {
		this.authService.logout();
		this.notification.success('Đăng xuất', 'Hẹn gặp lại!');
		this.router.navigate(['/login']);
	}

	goToHome(): void {
		this.router.navigate(['/home']);
	}
}
