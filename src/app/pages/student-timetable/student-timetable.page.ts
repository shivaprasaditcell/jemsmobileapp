import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { StudentPortalService } from '../../core/services/student-portal.service';
import { QuizSignalRService } from '../../core/services/quiz-signalr.service';
import { environment } from 'src/environments/environment';

export type AttendanceStatus = 'present' | 'absent' | 'not_marked' | 'not_conducted' | 'upcoming';

interface TimetableSlot {
  timetableSlotId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  expectedDate: string | null;
  subjectSlnum: number | null;
  subjectName: string;
  subjectCode: string;
  roomNumber: string;
  activityType: string;
  facultyName: string;
  scheduleId: number | null;
  scheduledDate: string | null;
  attendanceStatus: AttendanceStatus;
  attendanceRemarks: string | null;
  topicTitle: string | null;
  isTopicCompleted: boolean;
}

interface WeekInfo {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
}

interface SubjectAttendance {
  subjectName: string;
  subjectCode: string;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  attendancePercentage: number;
  status: 'Good' | 'Low' | 'Critical';
  facultyName: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-student-timetable',
  templateUrl: './student-timetable.page.html',
  styleUrls: ['./student-timetable.page.scss'],
  standalone: false
})
export class StudentTimetablePage implements OnInit, OnDestroy {
  activeTab: 'timetable' | 'attendance' = 'timetable';

  loading = false;
  error = '';

  sessions: any[] = [];
  selectedSessionId: number | null = null;

  weeks: WeekInfo[] = [];
  selectedWeek: number | null = null;

  slotsByDay: { day: number; dayName: string; slots: TimetableSlot[] }[] = [];

  subjects: SubjectAttendance[] = [];
  attendanceSummary: any = null;

  // Active quiz map: subjectSlnum → quiz session info
  activeQuizMap = new Map<number, any>();

  private studentId = 0;
  private signalRSubs: Subscription[] = [];
  private pollHandle: any = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private studentPortal: StudentPortalService,
    private quizSignalR: QuizSignalRService,
    private router: Router
  ) {}

  ngOnInit() {
    this.studentPortal.resolveStudentProfileId().subscribe({
      next: id => {
        this.studentId = id;
        this.loadSessions();
        this.connectSignalR();
      },
      error: () => {
        this.error = 'Session expired. Please login again.';
      }
    });
  }

  ngOnDestroy() {
    this.signalRSubs.forEach(s => s.unsubscribe());
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.quizSignalR.disconnect();
  }

  private connectSignalR() {
    // Groups are joined in loadTimetable() after slots are available.
    // Here we only wire up the event listeners.

    this.signalRSubs.push(
      this.quizSignalR.quizStarted$.subscribe(quiz => {
        this.activeQuizMap.set(quiz.subjectSlnum, quiz);
      }),
      this.quizSignalR.quizStopped$.subscribe(sessionId => {
        // Remove the Take-Test button for whichever subject this session belongs to
        this.activeQuizMap.forEach((v, k) => {
          if (v.sessionId === sessionId) this.activeQuizMap.delete(k);
        });
      })
    );
  }

  private collectSubjectSlnums(): number[] {
    const set = new Set<number>();
    for (const dg of this.slotsByDay)
      for (const s of dg.slots)
        if (s.subjectSlnum) set.add(s.subjectSlnum);
    return Array.from(set);
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  private loadSessions() {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiUrl}univesitymaster/getsessions`)
      .pipe(catchError(() => of([])))
      .subscribe(sessions => {
        this.sessions = sessions || [];
        if (this.sessions.length) {
          const current = this.sessions.find(s => s.iscurrentsession || s.Iscurrentsession);
          this.selectedSessionId =
            current?.sessionslnum || current?.Sessionslnum ||
            this.sessions[this.sessions.length - 1]?.sessionslnum ||
            this.sessions[this.sessions.length - 1]?.Sessionslnum || null;
          this.loadWeeks();
        } else {
          this.loading = false;
        }
      });
  }

  onSessionChange() {
    this.slotsByDay = [];
    this.subjects = [];
    this.attendanceSummary = null;
    this.weeks = [];
    this.selectedWeek = null;
    this.loadWeeks();
  }

  sessionLabel(s: any): string {
    return s?.sessionname || s?.Sessionname || s?.sessionName || `Session ${s?.sessionslnum || s?.Sessionslnum}`;
  }

  // ── Weeks ──────────────────────────────────────────────────────────────────

  private loadWeeks() {
    if (!this.selectedSessionId) return;
    this.http.get<any[]>(`${environment.apiUrl}timetable/session/${this.selectedSessionId}/weeks`)
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        if (data?.length) {
          this.weeks = data.map(w => ({
            weekNumber: w.weekNumber,
            weekStartDate: w.weekStartDate,
            weekEndDate: w.weekEndDate
          }));
        } else {
          this.weeks = Array.from({ length: 20 }, (_, i) => ({
            weekNumber: i + 1,
            weekStartDate: '',
            weekEndDate: ''
          }));
        }
        this.selectedWeek = this.detectCurrentWeek();
        this.loadTimetable();
        this.loadAttendanceSummary();
      });
  }

  private detectCurrentWeek(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const w of this.weeks) {
      if (!w.weekStartDate || !w.weekEndDate) continue;
      const start = new Date(w.weekStartDate);
      const end = new Date(w.weekEndDate);
      end.setHours(23, 59, 59, 999);
      if (today >= start && today <= end) return w.weekNumber;
    }
    return this.weeks[0]?.weekNumber ?? 1;
  }

  onWeekChange(week: number) {
    this.selectedWeek = week;
    this.slotsByDay = [];
    this.loadTimetable();
  }

  get currentWeekInfo(): WeekInfo | undefined {
    return this.weeks.find(w => w.weekNumber === this.selectedWeek);
  }

  // ── Timetable ──────────────────────────────────────────────────────────────

  private loadTimetable() {
    if (!this.selectedSessionId || !this.studentId) return;
    this.loading = true;
    let url = `${environment.apiUrl}timetable/student/${this.studentId}?sessionId=${this.selectedSessionId}`;
    if (this.selectedWeek != null) url += `&weekNumber=${this.selectedWeek}`;

    this.http.get<any>(url).pipe(catchError(() => of(null))).subscribe(data => {
      this.slotsByDay = this.groupByDay(data?.slots || []);
      this.loading = false;
      this.checkActiveQuizzes();
      // Connect SignalR then join — ensures connection is ready before invoking
      this.quizSignalR.connect()
        .then(() => this.quizSignalR.joinSubjectGroups(this.collectSubjectSlnums()))
        .catch(() => {});
      // Poll every 20s as fallback in case SignalR push is missed
      if (!this.pollHandle) {
        this.pollHandle = setInterval(() => this.checkActiveQuizzes(), 20000);
      }
    });
  }

  private checkActiveQuizzes() {
    const slnums = new Set<number>();
    for (const dg of this.slotsByDay)
      for (const s of dg.slots)
        if (s.subjectSlnum) slnums.add(s.subjectSlnum);

    if (!slnums.size) return;
    this.http.post<any[]>(`${environment.apiUrl}quiz/student/active-for-subjects`, Array.from(slnums))
      .pipe(catchError(() => of([])))
      .subscribe(sessions => {
        this.activeQuizMap.clear();
        // Key by subjectSlnum — reliable even when timetableSlotId is absent
        for (const s of (sessions || [])) this.activeQuizMap.set(s.subjectSlnum, s);
      });
  }

  /** Returns the quiz only when this specific slot matches the one faculty started from */
  activeQuizFor(slot: { subjectSlnum: number | null; timetableSlotId: number }): any {
    if (!slot.subjectSlnum) return null;
    const quiz = this.activeQuizMap.get(slot.subjectSlnum);
    if (!quiz) return null;
    // If the quiz is pinned to a specific slot, only show it on that exact slot
    if (quiz.timetableSlotId && quiz.timetableSlotId !== slot.timetableSlotId) return null;
    return quiz;
  }

  takeTest(sessionId: number) {
    this.router.navigate(['/tabs/student-quiz', sessionId]);
  }

  private groupByDay(slots: TimetableSlot[]) {
    const map = new Map<number, TimetableSlot[]>();
    for (const slot of slots) {
      const d = slot.dayOfWeek ?? 0;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(slot);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, slots]) => ({ day, dayName: DAY_NAMES[day] ?? `Day ${day}`, slots }));
  }

  // ── Attendance summary ─────────────────────────────────────────────────────

  private loadAttendanceSummary() {
    if (!this.selectedSessionId || !this.studentId) return;
    this.http.get<any>(
      `${environment.apiUrl}timetable/student/${this.studentId}/attendance-summary?sessionId=${this.selectedSessionId}`
    ).pipe(catchError(() => of(null))).subscribe(data => {
      this.attendanceSummary = data;
      this.subjects = (data?.subjects || []).map((s: any) => ({
        subjectName: s.subjectName || 'Unknown',
        subjectCode: s.subjectCode || '',
        totalClasses: s.totalClasses || 0,
        presentClasses: s.presentClasses || 0,
        absentClasses: s.absentClasses || 0,
        attendancePercentage: s.attendancePercentage || 0,
        status: s.status || 'Critical',
        facultyName: s.facultyName || ''
      }));
    });
  }

  onTabChange(tab: 'timetable' | 'attendance') {
    this.activeTab = tab;
  }

  handleRefresh(event: any) {
    this.slotsByDay = [];
    this.subjects = [];
    this.attendanceSummary = null;
    this.loadTimetable();
    this.loadAttendanceSummary();
    setTimeout(() => event.target.complete(), 2000);
  }

  // ── Slot helpers ───────────────────────────────────────────────────────────

  statusLabel(status: AttendanceStatus): string {
    const map: Record<AttendanceStatus, string> = {
      present: 'Present', absent: 'Absent',
      not_marked: 'Not Marked', not_conducted: 'Not Conducted', upcoming: 'Upcoming'
    };
    return map[status] ?? status;
  }

  statusIcon(status: AttendanceStatus): string {
    const map: Record<AttendanceStatus, string> = {
      present: 'checkmark-circle', absent: 'close-circle',
      not_marked: 'help-circle', not_conducted: 'ban', upcoming: 'time'
    };
    return map[status] ?? 'ellipse';
  }

  // ── Overall KPIs ───────────────────────────────────────────────────────────

  get overallPct(): number  { return this.attendanceSummary?.overallAttendancePercentage ?? 0; }
  get overallTotal(): number { return this.attendanceSummary?.overallTotal ?? 0; }
  get overallPresent(): number { return this.attendanceSummary?.overallPresent ?? 0; }
  get overallAbsent(): number { return this.attendanceSummary?.overallAbsent ?? 0; }

  get overallPctColor(): string {
    if (this.overallPct >= 75) return '#4d9c58';
    if (this.overallPct >= 65) return '#ed7a1c';
    return '#eb445a';
  }

  subjectStatusColor(status: string): string {
    if (status === 'Good') return '#4d9c58';
    if (status === 'Low') return '#ed7a1c';
    return '#eb445a';
  }
}
