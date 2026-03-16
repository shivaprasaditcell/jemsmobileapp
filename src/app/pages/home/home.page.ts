import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { StudentPortalService } from '../../core/services/student-portal.service';
import { CurrentUser } from '../../models/user.model';
import { BirthdayUser } from '../../models/birthday.model';
import { BiometricRecord, DayLog } from '../../models/biometric.model';
import { LatestJoiner } from '../../models/joiner.model';
import { MyTicket, MyTicketsResponse } from '../../models/helpdesk.model';
import { StudentBasicProfile, StudentAttendanceSummary, StudentFeeItem } from '../../models/student.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  user: CurrentUser | null = null;

  // Biometric
  biometric: BiometricRecord | null = null;
  bioLoading = true;
  bioImgError = false;
  runningTime = '';
  private timerInterval: any;

  // Latest Joiners
  latestJoiners: LatestJoiner[] = [];
  selectedJoiner: LatestJoiner | null = null;
  joinerImgError = false;

  // Birthdays
  todayBirthdays: BirthdayUser[] = [];
  tomorrowBirthdays: BirthdayUser[] = [];
  selectedUser: BirthdayUser | null = null;
  selectedImgError = false;

  // Helpdesk
  hdTickets: MyTicket[] = [];
  hdLoading = true;

  // Student dashboard
  studentProfile: StudentBasicProfile | null = null;
  studentAttendance: StudentAttendanceSummary | null = null;
  studentFees: StudentFeeItem[] = [];
  studentDashboardLoading = true;
  studentDashboardError = '';

  readonly studentMenuItems = [
    { label: 'Timetable',        icon: 'calendar-outline', route: '/tabs/student-timetable', accent: '#3f7ccf' },
    { label: 'Personal Details', icon: 'person-outline', route: '/tabs/student-personal-info', accent: '#125875' },
    { label: 'Academic',         icon: 'school-outline', route: '/tabs/student-enrollment', accent: '#3f7ccf' },
    { label: 'Attendance',       icon: 'checkmark-circle-outline', route: '/tabs/student-attendance', accent: '#4d9c58' },
    { label: 'Fee',              icon: 'card-outline', route: '/tabs/student-fees', accent: '#ed7a1c' },
    { label: 'Documents',        icon: 'document-text-outline', route: '/tabs/student-documents', accent: '#6a70ca' },
    { label: 'Mentor',           icon: 'people-circle-outline', route: '/tabs/mentoring-sessions', accent: '#8d52c1' },
    { label: 'Contacts',         icon: 'business-outline', route: '/tabs/contacts', accent: '#1d9eaf' },
    { label: 'Marks Card',       icon: 'ribbon-outline', route: '/tabs/student-marks', accent: '#e05c5c' },
    { label: 'Events',           icon: 'megaphone-outline', route: '/tabs/events', accent: '#1e9db5' }
  ];

  constructor(
    private authService: AuthService,
    private studentPortalService: StudentPortalService,
    private http: HttpClient,
    public router: Router
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(u => (this.user = u));

    this.authService.user$.pipe(
      filter(u => !!u),
      take(1)
    ).subscribe(u => {
      if (this.authService.isStudent()) {
        this.loadStudentDashboard();
      } else {
        this.loadBiometric(u!.userId);
        this.loadTickets(u!.userId);
        this.loadBirthdays();
        this.loadLatestJoiners();
      }
    });
  }

  get isStudent(): boolean {
    return this.authService.isStudent();
  }

  get attendancePctSafe(): number {
    return this.studentAttendance?.attendancePct ?? 0;
  }

  get attendanceColor(): string {
    const pct = this.attendancePctSafe;
    if (pct >= 75) return '#4d9c58';
    if (pct >= 60) return '#ed7a1c';
    return '#d05454';
  }

  loadStudentDashboard(event?: any, forceRefresh = false) {
    this.studentDashboardLoading = true;
    this.studentDashboardError = '';
    this.studentPortalService.loadDashboard(forceRefresh).subscribe({
      next: data => {
        this.studentProfile = data.profile;
        this.studentAttendance = data.attendance;
        this.studentFees = data.fees;
        this.studentDashboardLoading = false;
        event?.target?.complete();
      },
      error: err => {
        this.studentDashboardError = err?.message || 'Unable to load dashboard.';
        this.studentDashboardLoading = false;
        event?.target?.complete();
      }
    });
  }

  // ── Biometric ──────────────────────────────────────────────────────────────

  private loadBiometric(userId: number) {
    this.bioLoading = true;
    this.http.post<BiometricRecord[]>(
      `${environment.apiUrl}biometriclog/getweeklyattendancerecords`,
      { UserId: userId, selectedDate: new Date().toISOString() }
    ).subscribe({
      next: res => {
        this.biometric = res?.[0] || null;
        this.bioLoading = false;
        this.startTimer();
      },
      error: () => { this.bioLoading = false; }
    });
  }

  get todayLog(): DayLog | null {
    if (!this.biometric?.logs?.length) return null;
    const today = new Date().toDateString();
    return this.biometric.logs.find(l => new Date(l.date).toDateString() === today) || null;
  }

  get todayDateLabel(): string {
    return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // First "In" punch time, e.g. "10:13 AM"
  firstIn(day: DayLog): string {
    const entry = day.logs.find(l => l.status === 'In');
    if (!entry) return '—';
    return new Date(entry.logdatetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  // Last "Out" punch time
  lastOut(day: DayLog): string {
    const outs = day.logs.filter(l => l.status === 'Out');
    if (!outs.length) return '—';
    return new Date(outs[outs.length - 1].logdatetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  isStillIn(day: DayLog): boolean {
    return day.logs.some(l => l.status === 'In') && !day.logs.some(l => l.status === 'Out');
  }

  private startTimer() {
    this.updateRunningTime();
    this.timerInterval = setInterval(() => this.updateRunningTime(), 1000);
  }

  private updateRunningTime() {
    const day = this.todayLog;
    if (!day?.logs?.length) { this.runningTime = ''; return; }
    const firstInLog = day.logs.find(l => l.status === 'In');
    if (!firstInLog) { this.runningTime = ''; return; }
    const outs = day.logs.filter(l => l.status === 'Out');
    const end = outs.length ? new Date(outs[outs.length - 1].logdatetime).getTime() : Date.now();
    const elapsed = end - new Date(firstInLog.logdatetime).getTime();
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    this.runningTime = `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // ── Latest Joiners ─────────────────────────────────────────────────────────

  private loadLatestJoiners() {
    this.http.get<LatestJoiner[]>(`${environment.apiUrl}UserMaster/getthelatest`)
      .subscribe({ next: res => (this.latestJoiners = res || []), error: () => {} });
  }

  joinerName(j: LatestJoiner): string {
    return [j.firstName, j.middleName, j.lastName].filter(s => s?.trim()).join(' ').trim();
  }

  joinerInitials(j: LatestJoiner): string {
    const f = j.firstName?.trim()[0] || '';
    const l = j.lastName?.trim()[0] || j.firstName?.trim().split(' ')?.[1]?.[0] || '';
    return (f + l).toUpperCase() || '?';
  }

  joiningDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Birthdays ──────────────────────────────────────────────────────────────

  private loadBirthdays() {
    this.http.get<{ status: string; data: BirthdayUser[] }>(
      `${environment.apiUrl}UserMaster/getuserbirthdaylist`
    ).subscribe({
      next: res => {
        const list = res?.data || [];
        this.todayBirthdays    = list.filter(b => this.matchesDay(b.userDoB, 0));
        this.tomorrowBirthdays = list.filter(b => this.matchesDay(b.userDoB, 1));
      },
      error: () => {}
    });
  }

  private matchesDay(dob: string, offset: number): boolean {
    const ref = new Date();
    ref.setDate(ref.getDate() + offset);
    const d = new Date(dob);
    return d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
  }

  fullName(b: BirthdayUser): string {
    return [b.salutaion, b.userFName, b.userMname, b.userLName].filter(Boolean).join(' ');
  }

  initials(b: BirthdayUser): string {
    return ((b.userFName?.[0] || '') + (b.userLName?.[0] || b.userMname?.[0] || '')).toUpperCase() || '?';
  }

  openPopup(b: BirthdayUser) { this.selectedUser = b; this.selectedImgError = false; }
  closePopup() { this.selectedUser = null; }

  openJoinerPopup(j: LatestJoiner) { this.selectedJoiner = j; this.joinerImgError = false; }
  closeJoinerPopup() { this.selectedJoiner = null; }

  // ── Helpdesk ───────────────────────────────────────────────────────────────

  private loadTickets(userId: number) {
    this.hdLoading = true;
    this.http.post<MyTicketsResponse>(
      `${environment.apiUrl}HelpDesk/mytickets`,
      { userId }
    ).subscribe({
      next:  res  => { this.hdTickets = res?.data || []; this.hdLoading = false; },
      error: ()   => { this.hdLoading = false; }
    });
  }

  get openCount():     number { return this.hdTickets.filter(t => t.status === 'OPEN').length; }
  get progressCount(): number { return this.hdTickets.filter(t => t.status === 'IN PROGRESS').length; }
  get reopenCount():   number { return this.hdTickets.filter(t => t.status === 'REOPEN').length; }

  hdStatusClass(status: string): string {
    switch (status) {
      case 'OPEN':        return 'hd-open';
      case 'IN PROGRESS': return 'hd-progress';
      case 'REOPEN':      return 'hd-reopen';
      case 'RESOLVED':    return 'hd-resolved';
      case 'CLOSED':      return 'hd-closed';
      default:            return 'hd-open';
    }
  }

  goToTickets() {
    this.router.navigateByUrl('/tabs/helpdesk');
  }

  handleRefresh(event: any) {
    if (this.authService.isStudent()) {
      this.loadStudentDashboard(event, true);
      return;
    }
    const uid = this.user?.userId;
    if (uid) { this.loadBiometric(uid); this.loadTickets(uid); }
    this.loadLatestJoiners();
    this.loadBirthdays();
    setTimeout(() => event.target.complete(), 3000);
  }
}
