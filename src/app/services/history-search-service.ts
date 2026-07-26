import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root',
})
export class HistorySearchService {

	private url = environment.host + 'api/historysearch';

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
}
