import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, model, OnInit, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ProductService } from '../../../services/product-service';
import { environment } from '../../../environments/environment';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ProductModel } from '../../../models/product-model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonComponent, NzButtonModule } from "ng-zorro-antd/button";
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FAVOURITE_KEY, NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS, getProductImageUrl } from '../../../shared/common.config';

@Component({
	selector: 'app-shopping-detail',
	imports: [
		CommonModule,
		FormsModule,
		BreadcrumbModule,
		NzIconModule,
		NzButtonModule,
		InputNumberModule,
		NzBreadCrumbModule,
		RouterLink,
		NzBreadCrumbModule
	],
	templateUrl: './shopping-detail.html',
	styleUrl: './shopping-detail.css',
	standalone: true,
	providers: [
		ProductService
	]
})
export class ShoppingDetail implements OnInit {

	private productService = inject(ProductService);
	private notification = inject(NzNotificationService);
	private router = inject(Router);
	private route = inject(ActivatedRoute);
	private cdr = inject(ChangeDetectorRef);

	items: MenuItem[] | undefined;
	home: MenuItem | undefined;

	product: any = {};
	productImages: any = model([]);
	responsiveOptions: any[] = [];
	currentImageIndex = signal(0);

	shopingCarts: any[] = [];
	quantityBuy: number = 1;

	ngOnInit() {
		this.items = [
			{ label: 'Trang chủ' },
			{ label: 'Sản phẩm' },
			{ label: this.product?.ProductName || 'Chi tiết' }
		];
		this.home = { label: 'Trang chủ', icon: 'pi pi-home' };

		this.responsiveOptions = [
			{ breakpoint: '1400px', numVisible: 5, numScroll: 1 },
			{ breakpoint: '1199px', numVisible: 4, numScroll: 1 },
			{ breakpoint: '767px',  numVisible: 3, numScroll: 1 },
			{ breakpoint: '575px',  numVisible: 2, numScroll: 1 }
		];

		const id = Number(this.route.snapshot.queryParamMap.get('id')) || 3;
		this.lodaProductDetail(id);

	}

	lodaProductDetail(id: number) {
		this.productService.getByID(id).subscribe({
			next: (res) => {
				this.product = res.data?.product || {};

				this.items = [
					{ label: 'Trang chủ' },
					{ label: 'Sản phẩm' },
					{ label: this.product?.ProductName || 'Chi tiết' }
				];

				const productImages = res.data?.productImages || [];
				const mappedImages = productImages.map((item: any) => {
					const url = item.FileName;
					return {
						...item,
						Url: url,
						ThumbUrl: url
					};
				});
				mappedImages.sort((a: any, b: any) => (b.IsPrimary ? 1 : 0) - (a.IsPrimary ? 1 : 0));
				this.productImages.set(mappedImages);
				this.currentImageIndex.set(0);

				this.cdr.detectChanges();
			},
			error: (err) => {
				this.notification.create(
					NOTIFICATION_TYPE_MAP[err.status] || 'error',
					NOTIFICATION_TITLE_MAP[err.status as RESPONSE_STATUS] || 'Lỗi',
					err?.error?.message || `${err.error}\n${err.message}`,
					{
						nzStyle: { whiteSpace: 'pre-line' }
					}
				);
			}
		})
	}

	getStatusName(status: number | undefined): string {
		const statusMap: Record<number, string> = {
			1: 'Còn hàng',
			2: 'Hết hàng',
			3: 'Hàng mới'
		};
		return status != null ? (statusMap[status] || 'Không xác định') : 'Không xác định';
	}

	isFavourite(item: any): boolean {
		let favourites = localStorage.getItem(FAVOURITE_KEY);
		let list = favourites ? JSON.parse(favourites) : [];

		return list.some((x: any) => x.id === item.id);
	}
	onAddFavourite(item: any) {
		let favourites = localStorage.getItem(FAVOURITE_KEY);
		let list = favourites ? JSON.parse(favourites) : [];

		const index = list.findIndex((x: any) => x.id === item.id);

		if (index > -1) {
			list.splice(index, 1);
		} else list.push(item);

		localStorage.setItem(FAVOURITE_KEY, JSON.stringify(list));
	}

	prevImage() {
		const idx = this.currentImageIndex();
		if (idx > 0) this.currentImageIndex.set(idx - 1);
	}

	nextImage() {
		const idx = this.currentImageIndex();
		if (idx < this.productImages().length - 1) this.currentImageIndex.set(idx + 1);
	}

	private pointerStartX = 0;
	private pointerStartY = 0;
	private pointerActive = false;
	private readonly SWIPE_THRESHOLD = 50;

	onPointerDown(e: PointerEvent): void {
		this.pointerActive = true;
		this.pointerStartX = e.clientX;
		this.pointerStartY = e.clientY;
	}

	onPointerMove(_e: PointerEvent): void {
		// No-op: chi can luu vi tri cuoi o pointerup de don gian
	}

	onPointerUp(e: PointerEvent): void {
		if (!this.pointerActive) return;
		this.pointerActive = false;
		const dx = e.clientX - this.pointerStartX;
		const dy = e.clientY - this.pointerStartY;
		if (Math.abs(dy) > Math.abs(dx)) return;
		if (dx <= -this.SWIPE_THRESHOLD) this.nextImage();
		else if (dx >= this.SWIPE_THRESHOLD) this.prevImage();
	}

	onAddToCart(item: any, router: string = '') {
		if (!item) return;
		this.productService.onAddToCart({
			ID: item.ID,
			ProductName: item.ProductName || this.product.ProductName,
			UnitPrice: item.UnitPrice || this.product.UnitPrice,
			Quantity: this.quantityBuy > 0 ? this.quantityBuy : 1,
		}, router);
	}
}