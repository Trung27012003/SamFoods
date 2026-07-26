import { Routes } from '@angular/router';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { Welcome } from './pages/welcome/welcome';
import { Login } from './layouts/auth-layout/login/login';
import { Register } from './layouts/auth-layout/register/register';
import { ChangePassword } from './layouts/auth-layout/change-password/change-password';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { ShoppingLayout } from './layouts/shopping-layout/shopping-layout';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
	// { path: '', pathMatch: 'full', redirectTo: '/welcome' },
	// {
	//   path: 'welcome',
	//   loadChildren: () => import('./pages/welcome/welcome.routes').then((m) => m.WELCOME_ROUTES),
	// },


	{
		path: '',
		component: AuthLayout,
		children: [
			{ path: 'login', component: Login },
			{ path: 'register', component: Register },
			{ path: 'change-password', component: ChangePassword },
			{path: '', redirectTo: 'login', pathMatch: 'full' },
		]
	},

	{
		path: '',
		component: ShoppingLayout,
		children: [
			{ path: '', redirectTo: 'home', pathMatch: 'full' },
			{ path: 'home', loadChildren: () => import('./pages/shopping/shopping.routes').then((m) => m.SHOPPING_ROUTES) },
			{ path: 'products', loadChildren: () => import('./pages/products-list/products-list.routes').then((m) => m.PRODUCTSLIST_ROUTES) },
			{ path: 'detail', loadChildren: () => import('./pages/shopping/shopping-detail/shopping-detail.routes').then((m) => m.SHOPPINGDETAIL_ROUTES) },
			{ path: 'cart', loadChildren: () => import('./pages/shopping/shopping-cart/shopping-cart.routes').then((m) => m.SHOPPINGCART_ROUTES) },
			{ path: 'checkout/success', loadChildren: () => import('./pages/checkout-success/checkout-success.routes').then((m) => m.CHECKOUT_SUCCESS_ROUTES) },
		]
	},
	{
		path: 'admin',
		component: AdminLayout,
		canActivate: [],
		children: [
			{
				path: 'welcome',
				loadChildren: () => import('./pages/welcome/welcome.routes').then((m) => m.WELCOME_ROUTES),
			},

			{
				path: 'product',
				loadChildren: () => import('./pages/product/product.routes').then((m) => m.PRODUCT_ROUTES),
			},

			{
				path: 'category',
				loadChildren: () => import('./pages/category/category.routes').then((m) => m.CATEGORY_ROUTES),
			},

			{
				path: 'unit-count',
				loadChildren: () => import('./pages/unit-count/unit-count.routes').then((m) => m.UNITCOUNT_ROUTES),
			},

			{
				path: 'promotion',
				loadChildren: () => import('./pages/promtion/promotion.routes').then((m) => m.PROMTION_ROUTES),
			},

			{
				path: 'banner',
				loadChildren: () => import('./pages/banner/banner.routes').then((m) => m.BANNER_ROUTES),
			},

			{
				path: 'invoice',
				loadChildren: () => import('./pages/invoice/invoice.routes').then((m) => m.INVOICE_ROUTES),
			},
		]
	}
];
