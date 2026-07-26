import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root',
})
export class PromtionService {

	private url = environment.host + 'api/promotion';
	private router = inject(Router);

	constructor(private http: HttpClient) { }

	getData(keyword: any = ''): Observable<any> {
		return this.http.get<any>(this.url, { params: new HttpParams().set("keyword", keyword) });
	}

	getByID(id: number): Observable<any> {
		return this.http.get<any>(`${this.url}/${id}`);
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


	uploadFile(files: File[], promtionID: number): Observable<any> {
		const formData = new FormData();
		if (files) {
			Array.from(files).forEach(file => {
				formData.append('files', file);
			});
		}

		formData.append('PromotionID', promtionID.toString());
		return this.http.post<any>(`${this.url}/upload-file`, formData);
	}
}
