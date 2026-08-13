import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryModel } from '../models/category-model';

@Injectable({
	providedIn: 'root',
})
export class CategoryService {
	private url = environment.host + 'api/category';

	constructor(private http: HttpClient) { }

	getData(param: any = null): Observable<any> {
		return this.http.get<any>(this.url, { params: param });
	}

	getByID(id: number): Observable<any> {
		return this.http.get<any>(`${this.url}/${id}`);
	}

	getMaxSTT(): Observable<any> {
		return this.http.get<any>(`${this.url}/max-stt`);
	}

	suggestCategoryCode(): Observable<any> {
		return this.http.get<any>(`${this.url}/suggest-code`);
	}

	saveData(data: any): Observable<any> {
		return this.http.post<any>(`${this.url}/save-data`, data);
	}

	uploadFile(files: File[], categoryID: number, categoryImageRemoves: string = ""): Observable<any> {
		const formData = new FormData();
		if (files) {
			Array.from(files).forEach(file => {
				formData.append('files', file);
			});
		}

		formData.append('CategoryID', categoryID.toString());
		// formData.append('ProductImageRemoves', productImageRemoves.toString());
		return this.http.post<any>(`${this.url}/upload-file`, formData);
	}
}
