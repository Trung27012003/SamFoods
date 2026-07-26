import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CART_PRODUCT_KEY, formatCurrency, formatDateTime } from '../../shared/common.config';

@Component({
	selector: 'app-checkout-success',
	imports: [CommonModule, NzButtonModule, NzIconModule],
	templateUrl: './checkout-success.html',
	styleUrl: './checkout-success.css',
	standalone: true
})
export class CheckoutSuccess implements OnInit {
	private route = inject(ActivatedRoute);
	private router = inject(Router);

	billCode: string = '';
	customerName: string = '';
	phoneNumber: string = '';
	address: string = '';
	totalAmount: number = 0;
	note: string = '';
	orderDate: Date = new Date();
	paymentMethod: string = 'COD';

	confettiPieces: Array<{ left: number; delay: number; duration: number; rotate: number; color: string }> = [];

	private readonly colors = [
		'#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1',
		'#5f27cd', '#ff9ff3', '#54a0ff', '#00d2d3'
	];

	ngOnInit(): void {
		const params = this.route.snapshot.queryParamMap;
		this.billCode = params.get('billCode') || '';
		this.customerName = params.get('customerName') || '';
		this.phoneNumber = params.get('phoneNumber') || '';
		this.address = params.get('address') || '';
		this.note = params.get('note') || '';
		const total = parseFloat(params.get('totalAmount') || '0');
		this.totalAmount = isNaN(total) ? 0 : total;

		// Final cleanup of cart if not already cleared
		localStorage.removeItem(CART_PRODUCT_KEY);

		this.generateConfetti();
	}

	private generateConfetti(): void {
		const count = 50;
		for (let i = 0; i < count; i++) {
			this.confettiPieces.push({
				left: Math.random() * 100,
				delay: Math.random() * 0.8,
				duration: 2.5 + Math.random() * 1.5,
				rotate: Math.random() * 360,
				color: this.colors[Math.floor(Math.random() * this.colors.length)]
			});
		}
	}

	get totalText(): string {
		return formatCurrency(this.totalAmount);
	}

	get orderDateText(): string {
		return formatDateTime(this.orderDate);
	}

	copyBillCode(): void {
		if (!this.billCode) return;
		if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(this.billCode).catch(() => {
				this.fallbackCopy(this.billCode);
			});
		} else {
			this.fallbackCopy(this.billCode);
		}
	}

	private fallbackCopy(text: string): void {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		try {
			document.execCommand('copy');
		} catch { /* no-op */ }
		document.body.removeChild(textarea);
	}

	goHome(): void {
		this.router.navigate(['/home']);
	}

	goShopping(): void {
		this.router.navigate(['/products']);
	}
}
