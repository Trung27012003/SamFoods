import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, tap, map } from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { environment } from '../../environments/environment';

export interface UserInfo {
	ID: number;
	UserName: string;
	RoleCodes: string;
	FullName: string;
	Email: string;
	PhoneNumber: string;
}

@Injectable({
	providedIn: 'root',
})
export class AuthService {
	private apiUrl = environment.host + 'api/auth';
	private token_key = 'token';
	private user_key = 'user_info';

	constructor(
		private http: HttpClient,
		private notification: NzNotificationService
	) { }

	login(credentials: { userName: string, password: string }): Observable<any> {
		return this.http.post(this.apiUrl + '/login', credentials).pipe(
			tap((res: any) => {
				if (res && res.access_token) {
					localStorage.setItem(this.token_key, res.access_token);
					this.saveUserFromToken(res.access_token);
				}
			}),
			catchError((err) => {
				this.notification.error('Lỗi', err?.error?.message || err.message);
				throw err;
			})
		);
	}

	private saveUserFromToken(token: string): void {
		try {
			const payload = token.split('.')[1];
			const decoded = JSON.parse(atob(payload));
			const user: UserInfo = {
				ID: decoded.id || 0,
				UserName: decoded.username || decoded.uniquename || '',
				RoleCodes: decoded.rolecodes || '',
				FullName: decoded.fullname || '',
				Email: decoded.email || '',
				PhoneNumber: decoded.phonenumber || ''
			};
			this.setCurrentUser(user);
		} catch {
			console.error('Failed to decode token');
		}
	}

	register(data: {
		UserName: string;
		Password: string;
		FullName?: string;
		Email?: string;
		PhoneNumber?: string;
	}): Observable<any> {
		return this.http.post(this.apiUrl + '/register', data).pipe(
			tap((res: any) => {
				if (res?.status === 1) {
					this.notification.success('Thành công', res.message);
				}
			}),
			catchError((err) => {
				this.notification.error('Lỗi', err?.error?.message || err.message);
				throw err;
			})
		);
	}

	changePassword(data: { OldPassword: string; NewPassword: string }): Observable<any> {
		const headers = new HttpHeaders({
			'Authorization': `Bearer ${this.getToken()}`
		});
		return this.http.post(this.apiUrl + '/change-password', data, { headers }).pipe(
			tap((res: any) => {
				if (res?.status === 1) {
					this.notification.success('Thành công', res.message);
				}
			}),
			catchError((err) => {
				this.notification.error('Lỗi', err?.error?.message || err.message);
				throw err;
			})
		);
	}

	logout(): void {
		localStorage.removeItem(this.token_key);
		localStorage.removeItem(this.user_key);
		sessionStorage.clear();
	}

	getToken(): string | null {
		return localStorage.getItem(this.token_key);
	}

	isLoggedIn(): boolean {
		return !!this.getToken();
	}

	getCurrentUser(): UserInfo | null {
		const userStr = localStorage.getItem(this.user_key);
		if (userStr) {
			try {
				return JSON.parse(userStr);
			} catch {
				return null;
			}
		}
		return null;
	}

	setCurrentUser(user: UserInfo): void {
		localStorage.setItem(this.user_key, JSON.stringify(user));
	}

	getAuthHeaders(): HttpHeaders {
		const token = this.getToken();
		return new HttpHeaders({
			'Authorization': token ? `Bearer ${token}` : ''
		});
	}

	decodeToken(): any {
		const token = this.getToken();
		if (!token) return null;
		try {
			const payload = token.split('.')[1];
			return JSON.parse(atob(payload));
		} catch {
			return null;
		}
	}

	isTokenExpired(): boolean {
		const decoded = this.decodeToken();
		if (!decoded || !decoded.exp) return true;
		return decoded.exp * 1000 < Date.now();
	}

	isAdmin(): boolean {
		const decoded = this.decodeToken();
		if (!decoded) return false;
		const roleCodes = decoded.rolecodes || decoded.role || '';
		return roleCodes.toUpperCase().includes('ADMIN');
	}
}
