import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { StudentPortalService } from '../../core/services/student-portal.service';
import { environment } from 'src/environments/environment';

interface SubjectMarks {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  quizzes: QuizMark[];
}

interface QuizMark {
  index: number;       // 1-based test number (sorted by date)
  quizTitle: string;
  startedAt: string;
  questionType: string;
  marksObtained: number | null;
  totalMarks: number;
  percentage: number | null;
}

@Component({
  selector: 'app-student-marks',
  templateUrl: './student-marks.page.html',
  styleUrls: ['./student-marks.page.scss'],
  standalone: false
})
export class StudentMarksPage implements OnInit {
  sessions: any[] = [];
  selectedSessionId: number | null = null;

  subjects: SubjectMarks[] = [];
  loading = false;
  sessionsLoading = true;
  error = '';

  // tracks which test rows are expanded: key = "subjectIndex-quizIndex"
  expandedRows = new Set<string>();

  toggleRow(si: number, qi: number) {
    const key = `${si}-${qi}`;
    if (this.expandedRows.has(key)) this.expandedRows.delete(key);
    else this.expandedRows.add(key);
  }

  isExpanded(si: number, qi: number): boolean {
    return this.expandedRows.has(`${si}-${qi}`);
  }

  private studentId = 0;

  constructor(
    private http: HttpClient,
    private studentPortal: StudentPortalService
  ) {}

  ngOnInit() {
    this.studentPortal.resolveStudentProfileId().subscribe({
      next: id => {
        this.studentId = id;
        this.loadSessions();
      },
      error: () => {
        this.error = 'Session expired. Please login again.';
        this.sessionsLoading = false;
      }
    });
  }

  private loadSessions() {
    this.sessionsLoading = true;
    this.http.get<any[]>(`${environment.apiUrl}univesitymaster/getsessions`)
      .pipe(catchError(() => of([])))
      .subscribe(sessions => {
        this.sessions = sessions || [];
        const current = this.sessions.find(s => s.iscurrentsession || s.Iscurrentsession);
        this.selectedSessionId =
          current?.sessionslnum || current?.Sessionslnum ||
          this.sessions[this.sessions.length - 1]?.sessionslnum ||
          this.sessions[this.sessions.length - 1]?.Sessionslnum || null;
        this.sessionsLoading = false;
        if (this.selectedSessionId) {
          this.loadMarks();
        }
      });
  }

  onSessionChange() {
    this.subjects = [];
    this.error = '';
    if (this.selectedSessionId) {
      this.loadMarks();
    }
  }

  loadMarks(event?: any, forceRefresh = false) {
    if (!this.studentId || !this.selectedSessionId) return;
    this.loading = true;
    this.error = '';

    this.http.get<any[]>(
      `${environment.apiUrl}Quiz/student/${this.studentId}/marks?sessionId=${this.selectedSessionId}`
    ).pipe(catchError(() => of(null))).subscribe(data => {
      if (data === null) {
        this.error = 'Unable to load marks. Please try again.';
        this.subjects = [];
      } else {
        this.subjects = this.parseMarks(data);
      }
      this.loading = false;
      event?.target?.complete();
    });
  }

  handleRefresh(event: any) {
    this.loadMarks(event, true);
  }

  private parseMarks(data: any[]): SubjectMarks[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => {
      const sorted = [...(item.quizzes || [])].sort(
        (a: any, b: any) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      );
      return {
        subjectId: item.subjectId || 0,
        subjectName: item.subjectName || 'Unknown Subject',
        subjectCode: item.subjectCode || '',
        quizzes: sorted.map((q: any, i: number) => ({
          index: i + 1,
          quizTitle: q.quizTitle || 'Test',
          startedAt: q.startedAt || '',
          questionType: q.questionType || 'mcq',
          marksObtained: q.marksObtained ?? null,
          totalMarks: q.totalMarks ?? 0,
          percentage: q.percentage ?? this.calcPct(q.marksObtained, q.totalMarks)
        }))
      };
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  private calcPct(obtained: number | null | undefined, total: number): number | null {
    if (obtained == null || !total) return null;
    return Math.round((obtained / total) * 100);
  }

  sessionLabel(s: any): string {
    return s?.sessionname || s?.Sessionname || s?.sessionName || `Session ${s?.sessionslnum || s?.Sessionslnum}`;
  }

  marksColor(pct: number | null): string {
    if (pct === null) return '#8a9bae';
    if (pct >= 75) return '#4d9c58';
    if (pct >= 50) return '#ed7a1c';
    return '#eb445a';
  }

  subjectInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
  }

  totalObtained(subject: SubjectMarks): number {
    return subject.quizzes.reduce((sum, q) => sum + (q.marksObtained ?? 0), 0);
  }

  totalMax(subject: SubjectMarks): number {
    return subject.quizzes.reduce((sum, q) => sum + q.totalMarks, 0);
  }

  overallPct(subject: SubjectMarks): number | null {
    const max = this.totalMax(subject);
    if (!max) return null;
    return this.calcPct(this.totalObtained(subject), max);
  }

  subjectAccentColor(index: number): string {
    const colors = ['#125875', '#3f7ccf', '#F26622', '#7c3aed', '#10b981', '#f59e0b', '#0ea5e9', '#8d52c1'];
    return colors[index % colors.length];
  }
}
