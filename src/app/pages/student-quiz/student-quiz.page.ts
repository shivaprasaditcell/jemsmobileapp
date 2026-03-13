import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertController, ToastController } from '@ionic/angular';
import { catchError, of, Subscription } from 'rxjs';
import { StudentPortalService } from '../../core/services/student-portal.service';
import { QuizSignalRService } from '../../core/services/quiz-signalr.service';
import { environment } from 'src/environments/environment';

interface QuizQuestion {
  qid: number;
  questiontext: string;
  questionmarks: number;
  questiontype: string;
  options: { optionlabel: string; optiontext: string }[];
  selected: string | null;
}

type QuizState = 'loading' | 'active' | 'submitted' | 'expired' | 'already_submitted' | 'error';

@Component({
  selector: 'app-student-quiz',
  templateUrl: './student-quiz.page.html',
  styleUrls: ['./student-quiz.page.scss'],
  standalone: false
})
export class StudentQuizPage implements OnInit, OnDestroy {
  sessionId = 0;
  studentId = 0;

  state: QuizState = 'loading';
  errorMsg = '';

  sessionInfo: any = null;
  questions: QuizQuestion[] = [];
  currentIndex = 0;

  timeLeftSec   = 0;
  totalDurationSec = 0;
  elapsedSec    = 0;
  private timerHandle: any = null;

  result: any = null;
  showPalette = false;

  private signalRSub?: Subscription;

  // SVG arc: circumference of r=44 circle = 2π×44 ≈ 276.46
  readonly ARC_CIRC = 276.46;

  get arcDash(): number {
    if (!this.totalDurationSec) return this.ARC_CIRC;
    return (this.timeLeftSec / this.totalDurationSec) * this.ARC_CIRC;
  }

  get arcColor(): string {
    const pct = this.totalDurationSec ? (this.timeLeftSec / this.totalDurationSec) : 1;
    if (pct <= 0.15) return '#eb445a';
    if (pct <= 0.35) return '#ed7a1c';
    return '#4d9c58';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private studentPortal: StudentPortalService,
    private quizSignalR: QuizSignalRService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.sessionId = +this.route.snapshot.paramMap.get('sessionId')!;
    this.studentPortal.resolveStudentProfileId().subscribe({
      next: id => { this.studentId = id; this.loadQuiz(); },
      error: () => { this.state = 'error'; this.errorMsg = 'Session expired. Please login again.'; }
    });
  }

  ngOnDestroy() {
    this.clearTimer();
    this.signalRSub?.unsubscribe();
    this.quizSignalR.leaveQuizSession(this.sessionId);
  }

  loadQuiz() {
    this.state = 'loading';
    this.http.get<any>(`${environment.apiUrl}quiz/${this.sessionId}/questions?studentSlnum=${this.studentId}`)
      .pipe(catchError(err => of({ __err: err })))
      .subscribe(data => {
        if (data?.__err) {
          const msg: string = data.__err?.error?.message || '';
          if (msg === 'already_submitted') { this.loadResult(); return; }
          if (msg.includes('expired') || msg.includes('no longer')) { this.state = 'expired'; return; }
          this.state = 'error'; this.errorMsg = msg || 'Failed to load quiz.';
          return;
        }
        this.sessionInfo = data;
        this.questions = (data.questions || []).map((q: any) => ({ ...q, selected: null }));
        const expiresAt = new Date(data.expiresAt).getTime();
        this.timeLeftSec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        this.totalDurationSec = (data.durationMinutes || 0) * 60 || this.timeLeftSec;
        this.elapsedSec = this.totalDurationSec - this.timeLeftSec;
        this.state = 'active';
        this.startTimer();
        this.listenForStop();
      });
  }

  private listenForStop() {
    // Connect to SignalR (may already be connected from timetable page)
    this.quizSignalR.connect().then(() => {
      this.quizSignalR.joinQuizSession(this.sessionId);
    }).catch(() => {});

    this.signalRSub = this.quizSignalR.quizStopped$.subscribe(stoppedId => {
      if (stoppedId === this.sessionId && this.state === 'active') {
        this.showToast('Test stopped by faculty. Submitting…', 'warning');
        this.submitQuiz(true);
      }
    });
  }

  private startTimer() {
    this.timerHandle = setInterval(() => {
      this.timeLeftSec--;
      this.elapsedSec++;
      if (this.timeLeftSec <= 0) { this.clearTimer(); this.submitQuiz(true); }
    }, 1000);
  }

  private clearTimer() {
    if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = null; }
  }

  get formattedTime(): string {
    return this.toMMSS(this.timeLeftSec);
  }

  get formattedElapsed(): string {
    return this.toMMSS(this.elapsedSec);
  }

  private toMMSS(sec: number): string {
    const m = Math.floor(Math.abs(sec) / 60);
    const s = Math.abs(sec) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get timeClass(): string {
    if (this.timeLeftSec <= 60) return 'danger';
    if (this.timeLeftSec <= 300) return 'warning';
    return 'light';
  }

  get answeredCount(): number { return this.questions.filter(q => q.selected !== null).length; }
  get currentQ(): QuizQuestion { return this.questions[this.currentIndex]; }

  select(option: string) {
    if (this.state !== 'active') return;
    const q = this.questions[this.currentIndex];
    q.selected = q.selected === option ? null : option;
  }

  navigate(delta: number) {
    const next = this.currentIndex + delta;
    if (next >= 0 && next < this.questions.length) { this.currentIndex = next; this.showPalette = false; }
  }

  jumpTo(i: number) { this.currentIndex = i; this.showPalette = false; }

  async confirmSubmit() {
    const unanswered = this.questions.length - this.answeredCount;
    const alert = await this.alertCtrl.create({
      header: 'Submit Quiz',
      message: unanswered > 0
        ? `You have ${unanswered} unanswered question(s). Submit anyway?`
        : `Submit your quiz? You answered all ${this.questions.length} questions.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Submit', handler: () => this.submitQuiz() }
      ]
    });
    await alert.present();
  }

  submitQuiz(autoSubmit = false) {
    this.clearTimer();
    const answers = this.questions.map(q => ({ questionId: q.qid, selectedOption: q.selected }));
    this.http.post<any>(`${environment.apiUrl}quiz/${this.sessionId}/submit`, { studentSlnum: this.studentId, answers })
      .pipe(catchError(err => of({ __err: err })))
      .subscribe(res => {
        if (res?.__err) {
          const msg = res.__err?.error?.message || '';
          if (msg.includes('already')) { this.loadResult(); return; }
          this.showToast('Submission failed: ' + (msg || 'Unknown error'), 'danger');
          return;
        }
        this.result = res;
        this.state = 'submitted';
        if (autoSubmit) this.showToast('Time up! Quiz auto-submitted.', 'warning');
      });
  }

  loadResult() {
    this.http.get<any>(`${environment.apiUrl}quiz/${this.sessionId}/result/${this.studentId}`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) { this.result = res; this.state = 'submitted'; }
        else { this.state = 'already_submitted'; }
      });
  }

  stripHtml(html: string): string {
    if (!html) return '';
    return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
  }

  resultColor(pct: number): string {
    if (pct >= 75) return '#4d9c58';
    if (pct >= 50) return '#ed7a1c';
    return '#eb445a';
  }

  goBack() { this.router.navigate(['/tabs/student-timetable']); }

  private async showToast(msg: string, color = 'dark') {
    const t = await this.toastCtrl.create({ message: msg, duration: 3000, color, position: 'top' });
    await t.present();
  }
}
