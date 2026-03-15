import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { catchError, of } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceSectionResponse, AttendanceEntry } from '../../models/attendance.model';
import { ContentTree, ContentNode } from '../../models/content-tree.model';
import { environment } from 'src/environments/environment';

interface MappedQuestion {
  qid: number;
  questiontext: string;
  questionmarks: number;
  questiontype: string;
  answer?: string;
  difficultyname?: string;
  bloomname?: string;
  options?: { optionid: number; optionlabel: string; optiontext: string }[];
}

interface ActiveTestSession {
  sessionId: number;
  expiresAt: string;
  questionCount: number;
}

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: false
})
export class AttendancePage implements OnInit, OnDestroy {
  loading = true;
  saving = false;
  activeTab: 'attendance' | 'details' = 'attendance';

  courseName = '';
  vsectionName = '';
  vsectionId = 0;

  private sessionId = 0;
  private subjectSlnum = 0;
  private slotId = 0;
  private facultyId = 0;

  students: AttendanceEntry[] = [];

  // A-Z filter
  filterLetter: string | null = null;
  showFilterPopup = false;
  readonly alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Topic selector
  showTopicPopup = false;
  units: ContentNode[] = [];
  selectedUnit: ContentNode | null = null;
  selectedChapter: ContentNode | null = null;
  selectedTopic: ContentNode | null = null;

  // Mapped questions
  mappedQuestions: MappedQuestion[] = [];
  questionsLoading = false;

  // ── Quiz / Test ─────────────────────────────────────────────────────────────
  showQuizPanel   = false;
  quizDuration    = 15;
  startingQuiz    = false;
  stoppingQuiz    = false;
  activeTest: ActiveTestSession | null = null;
  questionType: 'mcq' | 'descriptive' = 'mcq';
  selectedQids    = new Set<number>();

  // PDF upload tracking per question (qid → state)
  pdfUploadState  = new Map<number, 'idle' | 'uploading' | 'done' | 'error'>();
  pdfUploadedPath = new Map<number, string>();
  quizStudentSlnum = 0;   // student taking this descriptive exam on this device

  // Countdown display for active test
  timeLeftLabel   = '';
  private countdownHandle: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.user$.pipe(filter(u => !!u), take(1)).subscribe(u => {
      this.facultyId = u!.userId;
    });

    this.route.queryParams.subscribe(p => {
      this.sessionId    = +p['sessionId']    || 0;
      this.subjectSlnum = +p['subjectSlnum'] || 0;
      this.slotId       = +p['slotId']       || 0;
      this.courseName   = p['courseName']    || 'Attendance';
      this.loadStudents();
      this.loadContentTree();
      this.checkActiveTest();
    });
  }

  ngOnDestroy() {
    this.clearCountdown();
  }

  // ── Students ───────────────────────────────────────────────────────────────

  private loadStudents() {
    this.loading = true;
    this.http.get<AttendanceSectionResponse>(
      `${environment.apiUrl}VirtualSection/students-for-attendance`,
      { params: {
        sessionId:    this.sessionId.toString(),
        subjectSlnum: this.subjectSlnum.toString(),
        slotId:       this.slotId.toString()
      }}
    ).subscribe({
      next: res => {
        this.vsectionName = res.vsectionName || '';
        this.vsectionId   = res.vsectionId   || 0;
        this.students = (res.students || []).map(s => ({
          studentregistrationslnum: s.studentregistrationslnum,
          studentbasicsslnum: s.studentbasicsslnum,
          name: s.studentbasiccompletename,
          usn: s.studentbasicusnnumber,
          registerNum: s.studentregisternum,
          isPresent: true
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggle(student: AttendanceEntry) { student.isPresent = !student.isPresent; }
  markAll(present: boolean) { this.students.forEach(s => s.isPresent = present); }

  // ── A-Z filter ─────────────────────────────────────────────────────────────

  get filteredStudents(): AttendanceEntry[] {
    if (!this.filterLetter) return this.students;
    return this.students.filter(s => s.name.trim().toUpperCase().startsWith(this.filterLetter!));
  }

  hasLetter(letter: string): boolean {
    return this.students.some(s => s.name.trim().toUpperCase().startsWith(letter));
  }

  selectLetter(letter: string) {
    this.filterLetter = this.filterLetter === letter ? null : letter;
    this.showFilterPopup = false;
  }

  clearFilter() { this.filterLetter = null; this.showFilterPopup = false; }

  // ── Stats ──────────────────────────────────────────────────────────────────

  get totalCount():   number { return this.students.length; }
  get presentCount(): number { return this.students.filter(s => s.isPresent).length; }
  get absentCount():  number { return this.students.filter(s => !s.isPresent).length; }

  // ── Content tree ───────────────────────────────────────────────────────────

  private loadContentTree() {
    if (!this.subjectSlnum || !this.sessionId) return;
    this.authService.user$.pipe(filter(u => !!u), take(1)).subscribe(u => {
      this.http.get<ContentTree>(
        `${environment.apiUrl}Content/tree/${u!.userId}/${this.subjectSlnum}/${this.sessionId}`
      ).subscribe({
        next: tree => { this.units = tree?.nodes || []; },
        error: () => {}
      });
    });
  }

  get chapters(): ContentNode[] { return this.selectedUnit?.children || []; }
  get topics():   ContentNode[] { return this.selectedChapter?.children || []; }

  onUnitChange(unitId: number) {
    this.selectedUnit    = this.units.find(u => u.nodeId === +unitId) || null;
    this.selectedChapter = null;
    this.selectedTopic   = null;
  }

  onChapterChange(chapterId: number) {
    this.selectedChapter = this.chapters.find(c => c.nodeId === +chapterId) || null;
    this.selectedTopic   = null;
  }

  onTopicChange(topicId: number) {
    this.selectedTopic = this.topics.find(t => t.nodeId === +topicId) || null;
    this.loadMappedQuestions();
  }

  private loadMappedQuestions() {
    this.mappedQuestions = [];
    if (!this.selectedTopic) return;
    this.questionsLoading = true;
    this.http.get<MappedQuestion[]>(
      `${environment.apiUrl}QuestionBank/topic/${this.selectedTopic.nodeId}`
    ).pipe(catchError(() => of([]))).subscribe(data => {
      this.mappedQuestions = Array.isArray(data) ? data : [];
      this.questionsLoading = false;
    });
  }

  get mcqQuestions(): MappedQuestion[] {
    return this.mappedQuestions.filter(q => q.questiontype?.toLowerCase() === 'mcq');
  }

  get descriptiveQuestions(): MappedQuestion[] {
    return this.mappedQuestions.filter(q => q.questiontype?.toLowerCase() !== 'mcq');
  }

  get topicLabel(): string { return this.selectedTopic?.nodeTitle || ''; }

  hasDescription(node: ContentNode | null): boolean {
    if (!node?.nodeDescription) return false;
    return node.nodeDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim().length > 0;
  }

  fileSizeLabel(bytes: number | undefined): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ── Quiz / Test ─────────────────────────────────────────────────────────────

  /** Check if there is already an active quiz for this timetable slot */
  private checkActiveTest() {
    if (!this.slotId) return;
    this.http.get<any>(`${environment.apiUrl}quiz/slot/${this.slotId}/active`)
      .pipe(catchError(() => of(null)))
      .subscribe(session => {
        if (session?.sessionId) {
          this.activeTest = session;
          this.startCountdown();
        }
      });
  }

  get canStartQuiz(): boolean {
    return !!this.selectedTopic && this.selectedQids.size > 0 && this.quizDuration >= 1;
  }

  adjustDuration(delta: number) {
    this.quizDuration = Math.max(1, Math.min(180, this.quizDuration + delta));
  }

  openQuizPanel() {
    if (!this.selectedTopic) {
      this.showTopicPopup = true;
      return;
    }
    this.questionType = 'mcq';
    this.selectedQids = new Set(this.mcqQuestions.map(q => q.qid));
    this.showQuizPanel = true;
  }

  getPdfState(qid: number): 'idle' | 'uploading' | 'done' | 'error' {
    return this.pdfUploadState.get(qid) ?? 'idle';
  }

  async uploadQuizPdf(qid: number, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!this.activeTest || !this.quizStudentSlnum) {
      this.showToast('Enter student ID before uploading.', 'warning');
      input.value = '';
      return;
    }
    this.pdfUploadState.set(qid, 'uploading');
    const form = new FormData();
    form.append('file', file);
    form.append('studentSlnum', String(this.quizStudentSlnum));
    form.append('questionId', String(qid));
    this.http.post<any>(`${environment.apiUrl}quiz/${this.activeTest.sessionId}/answer-pdf`, form)
      .pipe(catchError(err => of({ __err: err })))
      .subscribe(res => {
        input.value = '';
        if (res?.__err) {
          this.pdfUploadState.set(qid, 'error');
          this.showToast('Upload failed. Try again.', 'danger');
          return;
        }
        this.pdfUploadState.set(qid, 'done');
        this.pdfUploadedPath.set(qid, res.filePath);
        this.showToast('PDF uploaded successfully.', 'success');
      });
  }

  onQuizTypeChange(type: 'mcq' | 'descriptive'): void {
    this.questionType = type;
    const src = type === 'mcq' ? this.mcqQuestions : this.descriptiveQuestions;
    this.selectedQids = new Set(src.map(q => q.qid));
  }

  toggleQid(qid: number): void {
    if (this.selectedQids.has(qid)) this.selectedQids.delete(qid);
    else this.selectedQids.add(qid);
  }

  isQidSelected(qid: number): boolean { return this.selectedQids.has(qid); }

  selectAllQuizQs(): void {
    const src = this.questionType === 'mcq' ? this.mcqQuestions : this.descriptiveQuestions;
    this.selectedQids = new Set(src.map(q => q.qid));
  }

  clearQuizQs(): void { this.selectedQids = new Set(); }

  async startTest() {
    if (!this.canStartQuiz) return;
    this.startingQuiz = true;
    const questionIds = Array.from(this.selectedQids);
    const payload = {
      subjectSlnum:    this.subjectSlnum,
      facultyId:       this.facultyId,
      contentNodeId:   this.selectedTopic!.nodeId,
      durationMinutes: this.quizDuration,
      questionIds,
      timetableSlotId: this.slotId,
      questionType:    this.questionType
    };
    this.http.post<any>(`${environment.apiUrl}quiz/start`, payload)
      .pipe(catchError(err => of({ __err: err })))
      .subscribe(async res => {
        this.startingQuiz = false;
        if (res?.__err) {
          this.showToast(res.__err?.error?.message || 'Failed to start test.', 'danger');
          return;
        }
        this.activeTest = {
          sessionId:     res.sessionId,
          expiresAt:     res.expiresAt,
          questionCount: questionIds.length
        };
        this.showQuizPanel = false;
        this.startCountdown();
        this.showToast(`Test started! ${this.quizDuration} min, ${questionIds.length} questions.`, 'success');
      });
  }

  async stopTest() {
    if (!this.activeTest) return;
    this.stoppingQuiz = true;
    this.http.post<any>(`${environment.apiUrl}quiz/${this.activeTest.sessionId}/stop`, {})
      .pipe(catchError(err => of({ __err: err })))
      .subscribe(async res => {
        this.stoppingQuiz = false;
        if (res?.__err) {
          this.showToast(res.__err?.error?.message || 'Failed to stop test.', 'danger');
          return;
        }
        this.clearCountdown();
        this.activeTest = null;
        this.showToast('Test stopped.', 'warning');
      });
  }

  private startCountdown() {
    this.clearCountdown();
    this.updateTimeLabel();
    this.countdownHandle = setInterval(() => this.updateTimeLabel(), 1000);
  }

  private clearCountdown() {
    if (this.countdownHandle) { clearInterval(this.countdownHandle); this.countdownHandle = null; }
  }

  private updateTimeLabel() {
    if (!this.activeTest?.expiresAt) { this.timeLeftLabel = ''; return; }
    const sec = Math.max(0, Math.floor((new Date(this.activeTest.expiresAt).getTime() - Date.now()) / 1000));
    if (sec === 0) { this.clearCountdown(); this.activeTest = null; this.timeLeftLabel = ''; return; }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    this.timeLeftLabel = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get timeLeftUrgent(): boolean {
    if (!this.activeTest?.expiresAt) return false;
    return Math.max(0, Math.floor((new Date(this.activeTest.expiresAt).getTime() - Date.now()) / 1000)) <= 60;
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  initials(name: string): string {
    const parts = name.trim().split(' ');
    const f = parts[0]?.[0] || '';
    const l = parts[parts.length - 1]?.[0] || '';
    return (f + (parts.length > 1 ? l : '')).toUpperCase();
  }

  backToTimetable() { this.router.navigate(['/tabs/timetable']); }

  async saveAttendance() {
    if (!this.selectedTopic) return;
    this.saving = true;
    const payload = {
      sessionId:   this.sessionId,
      slotId:      this.slotId,
      vsectionId:  this.vsectionId,
      topicNodeId: this.selectedTopic.nodeId,
      attendance:  this.students.map(s => ({
        studentRegistrationSlnum: s.studentregistrationslnum,
        isPresent: s.isPresent
      }))
    };
    console.log('Save payload:', payload);
    const toast = await this.toastCtrl.create({
      message: `Attendance saved — ${this.presentCount} present, ${this.absentCount} absent`,
      duration: 2500, color: 'success', position: 'bottom'
    });
    await toast.present();
    this.saving = false;
  }

  private async showToast(msg: string, color = 'dark') {
    const t = await this.toastCtrl.create({ message: msg, duration: 3000, color, position: 'top' });
    await t.present();
  }
}
