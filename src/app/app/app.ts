import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteSettingsStore } from '../shared/site-settings';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	template: '<router-outlet></router-outlet>',
	standalone: true,
})
export class App implements OnInit {
	private siteSettings = inject(SiteSettingsStore);

	ngOnInit(): void {
		this.siteSettings.load().then(() => this.siteSettings.applyFavicon());
	}
}
