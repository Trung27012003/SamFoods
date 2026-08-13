import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CART_PRODUCT_KEY } from '../shared/common.config';
import { Router } from '@angular/router';

export interface ProductsFilter {
	keyword?: string;
	categoryID?: number | null;
	status?: number | null;
	minPrice?: number | null;
	maxPrice?: number | null;
	unitCountID?: number | null;
	sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
	pageIndex?: number;
	pageSize?: number;
}

@Injectable({
	providedIn: 'root',
})
export class ProductService {
	private _carts = signal<any[]>([]);

	carts = this._carts.asReadonly();

	setCarts(carts: any[]) {
		this._carts.set(carts);
	}


	private url = environment.host + 'api/product';
	private router = inject(Router);

	constructor(private http: HttpClient) { }

	getData(keyword: any = '', params?: ProductsFilter): Observable<any> {
		let httpParams = new HttpParams().set('keyword', keyword);
		if (params) {
			if (params.categoryID != null) httpParams = httpParams.set('categoryID', params.categoryID.toString());
			if (params.status != null) httpParams = httpParams.set('status', params.status.toString());
			if (params.minPrice != null) httpParams = httpParams.set('minPrice', params.minPrice.toString());
			if (params.maxPrice != null) httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
			if (params.unitCountID != null) httpParams = httpParams.set('unitCountID', params.unitCountID.toString());
			if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
			if (params.pageIndex) httpParams = httpParams.set('pageIndex', params.pageIndex.toString());
			if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
		}
		return this.http.get<any>(this.url, { params: httpParams });
	}

	getProductsPaged(filter: ProductsFilter): Observable<any> {
		return this.getData(filter.keyword ?? '', filter);
	}

	getByID(id: number): Observable<any> {
		return this.http.get<any>(`${this.url}/${id}`);
	}

	getMaxSTT(): Observable<any> {
		return this.http.get<any>(`${this.url}/max-stt`);
	}

	suggestProductCode(): Observable<any> {
		return this.http.get<any>(`${this.url}/suggest-code`);
	}

	saveData(data: any): Observable<any> {
		return this.http.post<any>(`${this.url}/save-data`, data);
	}

	getImages(productID: number): Observable<any> {
		return this.http.get<any>(`${this.url}/images`,
			{
				params: new HttpParams()
					.set('productID', productID),
			}
		);
	}


	uploadFile(files: File[], productID: number, productImageRemoves: string, primaryImageId: number | null = null): Observable<any> {
		const formData = new FormData();
		if (files) {
			Array.from(files).forEach(file => {
				formData.append('files', file);
			});
		}

		formData.append('ProductID', productID.toString());
		formData.append('ProductImageRemoves', productImageRemoves.toString());
		formData.append('PrimaryImageID', primaryImageId?.toString() || '0');
		return this.http.post<any>(`${this.url}/upload-file`, formData);
	}

	onAddToCart(item: any, router: string = '') {
		let cartValue = localStorage.getItem(CART_PRODUCT_KEY);
		this._carts.set(cartValue ? JSON.parse(cartValue) : []);

		this._carts.update((carts) => {
			const existItem = this._carts().find((x: any) => x.ProductID === item.ID);

			if (existItem) {
				existItem.Quantity += item.Quantity || 1;
				existItem.TotalPrice = existItem.UnitPrice * existItem.Quantity;
			} else {
				carts.push({
					ProductID: item.ID,
					ProductName: item.ProductName,
					UnitPrice: item.UnitPrice,
					Quantity: item.Quantity || 1,
					TotalPrice: item.UnitPrice * (item.Quantity || 1),
				});
			}

			localStorage.setItem(CART_PRODUCT_KEY, JSON.stringify(carts));
			window.dispatchEvent(new CustomEvent('cartUpdated'));
			if (router) this.router.navigate([router]);
			return [...carts];
		});
	}

	loadCartItemsFromDB(productIds: number[]): Observable<any> {
		const ids = productIds.join(',');
		return this.http.get<any>(`${this.url}/cart-items`, {
			params: new HttpParams().set('ids', ids)
		});
	}
}
