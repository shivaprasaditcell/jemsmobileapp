import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class QuizSignalRService implements OnDestroy {

  private hub!: signalR.HubConnection;

  /** Emits when faculty starts a quiz for a subject the student is enrolled in */
  readonly quizStarted$ = new Subject<{
    sessionId: number;
    subjectSlnum: number;
    timetableSlotId: number | null;
    durationMinutes: number;
    expiresAt: string;
    questionCount: number;
  }>();

  /** Emits the stopped sessionId — for both timetable and active-quiz pages */
  readonly quizStopped$ = new Subject<number>();

  async connect(): Promise<void> {
    if (this.hub && this.hub.state !== signalR.HubConnectionState.Disconnected) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/hubs/quiz`)
      .withAutomaticReconnect()
      .build();

    this.hub.on('QuizStarted', (data: any) => this.quizStarted$.next(data));
    this.hub.on('QuizStopped', (sessionId: number) => this.quizStopped$.next(sessionId));

    await this.hub.start();
  }

  /** Call after connect() – student timetable page joins subject groups */
  joinSubjectGroups(subjectSlnums: number[]): Promise<void> {
    if (this.isConnected)
      return this.hub.invoke('JoinSubjectGroups', subjectSlnums);
    return Promise.resolve();
  }

  /** Call when student opens quiz page */
  joinQuizSession(sessionId: number): Promise<void> {
    if (this.isConnected)
      return this.hub.invoke('JoinQuizSession', sessionId);
    return Promise.resolve();
  }

  /** Call when student submits / leaves quiz page */
  leaveQuizSession(sessionId: number): Promise<void> {
    if (this.isConnected)
      return this.hub.invoke('LeaveQuizSession', sessionId);
    return Promise.resolve();
  }

  disconnect(): void {
    this.hub?.stop();
  }

  private get isConnected(): boolean {
    return this.hub?.state === signalR.HubConnectionState.Connected;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
