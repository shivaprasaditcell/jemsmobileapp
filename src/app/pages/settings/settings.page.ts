import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage {
  constructor(private router: Router) {}

  goTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
