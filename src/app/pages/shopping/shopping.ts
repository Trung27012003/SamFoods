import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductService } from '../../services/product-service';
import { CategoryService } from '../../services/category-service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { MegaMenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzFloatButtonModule } from 'ng-zorro-antd/float-button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzListModule } from 'ng-zorro-antd/list';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { DataViewModule } from 'primeng/dataview';
import { MegaMenuModule } from 'primeng/megamenu';
import { PanelModule } from 'primeng/panel';
import { RippleModule } from 'primeng/ripple';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { CART_PRODUCT_KEY, FAVOURITE_KEY, IMAGE_URL, NOTIFICATION_TITLE_MAP, NOTIFICATION_TYPE_MAP, RESPONSE_STATUS, getProductImageUrl } from '../../shared/common.config';
import { BannerService } from '../../services/banner-service';

@Component({
  selector: 'app-shopping',
  imports: [
    CommonModule,
    FormsModule,
    AvatarModule,
    ButtonModule,
    MegaMenuModule,
    RippleModule,
    CarouselModule,
    TagModule,
    DataViewModule,
    SelectButtonModule,
    NzDropdownModule,
    NzIconModule,
    NzInputModule,
    NzAutocompleteModule,
    NzCarouselModule,
    NzBadgeModule,
    NzCardModule,
    NzListModule,
    NzFloatButtonModule,
    PanelModule,
    NzGridModule,
    RouterLink
  ],
  templateUrl: './shopping.html',
  styleUrl: '../../layouts/shopping-layout/shopping-layout.css',
  styles: [`
		.section-header {
			margin-bottom: 1rem;
		}
		.see-all-link {
			color: var(--primary-color);
			text-decoration: none;
			font-weight: 600;
			font-size: 0.9rem;
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;
		}
		.see-all-link:hover {
			text-decoration: underline;
		}
		.new-arrivals-slider > .card.products-slider > h5.fw-bold.text-uppercase,
		.featured-product > h5.fw-bold.text-uppercase,
		.featured-product > .card.products-slider > h6.fw-bold {
			margin-bottom: 1rem;
		}
		@media (max-width: 768px) {
			.section-header h5 {
				font-size: 1rem;
			}
			.banner-slider .ant-carousel img,
			.banner-slider img {
				max-height: 200px !important;
				object-fit: cover;
			}
			h5.fw-bold.text-uppercase {
				font-size: 1rem;
			}
		}
		@media (max-width: 575.98px) {
			.banner-slider .ant-carousel img,
			.banner-slider img {
				max-height: 150px !important;
			}
			.new-arrivals-slider .product-card,
			.best-seller-slider .product-card,
			.featured-product .product-card {
				margin-bottom: 0.5rem;
			}
		}
	`],
  standalone: true,
  providers: [
    ProductService,
    CategoryService,
    BannerService
  ]
})
export class Shopping {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private bannerService = inject(BannerService);
  private notification = inject(NzNotificationService);
  private router = inject(Router);
  megaMenuItems: MegaMenuItem[] | undefined;
  responsiveOptions: any[] | undefined;
  bestSellerResponsiveOptions: any[] | undefined;
  products: any[] = [];
  productNews: any[] = [];
  productBestSellers: any[] = [];

  bannerSlides = signal<{ ImageURL: string; LinkURL?: string; SortOrder: number }[]>([]);
  slideshowInterval = 3000;
  categoryCarouselAutoplay = 5000;

  options: any[] = ['list', 'grid'];
  layout = this.options[0];
  keyword = '';

  autoCompleteKeywords = [
    { label: 'Lucy', value: 'lucy' },
    { label: 'Jack', value: 'jack' }
  ];


  // shoppingNumber = 5;
  isVisibleShopingCard = false;
  shopingCarts: any[] = [];

  ngOnInit(): void {
    this.initMenuItems();
    this.loadActiveBanner();
    this.loadProducts();
    this.loadShoppingCards();
  }

  initMenuItems() {
    this.megaMenuItems = [
      {
        label: 'Hàng mới',
      },
      {
        label: 'Bán chạy',
      },
      // {
      // 	label: 'Sports',
      // 	// icon: 'pi pi-clock',
      // 	items: [
      // 		[
      // 			{
      // 				label: 'Football',
      // 				items: [{ label: 'Kits' }, { label: 'Shoes' }, { label: 'Shorts' }, { label: 'Training' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Running',
      // 				items: [{ label: 'Accessories' }, { label: 'Shoes' }, { label: 'T-Shirts' }, { label: 'Shorts' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Swimming',
      // 				items: [{ label: 'Kickboard' }, { label: 'Nose Clip' }, { label: 'Swimsuits' }, { label: 'Paddles' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Tennis',
      // 				items: [{ label: 'Balls' }, { label: 'Rackets' }, { label: 'Shoes' }, { label: 'Training' }]
      // 			}
      // 		]
      // 	]
      // },
      // {
      // 	label: 'Sports',
      // 	// icon: 'pi pi-clock',
      // 	items: [
      // 		[
      // 			{
      // 				label: 'Football',
      // 				items: [{ label: 'Kits' }, { label: 'Shoes' }, { label: 'Shorts' }, { label: 'Training' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Running',
      // 				items: [{ label: 'Accessories' }, { label: 'Shoes' }, { label: 'T-Shirts' }, { label: 'Shorts' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Swimming',
      // 				items: [{ label: 'Kickboard' }, { label: 'Nose Clip' }, { label: 'Swimsuits' }, { label: 'Paddles' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Tennis',
      // 				items: [{ label: 'Balls' }, { label: 'Rackets' }, { label: 'Shoes' }, { label: 'Training' }]
      // 			}
      // 		]
      // 	]
      // },
      // {
      // 	label: 'Sports',
      // 	icon: 'pi pi-clock',
      // 	items: [
      // 		[
      // 			{
      // 				label: 'Football',
      // 				items: [{ label: 'Kits' }, { label: 'Shoes' }, { label: 'Shorts' }, { label: 'Training' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Running',
      // 				items: [{ label: 'Accessories' }, { label: 'Shoes' }, { label: 'T-Shirts' }, { label: 'Shorts' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Swimming',
      // 				items: [{ label: 'Kickboard' }, { label: 'Nose Clip' }, { label: 'Swimsuits' }, { label: 'Paddles' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Tennis',
      // 				items: [{ label: 'Balls' }, { label: 'Rackets' }, { label: 'Shoes' }, { label: 'Training' }]
      // 			}
      // 		]
      // 	]
      // },
      // {
      // 	label: 'Sports',
      // 	icon: 'pi pi-clock',
      // 	items: [
      // 		[
      // 			{
      // 				label: 'Football',
      // 				items: [{ label: 'Kits' }, { label: 'Shoes' }, { label: 'Shorts' }, { label: 'Training' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Running',
      // 				items: [{ label: 'Accessories' }, { label: 'Shoes' }, { label: 'T-Shirts' }, { label: 'Shorts' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Swimming',
      // 				items: [{ label: 'Kickboard' }, { label: 'Nose Clip' }, { label: 'Swimsuits' }, { label: 'Paddles' }]
      // 			}
      // 		],
      // 		[
      // 			{
      // 				label: 'Tennis',
      // 				items: [{ label: 'Balls' }, { label: 'Rackets' }, { label: 'Shoes' }, { label: 'Training' }]
      // 			}
      // 		]
      // 	]
      // }
    ];

    this.categoryService.getData().subscribe({
      next: (res) => {
        Promise.resolve().then(() => {
          const categoryRoot = res.data.filter((x: any) => x.ParentID === 0 && x.IsDeleted === 0);
          this.megaMenuItems?.push(
            {
              label: 'Sports',
              // icon: 'pi pi-clock',
              items: [
                [
                  {
                    label: 'Football',
                    items: [{ label: 'Kits' }, { label: 'Shoes' }, { label: 'Shorts' }, { label: 'Training' }]
                  }
                ],
                [
                  {
                    label: 'Running',
                    items: [{ label: 'Accessories' }, { label: 'Shoes' }, { label: 'T-Shirts' }, { label: 'Shorts' }]
                  }
                ],
                [
                  {
                    label: 'Swimming',
                    items: [{ label: 'Kickboard' }, { label: 'Nose Clip' }, { label: 'Swimsuits' }, { label: 'Paddles' }]
                  }
                ],
                [
                  {
                    label: 'Tennis',
                    items: [{ label: 'Balls' }, { label: 'Rackets' }, { label: 'Shoes' }, { label: 'Training' }]
                  }
                ]
              ]
            },
          );
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

  loadProducts() {
    forkJoin({
      products: this.productService.getData(),
      categories: this.categoryService.getData()
    }).subscribe({
      next: (res) => {
        Promise.resolve().then(() => {
          const data = (res.products.data || []).map((item: any) => ({
            ...item,
            ImageURL: getProductImageUrl(item.ImageURL),
          }));

          this.productNews = data;
          this.productBestSellers = data;

          const rootCats = (res.categories.data || []).filter(
            (x: any) => x.ParentID === 0 && x.IsDeleted == false
          );

          const grouped = Object.values(
            data.reduce((a: any, b: any) => {
              const cat = rootCats.find((c: any) => c.ID === b.CategoryID);
              if (!cat) return a;
              (a[b.CategoryID] ??= {
                categoryID: b.CategoryID,
                categoryName: cat.CategoryName,
                data: []
              }).data.push(b);

              return a;

            }, {})
          ).filter((g: any) => g.data.length > 0);

          this.products = grouped;
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
    });

    this.responsiveOptions = [
      {
        breakpoint: '1400px',
        numVisible: 6,
        numScroll: 1
      },
      {
        breakpoint: '1199px',
        numVisible: 5,
        numScroll: 1
      },
      {
        breakpoint: '991px',
        numVisible: 4,
        numScroll: 1
      },
      {
        breakpoint: '767px',
        numVisible: 2,
        numScroll: 1
      },
      {
        breakpoint: '575px',
        numVisible: 1,
        numScroll: 1
      }
    ];

    this.bestSellerResponsiveOptions = [
      {
        breakpoint: '1400px',
        numVisible: 6,
        numScroll: 6
      },
      {
        breakpoint: '1199px',
        numVisible: 4,
        numScroll: 4
      },
      {
        breakpoint: '991px',
        numVisible: 3,
        numScroll: 3
      },
      {
        breakpoint: '767px',
        numVisible: 2,
        numScroll: 2
      },
      {
        breakpoint: '575px',
        numVisible: 1,
        numScroll: 1
      }
    ];
  }

  loadShoppingCards() {
    // for (let i = 0; i < 10; i++) {
    // 	const item = {
    // 		href: 'https://ant.design',
    // 		title: `ant design part)`,
    // 		avatar: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png',
    // 		description: 'Ant Design, a design language for background applications, is refined by Ant UED Team.',
    // 		content:
    // 			'We supply a series of design principles, practical patterns and high quality design resources ' +
    // 			'(Sketch and Axure), to help people create their product prototypes beautifully and efficiently.'
    // 	}
    // 	this.dataShopingCards.push(item);
    // }

    let cartValue = localStorage.getItem(CART_PRODUCT_KEY);
    this.shopingCarts = cartValue ? JSON.parse(cartValue) : [];
  }

  loadActiveBanner() {
    const imageURL = IMAGE_URL + '/banner';
    this.bannerService.getActiveBanner().subscribe({
      next: (res) => {
        Promise.resolve().then(() => {
          const active = (res.data || []).find((b: any) => b.IsActive && !b.IsDeleted);
          if (!active) {
            this.bannerSlides.set([]);
            return;
          }

          this.slideshowInterval = (active.SlideshowInterval || 3) * 1000;
          this.bannerSlides.set((active.Details || [])
            .filter((d: any) => !d.IsDeleted && d.ImageName)
            .sort((a: any, b: any) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
            .map((d: any) => ({
              ImageURL: `${d.ImageName}`,
              // ImageURL: `${imageURL}/${active.BannerCode}/${d.ImageName}`,
              LinkURL: d.LinkURL,
              SortOrder: d.SortOrder,
            })));
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
    });
  }

  getSeverity(status: string) {
    switch (status) {
      case '1':
        return 'success';
      case '2':
        return 'warn';
      case '3':
        return 'danger';
      default:
        return 'info';
    }
  }

  onCloseShoppingCard() {
    this.isVisibleShopingCard = false;
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

  isFavourite(item: any): boolean {
    let favourites = localStorage.getItem(FAVOURITE_KEY);
    let list = favourites ? JSON.parse(favourites) : [];

    return list.some((x: any) => x.id === item.id);
  }

  onAddToCart(item: any) {
    this.productService.onAddToCart({
      ID: item.ID,
      ProductName: item.ProductName,
      UnitPrice: item.UnitPrice,
      Quantity: 1,
    });
  }

  onSearch() {
    const k = (this.keyword || '').trim();
    if (!k) return;
    this.router.navigate(['/products'], { queryParams: { keyword: k } });
  }
}
