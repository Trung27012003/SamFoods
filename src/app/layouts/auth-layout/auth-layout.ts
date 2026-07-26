import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth-service';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  // templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  template:'<router-outlet></router-outlet>',
  standalone:true,
})
export class AuthLayout {
  constructor(
    private authService:AuthService,
  ) { };

  logout() {
    this.authService.logout();
  }
}
