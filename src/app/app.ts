import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { LOGO_URL } from './shared/common.config';

@Component({
	selector: 'app-root',
	imports: [
		// RouterLink,
		RouterOutlet,
		NzIconModule,
		NzLayoutModule,
		NzMenuModule
	],
	// templateUrl: './app.html',
	// styleUrl: './app.css',
	template: '<router-outlet></router-outlet>',
	standalone: true,
})
export class App {

}
