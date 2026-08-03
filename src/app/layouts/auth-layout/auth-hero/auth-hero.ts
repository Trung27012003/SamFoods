import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-auth-hero',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './auth-hero.html',
	styleUrl: './auth-hero.css'
})
export class AuthHero {
	@Input() title = 'Chào mừng đến với SamFoods';
	@Input() subtitle = 'Hệ thống quản lý bán hàng thông minh, hiện đại và dễ sử dụng.';
	@Input() bullets: string[] = [];
}
