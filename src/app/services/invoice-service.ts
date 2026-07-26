import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InvoiceStatsModel } from '../models/invoice-stats-model';

@Injectable({
	providedIn: 'root',
})
export class InvoiceService {
	private url = environment.host + 'api/invoice'

	constructor(private http: HttpClient) { }

	getData(param: any = null): Observable<any> {
		return this.http.get<any>(this.url, { params: param });
	}

	getStats(): Observable<{ status: number; message: string; data: InvoiceStatsModel }> {
		return this.http.get<{ status: number; message: string; data: InvoiceStatsModel }>(`${this.url}/stats`);
	}

	getByID(id: number): Observable<any> {
		return this.http.get<any>(`${this.url}/${id}`);
	}

	saveData(data: any): Observable<any> {
		return this.http.post<any>(`${this.url}/save-data`, data);
	}

	updateStatus(data: any): Observable<any> {
		return this.http.post<any>(`${this.url}/save-data`, data);
	}

	softDelete(id: number): Observable<any> {
		return this.http.post<any>(`${this.url}/save-data`, { ID: id, IsDeleted: true });
	}
}
