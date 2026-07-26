import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root',
})
export class UnitCountService {

	private url = environment.host + 'api/unitcount';

	constructor(private http: HttpClient) { }

	getData(param: any = null): Observable<any> {
		return this.http.get<any>(this.url, { params: param });
	}

	getByID(id: number): Observable<any> {
		return this.http.get<any>(`${this.url}/{id}`);
	}

	saveData(data: any): Observable<any> {
		return this.http.post<any>(`${this.url}/save-data`, data);
	}
}
