import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SiteSettingModel } from '../models/site-setting-model';

@Injectable({
	providedIn: 'root',
})
export class SiteSettingService {
	private url = environment.host + 'api/sitesetting';

	constructor(private http: HttpClient) { }

	getPublic(): Observable<any> {
		return this.http.get<any>(`${this.url}/public`);
	}

	getAll(group?: string): Observable<any> {
		let params = new HttpParams();
		if (group) params = params.set('group', group);
		return this.http.get<any>(this.url, { params });
	}

	bulkUpdate(items: SiteSettingModel[]): Observable<any> {
		return this.http.put<any>(`${this.url}/bulk`, items);
	}

	uploadImage(file: File, settingKey: string): Observable<any> {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('SettingKey', settingKey);
		return this.http.post<any>(`${this.url}/upload-image`, formData);
	}
}
