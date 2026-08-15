import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnDestroy, OnInit, signal } from "@angular/core";
import { Router, RouterOutlet, RouterLinkWithHref } from "@angular/router";
import { NzFloatButtonModule } from "ng-zorro-antd/float-button";
import { AvatarModule } from "primeng/avatar";
import { ButtonModule } from "primeng/button";
import { MegaMenuModule } from "primeng/megamenu";
import { NzInputModule, NzInputSearchEvent } from "ng-zorro-antd/input";
import { NzAutocompleteComponent, NzAutocompleteModule } from "ng-zorro-antd/auto-complete";
import { SelectButtonModule } from "primeng/selectbutton";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzDrawerModule } from "ng-zorro-antd/drawer";
import { NzIconModule } from "ng-zorro-antd/icon";
import { MegaMenuItem } from "primeng/api";
import { FormsModule } from "@angular/forms";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzBadgeModule } from "ng-zorro-antd/badge";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { ShoppingCart } from "../../pages/shopping/shopping-cart/shopping-cart";
import { CategoryService } from "../../services/category-service";
import { NzNotificationService } from "ng-zorro-antd/notification";
import { CART_PRODUCT_KEY, LOGO_URL, NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS } from "../../shared/common.config";
import { SiteSettingsStore } from "../../shared/site-settings";
import { ProductService } from "../../services/product-service";
import { HistorySearchService } from "../../services/history-search-service";
import { AuthService } from "../auth-layout/auth-service";

interface NavLink { id: number; label: string; link: string; }

@Component({
	selector: 'app-shopping-layout',
	imports: [
		CommonModule,
		FormsModule,
		RouterOutlet,
		AvatarModule,
		ButtonModule,
		MegaMenuModule,
		SelectButtonModule,
		NzDropdownModule,
		NzDrawerModule,
		NzIconModule,
		NzInputModule,
		NzAutocompleteModule,
		NzFloatButtonModule,
		NzCardModule,
		NzBadgeModule,
		NzDividerModule,
		ShoppingCart,
		RouterLinkWithHref
	],
	templateUrl: './shopping-layout.html',
	styleUrl: './shopping-layout.css',
	standalone: true,
	providers: [
		CategoryService,
		ProductService,
		HistorySearchService
	]
})
export class ShoppingLayout implements OnInit, OnDestroy {

	private productService = inject(ProductService);
	private categoryService = inject(CategoryService);
	private historySearchService = inject(HistorySearchService);
	private notification = inject(NzNotificationService);
	private router = inject(Router);
	private authService = inject(AuthService);
	private siteSettings = inject(SiteSettingsStore);

	get isLoggedIn(): boolean {
		return this.authService.isLoggedIn();
	}

	get currentUser() {
		return this.authService.getCurrentUser();
	}

	get isAdmin(): boolean {
		return this.authService.isAdmin();
	}

	logout(): void {
		this.authService.logout();
		this.router.navigate(['/login']);
	}

	megaMenuItems = signal<MegaMenuItem[] | undefined>(undefined);
	responsiveOptions: any[] | undefined;
	products: any[] = [];
	productNews: any[] = [];
	productBestSellers: any[] = [];

	options: any[] = ['list', 'grid'];
	layout = this.options[0];
	keyword = '';

	autoCompleteKeywords = signal<string[]>([]);
	optionKeywordss = ['Burns Bay Road', 'Downing Street', 'Wall Street'];

	isVisibleShopingCard = false;
	isMobileMenuOpen = false;

	toggleMobileMenu(): void {
		this.isMobileMenuOpen = !this.isMobileMenuOpen;
	}

	closeMobileMenu(): void {
		this.isMobileMenuOpen = false;
	}

	totalQuantity = computed(() =>
		this.productService.carts().reduce((sum, item) => sum + item.Quantity, 0)
	);

	get totalQuantityNumber(): number {
		return this.totalQuantity();
	}

	isOnCartPage(): boolean {
		return this.router.url.includes('/cart');
	}

	logoURL = computed(() => this.siteSettings.imageUrl('logo_header', LOGO_URL));
	footerLogoURL = computed(() => this.siteSettings.imageUrl('logo_footer', LOGO_URL));
	footerTagline = computed(() => this.siteSettings.get('footer_tagline', 'SamFoods - Đặt đồ ăn nhanh, giao tận nơi.'));
	footerCopyright = computed(() => this.siteSettings.get('footer_copyright', '© 2026 SamFoods. Đã đăng ký bản quyền.'));
	businessLicense = computed(() => this.siteSettings.get('business_license', ''));
	contactAddress = computed(() => this.siteSettings.get('contact_address', ''));
	contactEmail = computed(() => this.siteSettings.get('contact_email', ''));
	contactHours = computed(() => this.siteSettings.get('contact_hours', ''));
	contactPhone1 = computed(() => this.siteSettings.get('contact_phone_1', ''));
	contactPhone2 = computed(() => this.siteSettings.get('contact_phone_2', ''));

	aboutLinks = computed<NavLink[]>(() => this.parseNavLinks('nav_about', [
		{ id: 1, label: 'Giới thiệu', link: '/home' },
		{ id: 2, label: 'Tầm nhìn & Sứ mệnh', link: '/home' },
		{ id: 3, label: 'Đội ngũ của chúng tôi', link: '/home' },
		{ id: 4, label: 'Tuyển dụng', link: '/home' },
		{ id: 5, label: 'Tin tức & Sự kiện', link: '/home' }
	]));

	supportLinks = computed<NavLink[]>(() => this.parseNavLinks('nav_support', [
		{ id: 1, label: 'Hướng dẫn đặt hàng', link: '/home' },
		{ id: 2, label: 'Câu hỏi thường gặp', link: '/home' },
		{ id: 3, label: 'Liên hệ hỗ trợ', link: '/home' },
		{ id: 4, label: 'Đăng ký đối tác', link: '/home' },
		{ id: 5, label: 'Đánh giá dịch vụ', link: '/home' }
	]));

	policyLinks = computed<NavLink[]>(() => this.parseNavLinks('nav_policy', [
		{ id: 1, label: 'Chính sách đổi trả', link: '/home' },
		{ id: 2, label: 'Chính sách hoàn tiền', link: '/home' },
		{ id: 3, label: 'Chính sách vận chuyển', link: '/home' },
		{ id: 4, label: 'Chính sách bảo mật', link: '/home' },
		{ id: 5, label: 'Điều khoản sử dụng', link: '/home' }
	]));

	socialZaloUrl = computed(() => this.siteSettings.get('social_zalo_url', 'https://zalo.me/0966669001'));
	socialFacebookUrl = computed(() => this.siteSettings.get('social_facebook_url', 'https://www.facebook.com/NguyenVietHaiLong'));
	socialMessengerUrl = computed(() => this.siteSettings.get('social_messenger_url', 'https://m.me/NguyenVietHaiLong'));
	socialPhone = computed(() => this.siteSettings.get('social_phone', 'tel:0384657756'));

	parseNavLinks(key: string, fallback: NavLink[]): NavLink[] {
		const raw = this.siteSettings.get(key, '');
		if (!raw) return fallback;
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed) && parsed.length > 0) return parsed;
		} catch {
		}
		return fallback;
	}

	constructor() {
		this.loadHistorySearch();
	}

	ngOnInit(): void {
		// this.loadHistorySearch();
		this.initMenuItems();
		this.loadShoppingCards();
		this.loadNewProducts();

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

	private onCartUpdated = () => this.loadShoppingCards();

	initMenuItems() {
		const baseItems: MegaMenuItem[] = [
			{
				label: 'Hàng mới',
				command: () => {
					this.router.navigate(['/home']);
				}
			},
			{
				label: 'Tất cả sản phẩm',
				command: () => {
					this.router.navigate(['/products']);
				}
			},
			{
				label: 'Bán chạy',
			},
		];
		this.megaMenuItems.set(baseItems);

		this.categoryService.getData().subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					const categoryRoot = res.data.filter((x: any) => x.ParentID === 0 && x.IsDeleted === 0);
					const current = this.megaMenuItems() ?? [];
					this.megaMenuItems.set([
						...current,
					]);
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
	}

	loadShoppingCards() {
		const cartValue = localStorage.getItem(CART_PRODUCT_KEY);
		const carts = cartValue ? JSON.parse(cartValue) : [];
		this.productService.setCarts(carts);
	}

	newProducts = signal<any[]>([]);

	loadNewProducts() {
		this.productService.getData().subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					// Get 10 newest products
					const products = (res.data || []).slice(0, 10);
					this.newProducts.set(products);
				});
			},
			error: (err) => console.error(err)
		});
	}

	loadHistorySearch() {
		this.historySearchService.getData().subscribe({
			next: (res) => {
				Promise.resolve().then(() => {
					const keywords = res.data.map((item: any) => item.Keyword);
					this.optionKeywordss = keywords;
					this.autoCompleteKeywords.set(keywords);
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
	}

	onCloseShoppingCard(event?: Event) {
		event?.stopPropagation();
		event?.preventDefault();
		this.isVisibleShopingCard = false;
	}

	onChange(value: string): void {
		const filtered = this.optionKeywordss.filter(option => option.toLowerCase().indexOf(value.toLowerCase()) !== -1);
		this.autoCompleteKeywords.set(filtered);
	}

	onSearch(event: NzInputSearchEvent): void {

		const keyword = (event.value || '').trim();
		if (!keyword) return;

		const data = {
			ID: 0,
			Keyword: keyword
		};

		this.historySearchService.saveData(data).subscribe({
			next: (res) => {
				console.log('res.data:', res.data);
				this.loadHistorySearch();
				this.router.navigate(['/products'], { queryParams: { keyword } });
			},
			error: (err) => {
				// Vẫn navigate dù lỗi lưu lịch sử
				this.router.navigate(['/products'], { queryParams: { keyword } });
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

	mobileMenuCategories = computed(() => {
		const items = this.megaMenuItems() ?? [];
		return items.filter(item => !!item.label);
	});
}
