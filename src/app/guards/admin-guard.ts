import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../layouts/auth-layout/auth-service';

export const adminGuard: CanActivateFn = (route, state) => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (!authService.isLoggedIn()) {
		router.navigate(['/login']);
		return false;
	}

	if (!authService.isAdmin()) {
		router.navigate(['/home']);
		return false;
	}

	return true;
};
