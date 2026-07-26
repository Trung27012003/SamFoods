import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BannerDetailModel } from '../models/banner-model';

@Injectable({
	providedIn: 'root',
})
export class BannerService {

	private url = environment.host + 'api/banner';

	constructor(private http: HttpClient) { }

	getData(keyword: string = ''): Observable<any> {
		return this.http.get<any>(this.url, { params: new HttpParams().set("keyword", keyword) });
	}

	getByID(id: number): Observable<any> {
		return this.http.get<any>(`${this.url}/${id}`);
	}

	getActiveBanner(keyword: string = ''): Observable<any> {
		return this.http.get<any>(this.url, { params: new HttpParams().set("keyword", keyword) });
	}

	saveData(data: any): Observable<any> {
		return this.http.post<any>(`${this.url}/save-data`, data);
	}

	saveDetail(data: any): Observable<any> {
		return this.http.post<any>(`${this.url}/save-detail`, data);
	}

	saveDetails(data: any[]): Observable<any> {
		return this.http.post<any>(`${this.url}/save-details`, data);
	}

	uploadFile(files: File[], bannerID: number, pendingDetails: BannerDetailModel[] = []): Observable<any> {
		const formData = new FormData();
		if (files) {
			Array.from(files).forEach(file => {
				formData.append('files', file);
			});
		}
		formData.append('BannerID', bannerID.toString());
		formData.append('details', JSON.stringify(pendingDetails));
		return this.http.post<any>(`${this.url}/upload-file`, formData);
	}

	deleteBanner(id: number): Observable<any> {
		return this.http.delete<any>(`${this.url}/${id}`);
	}
}
