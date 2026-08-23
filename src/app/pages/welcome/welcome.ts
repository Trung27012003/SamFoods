import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { ProductService } from '../../services/product-service';
import { CategoryService } from '../../services/category-service';
import { BannerService } from '../../services/banner-service';
import { InvoiceService } from '../../services/invoice-service';
import { PromtionService } from '../../services/promtion-service';
import { AdminPageHeader, CurrencyVndPipe } from '../../shared';
import { InvoiceStatsModel } from '../../models/invoice-stats-model';

interface KpiCard {
	label: string;
	value: number | string;
	icon: string;
	color: string;
	route?: string;
	loading?: boolean;
}

@Component({
	selector: 'app-welcome',
	imports: [CommonModule, RouterLink, NzIconModule, NzButtonModule, AdminPageHeader, CurrencyVndPipe],
	templateUrl: './welcome.html',
	styleUrl: './welcome.css'
})
export class Welcome implements OnInit {
	private productService = inject(ProductService);
	private categoryService = inject(CategoryService);
	private bannerService = inject(BannerService);
	private invoiceService = inject(InvoiceService);
	private promotionService = inject(PromtionService);

	kpis = signal<KpiCard[]>([
		{ label: 'Tổng sản phẩm', value: 0, icon: 'shopping', color: '#80001c', route: '/admin/product', loading: true },
		{ label: 'Danh mục', value: 0, icon: 'appstore', color: '#1677ff', route: '/admin/category', loading: true },
		{ label: 'Đơn hàng', value: 0, icon: 'file-text', color: '#52c41a', route: '/admin/invoice', loading: true },
		{ label: 'Khuyến mãi đang chạy', value: 0, icon: 'gift', color: '#faad14', route: '/admin/promotion', loading: true },
		{ label: 'Banner hoạt động', value: 0, icon: 'picture', color: '#722ed1', route: '/admin/banner', loading: true }
	]);

	stats = signal<InvoiceStatsModel | null>(null);

	ngOnInit(): void {
		this.loadProductCount();
		this.loadCategoryCount();
		this.loadInvoiceCount();
		this.loadPromotionCount();
		this.loadBannerCount();
		this.loadInvoiceStats();
	}

	updateKpi(label: string, value: number): void {
		const list = this.kpis().map(k => (k.label === label ? { ...k, value, loading: false } : k));
		this.kpis.set(list);
	}

	loadProductCount(): void {
		this.productService.getData().subscribe({
			next: (res: any) => this.updateKpi('Tổng sản phẩm', res?.data.total ?? 0),
			error: () => this.updateKpi('Tổng sản phẩm', 0)
		});
	}

	loadCategoryCount(): void {
		this.categoryService.getData().subscribe({
			next: (res) => this.updateKpi('Danh mục', (res.data || []).length),
			error: () => this.updateKpi('Danh mục', 0)
		});
	}

	loadInvoiceCount(): void {
		this.invoiceService.getData().subscribe({
			next: (res) => this.updateKpi('Đơn hàng', (res.data || []).length),
			error: () => this.updateKpi('Đơn hàng', 0)
		});
	}

	loadPromotionCount(): void {
		this.promotionService.getData().subscribe({
			next: (res) => {
				const active = (res.data || []).filter((p: any) => p.IsActive).length;
				this.updateKpi('Khuyến mãi đang chạy', active);
			},
			error: () => this.updateKpi('Khuyến mãi đang chạy', 0)
		});
	}

	loadBannerCount(): void {
		this.bannerService.getData().subscribe({
			next: (res) => {
				const active = (res.data || []).filter((b: any) => b.IsActive).length;
				this.updateKpi('Banner hoạt động', active);
			},
			error: () => this.updateKpi('Banner hoạt động', 0)
		});
	}

	loadInvoiceStats(): void {
		this.invoiceService.getStats().subscribe({
			next: (res) => {
				if (res?.data) this.stats.set(res.data);
			},
			error: () => this.stats.set(null)
		});
	}
}
