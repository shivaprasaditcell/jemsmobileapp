import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-helpdesk',
  templateUrl: './helpdesk.page.html',
  styleUrls: ['./helpdesk.page.scss'],
  standalone: false
})
export class HelpdeskPage {
  constructor(private router: Router) {}

  goTo(path: string) {
    this.router.navigateByUrl(path);
  }
}
