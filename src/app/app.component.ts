import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { AuthService } from './core/services/auth.service';
import { CurrentUser, MenuItem } from './models/user.model';
import { filter } from 'rxjs/operators';

interface QuickAccessCard {
  title: string;
  subtitle: string;
  route: string | null;
  icon: string;
  accent: string;
  tint: string;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  user: CurrentUser | null = null;
  imgError = false;
  currentUrl = '';
  fabX = 0;
  fabY = 0;
  quickAccessOpen = false;
  quickAccessSearch = '';

  private readonly studentRouteMeta: QuickAccessCard[] = [
    { title: 'Home', subtitle: 'General', route: '/tabs/home', icon: 'home-outline', accent: '#de5b4b', tint: 'rgba(222, 91, 75, 0.14)' },
    { title: 'Timetable', subtitle: 'Academic', route: '/tabs/student-timetable', icon: 'calendar-outline', accent: '#3f7ccf', tint: 'rgba(63, 124, 207, 0.14)' },
    { title: 'Personal Details', subtitle: 'Profile', route: '/tabs/student-personal-info', icon: 'person-outline', accent: '#125875', tint: 'rgba(18, 88, 117, 0.14)' },
    { title: 'Academic', subtitle: 'Enrollment', route: '/tabs/student-enrollment', icon: 'school-outline', accent: '#3f7ccf', tint: 'rgba(63, 124, 207, 0.14)' },
    { title: 'Attendance', subtitle: 'Academic', route: '/tabs/student-attendance', icon: 'checkmark-circle-outline', accent: '#4d9c58', tint: 'rgba(77, 156, 88, 0.14)' },
    { title: 'Fee', subtitle: 'Finance', route: '/tabs/student-fees', icon: 'card-outline', accent: '#ed7a1c', tint: 'rgba(237, 122, 28, 0.14)' },
    { title: 'Documents', subtitle: 'Records', route: '/tabs/student-documents', icon: 'document-text-outline', accent: '#6a70ca', tint: 'rgba(106, 112, 202, 0.14)' },
    { title: 'Mentor', subtitle: 'Academic', route: '/tabs/mentoring-sessions', icon: 'people-circle-outline', accent: '#8d52c1', tint: 'rgba(141, 82, 193, 0.14)' },
    { title: 'Contacts', subtitle: 'Directory', route: '/tabs/contacts', icon: 'business-outline', accent: '#1d9eaf', tint: 'rgba(29, 158, 175, 0.14)' },
    { title: 'Marks Card', subtitle: 'Academic', route: '/tabs/student-marks', icon: 'ribbon-outline', accent: '#e05c5c', tint: 'rgba(224, 92, 92, 0.14)' },
    { title: 'Events', subtitle: 'General', route: '/tabs/events', icon: 'megaphone-outline', accent: '#1e9db5', tint: 'rgba(30, 157, 181, 0.14)' },
    { title: 'Change Password', subtitle: 'General', route: '/tabs/change-password', icon: 'lock-closed-outline', accent: '#d05454', tint: 'rgba(208, 84, 84, 0.14)' }
  ];

  private readonly routeMeta: QuickAccessCard[] = [
    { title: 'Home', subtitle: 'General', route: '/tabs/home', icon: 'home-outline', accent: '#de5b4b', tint: 'rgba(222, 91, 75, 0.14)' },
    { title: 'Timetable', subtitle: 'Academic', route: '/tabs/timetable', icon: 'calendar-outline', accent: '#3f7ccf', tint: 'rgba(63, 124, 207, 0.14)' },
    { title: 'Events', subtitle: 'General', route: '/tabs/events', icon: 'megaphone-outline', accent: '#1e9db5', tint: 'rgba(30, 157, 181, 0.14)' },
    { title: 'Contacts', subtitle: 'Directory', route: '/tabs/contacts', icon: 'business-outline', accent: '#6a70ca', tint: 'rgba(106, 112, 202, 0.14)' },
    { title: 'HRMS', subtitle: 'General', route: '/tabs/hrms', icon: 'finger-print-outline', accent: '#ed7a1c', tint: 'rgba(237, 122, 28, 0.14)' },
    { title: 'My Tickets', subtitle: 'Support', route: '/tabs/helpdesk', icon: 'ticket-outline', accent: '#1d9eaf', tint: 'rgba(29, 158, 175, 0.14)' },
    { title: 'Workload', subtitle: 'Academic', route: '/tabs/workload', icon: 'bar-chart-outline', accent: '#8d52c1', tint: 'rgba(141, 82, 193, 0.14)' },
    { title: 'Subjects', subtitle: 'Academic', route: '/tabs/assigned-courses', icon: 'library-outline', accent: '#4d9c58', tint: 'rgba(77, 156, 88, 0.14)' },
    { title: 'Digital Content', subtitle: 'Academic', route: '/tabs/digital-content', icon: 'play-circle-outline', accent: '#5b7ad5', tint: 'rgba(91, 122, 213, 0.14)' },
    { title: 'My Workload', subtitle: 'Academic', route: '/tabs/my-workload', icon: 'briefcase-outline', accent: '#e67a49', tint: 'rgba(230, 122, 73, 0.14)' },
    { title: 'Monthly Biometric', subtitle: 'HRMS', route: '/tabs/monthly-biometric', icon: 'stats-chart-outline', accent: '#2f84b8', tint: 'rgba(47, 132, 184, 0.14)' },
    { title: 'Mentoring Sessions', subtitle: 'Academic', route: '/tabs/mentoring-sessions', icon: 'people-circle-outline', accent: '#5b7ad5', tint: 'rgba(91, 122, 213, 0.14)' },
    { title: 'Settings', subtitle: 'General', route: '/tabs/settings', icon: 'settings-outline', accent: '#8d52c1', tint: 'rgba(141, 82, 193, 0.14)' },
    { title: 'Change Password', subtitle: 'General', route: '/tabs/change-password', icon: 'lock-closed-outline', accent: '#d05454', tint: 'rgba(208, 84, 84, 0.14)' }
  ];

  fabHidden = false;
  dismissMode = false;
  overDropZone = false;

  private readonly fabSize = 40;
  private readonly fabMargin = 12;
  private readonly LONG_PRESS_MS = 600;
  private readonly DROP_ZONE_THRESHOLD = 110;
  private pointerId: number | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragged = false;
  private fabPositionInitialized = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private authService: AuthService,
    private menuCtrl: MenuController,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUrl = this.router.url;
    this.setDefaultFabPosition();

    this.authService.user$.subscribe(u => {
      this.user = u;
      this.imgError = false;
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.currentUrl = event.urlAfterRedirects;
      });
  }

  get displayName(): string {
    const { salutation, firstName, middleName, lastName } = this.user || {};
    return [salutation, firstName, middleName, lastName].filter(Boolean).join(' ') || this.user?.name || '';
  }

  get initials(): string {
    const fn = this.user?.firstName || '';
    const ln = this.user?.lastName || '';
    return ((fn[0] || '') + (ln[0] || '')).toUpperCase() || 'U';
  }

  onImgError() {
    this.imgError = true;
  }

  get isStudentUser(): boolean {
    return this.authService.isStudent();
  }

  get filteredQuickAccessCards(): QuickAccessCard[] {
    const query = this.quickAccessSearch.trim().toLowerCase();
    if (!query) return this.quickAccessCards;

    return this.quickAccessCards.filter(card =>
      card.title.toLowerCase().includes(query) ||
      card.subtitle.toLowerCase().includes(query)
    );
  }

  get quickAccessCards(): QuickAccessCard[] {
    if (this.isStudentUser) {
      return this.studentRouteMeta;
    }

    const cards: QuickAccessCard[] = [];
    const seenRoutes = new Set<string>();
    const seenTitles = new Set<string>();

    for (const item of this.flattenMenuItems(this.user?.menus || [])) {
      const keyTitle = item.title.toLowerCase();
      if (item.route) seenRoutes.add(item.route);
      seenTitles.add(keyTitle);
      cards.push(item);
    }

    for (const meta of this.routeMeta) {
      if ((meta.route && seenRoutes.has(meta.route)) || seenTitles.has(meta.title.toLowerCase())) {
        continue;
      }
      cards.push(meta);
    }

    return cards;
  }

  close() {
    this.menuCtrl.close();
  }

  get showFloatingMenuButton(): boolean {
    return this.authService.isLoggedIn() && this.currentUrl.startsWith('/tabs');
  }

  openMenu() {
    this.menuCtrl.open();
  }

  openQuickAccess(): void {
    this.menuCtrl.close();
    this.quickAccessSearch = '';
    this.quickAccessOpen = true;
  }

  closeQuickAccess(): void {
    this.quickAccessOpen = false;
    this.quickAccessSearch = '';
  }

  openQuickAccessCard(card: QuickAccessCard): void {
    if (!card.route) return;
    this.closeQuickAccess();
    this.router.navigateByUrl(card.route);
  }

  onFabPointerDown(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    this.pointerId = event.pointerId;
    this.dragged = false;
    this.dragOffsetX = event.clientX - this.fabX;
    this.dragOffsetY = event.clientY - this.fabY;
    target.setPointerCapture(event.pointerId);

    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.dismissMode = true;
      try { navigator.vibrate?.(60); } catch { /* ignore */ }
    }, this.LONG_PRESS_MS);
  }

  onFabPointerMove(event: PointerEvent) {
    if (this.pointerId !== event.pointerId) return;

    const nextX = event.clientX - this.dragOffsetX;
    const nextY = event.clientY - this.dragOffsetY;

    const movedX = Math.abs(nextX - this.fabX);
    const movedY = Math.abs(nextY - this.fabY);

    if (movedX > 3 || movedY > 3) this.dragged = true;

    // Cancel long press if user moves significantly before it fires
    if (this.longPressTimer && (movedX > 10 || movedY > 10)) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.dismissMode) {
      this.fabX = this.clampX(nextX);
      // Allow sliding below normal bottom boundary toward drop zone
      this.fabY = Math.max(this.fabMargin, nextY);
      this.overDropZone = (this.fabY + this.fabSize) > (window.innerHeight - this.DROP_ZONE_THRESHOLD);
    } else {
      this.fabX = this.clampX(nextX);
      this.fabY = this.clampY(nextY);
    }
  }

  onFabPointerUp(event: PointerEvent) {
    if (this.pointerId !== event.pointerId) return;
    this.clearLongPressTimer();

    if (this.dismissMode) {
      if (this.overDropZone) {
        this.dismissFab();
      } else {
        this.cancelDismissMode();
      }
    }

    this.releaseFabPointer(event);
  }

  onFabPointerCancel(event: PointerEvent) {
    if (this.pointerId !== event.pointerId) return;
    this.clearLongPressTimer();
    this.cancelDismissMode();
    this.releaseFabPointer(event);
  }

  restoreFab() {
    this.fabHidden = false;
    this.setDefaultFabPosition();
  }

  onFabClick(event: Event) {
    if (this.dragged) {
      event.preventDefault();
      event.stopPropagation();
      this.dragged = false;
      return;
    }

    this.openQuickAccess();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.quickAccessOpen) {
      this.closeQuickAccess();
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (!this.fabPositionInitialized) {
      this.setDefaultFabPosition();
      return;
    }

    this.fabX = this.clampX(this.fabX);
    this.fabY = this.clampY(this.fabY);
  }

  navigate(path: string) {
    this.closeQuickAccess();
    this.menuCtrl.close();
    this.router.navigateByUrl(path);
  }

  logout() {
    this.closeQuickAccess();
    this.menuCtrl.close();
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private releaseFabPointer(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    this.pointerId = null;
  }

  private clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private cancelDismissMode() {
    this.dismissMode = false;
    this.overDropZone = false;
    this.fabX = this.clampX(this.fabX);
    this.fabY = this.clampY(this.fabY);
  }

  private dismissFab() {
    this.dismissMode = false;
    this.overDropZone = false;
    this.fabHidden = true;
  }

  private setDefaultFabPosition() {
    this.fabX = this.clampX(window.innerWidth - this.fabSize - this.fabMargin);
    this.fabY = this.clampY(window.innerHeight - this.fabSize - 62);
    this.fabPositionInitialized = true;
  }

  private clampX(value: number): number {
    return Math.min(Math.max(this.fabMargin, value), window.innerWidth - this.fabSize - this.fabMargin);
  }

  private clampY(value: number): number {
    return Math.min(Math.max(this.fabMargin, value), window.innerHeight - this.fabSize - this.fabMargin);
  }

  private flattenMenuItems(items: MenuItem[], section = ''): QuickAccessCard[] {
    const cards: QuickAccessCard[] = [];

    for (const item of items) {
      const title = item.title?.trim();
      if (!title) continue;

      const children = Array.isArray(item.children) ? item.children : [];
      const route = this.resolveMenuRoute(item);

      if (route || children.length === 0) {
        cards.push(this.buildQuickAccessCard(title, section || 'Module', route));
      }

      if (children.length) {
        cards.push(...this.flattenMenuItems(children, title));
      }
    }

    return cards;
  }

  private resolveMenuRoute(item: MenuItem): string | null {
    const directRoute = this.normalizeRoute(item.route);
    if (directRoute) return directRoute;

    const titleKey = item.title.trim().toLowerCase();
    const matchedMeta = this.routeMeta.find(meta => meta.title.toLowerCase() === titleKey);
    return matchedMeta?.route || null;
  }

  private normalizeRoute(route?: string): string | null {
    if (!route) return null;

    const normalized = route.trim().replace(/^#/, '');
    if (!normalized || normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return null;
    }

    if (normalized.startsWith('/tabs/')) return normalized;
    if (normalized === '/tabs') return '/tabs/home';
    if (normalized.startsWith('tabs/')) return `/${normalized}`;
    if (normalized.startsWith('/')) return `/tabs${normalized}`;

    const metaMatch = this.routeMeta.find(meta => meta.route === `/tabs/${normalized}`);
    return metaMatch?.route || null;
  }

  private buildQuickAccessCard(title: string, subtitle: string, route: string | null): QuickAccessCard {
    const meta = this.routeMeta.find(item => item.route === route) || this.routeMeta.find(item => item.title.toLowerCase() === title.toLowerCase());
    if (meta) {
      return {
        title,
        subtitle,
        route,
        icon: meta.icon,
        accent: meta.accent,
        tint: meta.tint
      };
    }

    const palette = [
      { accent: '#de5b4b', tint: 'rgba(222, 91, 75, 0.14)', icon: 'apps-outline' },
      { accent: '#3f7ccf', tint: 'rgba(63, 124, 207, 0.14)', icon: 'grid-outline' },
      { accent: '#8d52c1', tint: 'rgba(141, 82, 193, 0.14)', icon: 'layers-outline' },
      { accent: '#1d9eaf', tint: 'rgba(29, 158, 175, 0.14)', icon: 'briefcase-outline' },
      { accent: '#4d9c58', tint: 'rgba(77, 156, 88, 0.14)', icon: 'extension-puzzle-outline' },
      { accent: '#ed7a1c', tint: 'rgba(237, 122, 28, 0.14)', icon: 'construct-outline' }
    ];

    const index = title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
    return {
      title,
      subtitle,
      route,
      icon: palette[index].icon,
      accent: palette[index].accent,
      tint: palette[index].tint
    };
  }
}
