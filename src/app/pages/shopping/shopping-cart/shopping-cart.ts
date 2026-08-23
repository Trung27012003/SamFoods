import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonComponent, NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzListModule } from 'ng-zorro-antd/list';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InvoiceDetailModel } from '../../../models/invoice-detail-model';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { InvoiceService } from '../../../services/invoice-service';
import { ProductService } from '../../../services/product-service';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { CART_PRODUCT_KEY, FAVOURITE_KEY, NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS, getProductImageUrl } from '../../../shared/common.config';


@Component({
	selector: 'app-shopping-cart',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		NzIconModule,
		NzButtonModule,
		ButtonModule,
		InputNumberModule,
		NzFormModule,
		NzInputModule,
		NzDrawerModule,
		RouterLink
	],
	templateUrl: './shopping-cart.html',
	styleUrl: './shopping-cart.css',
	standalone: true,
})
export class ShoppingCart implements OnInit {
	private invoiceService = inject(InvoiceService)
	private productService = inject(ProductService);
	private formBuilder = inject(NonNullableFormBuilder);
	private notification = inject(NzNotificationService);
	private router = inject(Router);
	favouriteKey = 'favourite_products';
	cartProductKey = 'cart_products';
	shopingCarts = signal<InvoiceDetailModel[]>([]);
	totalAmount = signal<number>(0);
	loading = signal<boolean>(true);
	isMobileCheckoutVisible = false;

	validateForm = this.formBuilder.group({
		CustomerName: this.formBuilder.control('', [Validators.required, Validators.minLength(2)]),
		PhoneNumber: this.formBuilder.control('', [Validators.required, Validators.pattern(/^(0[3|5|7|8|9])[0-9]{8}$/)]),
		Address: this.formBuilder.control('', [Validators.required, Validators.minLength(5)]),
		Note: this.formBuilder.control(''),
	});

	ngOnInit(): void {
		this.loadShoppingCards();

		window.addEventListener('storage', this.onStorageChange);
		window.addEventListener('cartUpdated', this.onCartUpdated);
	}

	ngOnDestroy(): void {
		window.removeEventListener('storage', this.onStorageChange);
		window.removeEventListener('cartUpdated', this.onCartUpdated);
	}

	private onStorageChange = (e: StorageEvent) => {
		if (e.key === CART_PRODUCT_KEY) this.loadShoppingCards();
	};

	private onCartUpdated = (e: Event) => {
		if ((e as CustomEvent).detail?.source === 'shopping-cart') return;
		this.loadShoppingCards();
	}

	loadShoppingCards() {
		let cartValue = localStorage.getItem(this.cartProductKey);
		const raw: any[] = cartValue ? JSON.parse(cartValue) : [];
		this.loading.set(true);

		if (raw.length === 0) {
			this.shopingCarts.set([]);
			this.totalAmount.set(0);
			this.loading.set(false);
			return;
		}

		const productIds = raw.map((item: any) => item.ProductID).filter(Boolean);
		this.productService.loadCartItemsFromDB(productIds).subscribe({
			next: (res) => {
				const productMap = new Map<number, any>();
				(res.data || []).forEach((p: any) => productMap.set(p.ProductID, p));

				const validRaw: any[] = [];
				const invalidIds: number[] = [];

				const carts: InvoiceDetailModel[] = raw
					.map((item: any) => {
						const product = productMap.get(item.ProductID);

						// Bỏ sản phẩm đã xoá (IsDeleted=true), không còn bán (Status<=0 / IsActive=false), hoặc không tìm thấy
						const isDeleted = !product || product.IsDeleted === true;
						const isUnavailable = product && (
							product.Status === 0 ||
							product.IsActive === false
						);
						if (isDeleted || isUnavailable) {
							invalidIds.push(item.ProductID);
							return null;
						}

						const primaryImage = product?.Images?.find((img: any) => img.IsPrimary)
							|| product?.Images?.[0];

						let imageUrl = '';
						if (primaryImage?.ProductCode && primaryImage?.FileName) {
							// imageUrl = getProductImageUrl(
							// 	`Product/${primaryImage.ProductCode}/${primaryImage.FileName}`
							// );
              imageUrl = getProductImageUrl(
								`${primaryImage.FileName}`
							);
						}

						validRaw.push(item);

						return {
							...item,
							ProductName: product?.ProductName || item.ProductName,
							ProductCode: product?.ProductCode || item.ProductCode || '',
							UnitPrice: item.UnitPrice || product?.UnitPrice,
							TotalPrice: (item.UnitPrice || product?.UnitPrice || 0) * item.Quantity,
							ImageURL: imageUrl,
						};
					})
					.filter((c): c is InvoiceDetailModel => c !== null);

				this.shopingCarts.set(carts);

				// Đồng bộ localStorage: xoá các sản phẩm không hợp lệ
				if (invalidIds.length > 0) {
					const cleaned = raw.filter(item => !invalidIds.includes(item.ProductID));
					localStorage.setItem(this.cartProductKey, JSON.stringify(cleaned));
					window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { source: 'shopping-cart' } }));

					this.notification.warning(
						'Một số sản phẩm đã ngừng bán',
						`Đã tự động xoá ${invalidIds.length} sản phẩm không còn khả dụng khỏi giỏ hàng.`,
						{ nzDuration: 4000 }
					);
				}

				this.recalculateTotal();
				this.loading.set(false);
			},
			error: () => {
				this.shopingCarts.set(raw.map((item: any) => ({ ...item, ImageURL: '' })));
				this.recalculateTotal();
				this.loading.set(false);
			}
		});
	}

	private recalculateTotal() {
		const sum = this.shopingCarts().reduce((s, i) => s + (i.TotalPrice || 0), 0);
		this.totalAmount.set(sum);
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

	caculatorTotalPrice(item: any) {
		if (item.Quantity <= 0) {
			const remaining = this.shopingCarts().filter(c => c.ProductID !== item.ProductID);
			this.shopingCarts.set(remaining);
			localStorage.setItem(this.cartProductKey, JSON.stringify(
				remaining.map(({ ImageURL, ...rest }: any) => rest)
			));
			this.recalculateTotal();
			window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { source: 'shopping-cart' } }));
			return;
		}

		item.TotalPrice = item.Quantity * item.UnitPrice;

		const updated = this.shopingCarts().map(c => c.ProductID === item.ProductID ? item : c);
		this.shopingCarts.set(updated);
		localStorage.setItem(this.cartProductKey, JSON.stringify(
			updated.map(({ ImageURL, ...rest }: any) => rest)
		));
		this.recalculateTotal();
		window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { source: 'shopping-cart' } }));
	}

	saveData() {
		if (this.shopingCarts().length === 0) {
			this.notification.warning('Giỏ hàng trống', 'Vui lòng thêm sản phẩm vào giỏ hàng');
			return;
		}

		if (this.validateForm.valid) {

			// this.saveData(data);
			const data = {
				...this.validateForm.value,
				InvoiceDetails: this.shopingCarts()
			}

			console.log('submit', data);
			this.invoiceService.saveData(data).subscribe({
				next: (res) => {
					const savedInvoice = res?.data;
					const billCode = savedInvoice?.BillCode || '';
					const totalAmount = savedInvoice?.TotalAmount ?? this.totalAmount();

					localStorage.removeItem(CART_PRODUCT_KEY);
					this.shopingCarts.set([]);
					this.totalAmount.set(0);
					this.validateForm.reset();
					window.dispatchEvent(new CustomEvent('cartUpdated'));

					this.router.navigate(['/checkout/success'], {
						queryParams: {
							billCode,
							customerName: data.CustomerName,
							phoneNumber: data.PhoneNumber,
							address: data.Address,
							note: data.Note || '',
							totalAmount
						}
					});
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
		} else {
			Object.values(this.validateForm.controls).forEach(control => {
				if (control.invalid) {
					control.markAsDirty();
					control.updateValueAndValidity({ onlySelf: true });
				}
			});
		}
	}

	openMobileCheckout() {
		this.isMobileCheckoutVisible = true;
	}

	closeMobileCheckout() {
		this.isMobileCheckoutVisible = false;
	}
}
