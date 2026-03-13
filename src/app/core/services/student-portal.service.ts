import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, switchMap, throwError, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CurrentUser } from '../../models/user.model';
import { StudentAttendanceSummary, StudentBasicProfile, StudentFeeItem } from '../../models/student.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class StudentPortalService {
  private readonly PROFILE_ID_KEY = 'studentProfileId';
  private readonly REQUEST_TIMEOUT_MS = 8000;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private storage: StorageService
  ) {}

  resolveStudentProfileId(forceRefresh = false): Observable<number> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Student') {
      return throwError(() => new Error('Student session not found.'));
    }

    const cachedId = forceRefresh ? 0 : Number(this.storage.get(this.PROFILE_ID_KEY) || '0');
    const candidateIds = this.buildCandidateIds(user, cachedId);

    if (!candidateIds.length) {
      return throwError(() => new Error('Student identifier not available.'));
    }

    return this.tryProfileCandidate(candidateIds, 0);
  }

  getResolvedBasicProfile(forceRefresh = false): Observable<StudentBasicProfile | null> {
    return this.resolveStudentProfileId(forceRefresh).pipe(
      switchMap(studentId => this.getBasicProfile(studentId))
    );
  }

  getResolvedAttendance(forceRefresh = false): Observable<StudentAttendanceSummary> {
    return this.resolveStudentProfileId(forceRefresh).pipe(
      switchMap(studentId => this.getAttendance(studentId))
    );
  }

  getResolvedFees(forceRefresh = false): Observable<StudentFeeItem[]> {
    return this.resolveStudentProfileId(forceRefresh).pipe(
      switchMap(studentId => this.getFees(studentId))
    );
  }

  loadDashboard(forceRefresh = false): Observable<{
    profile: StudentBasicProfile | null;
    attendance: StudentAttendanceSummary;
    fees: StudentFeeItem[];
  }> {
    return this.resolveStudentProfileId(forceRefresh).pipe(
      switchMap(studentId => forkJoin({
        profile: this.getBasicProfile(studentId).pipe(catchError(() => of(null))),
        attendance: this.getAttendance(studentId).pipe(
          catchError(() => of({ totalClasses: 0, presentClasses: 0, absentClasses: 0, attendancePct: 0 }))
        ),
        fees: this.getFees(studentId).pipe(catchError(() => of([])))
      }))
    );
  }

  getBasicProfile(studentId: number): Observable<StudentBasicProfile | null> {
    return this.http.get<StudentBasicProfile>(
      `${environment.apiUrl}studentadmission/getstudentbasicprofile/${studentId}`
    ).pipe(timeout(this.REQUEST_TIMEOUT_MS));
  }

  getAttendance(studentId: number): Observable<StudentAttendanceSummary> {
    return this.http.get<StudentAttendanceSummary>(
      `${environment.apiUrl}studentadmission/getstudentattendance/${studentId}`
    ).pipe(timeout(this.REQUEST_TIMEOUT_MS));
  }

  getFees(studentId: number): Observable<StudentFeeItem[]> {
    return this.http.get<StudentFeeItem[]>(
      `${environment.apiUrl}studentadmission/getstudentfee/${studentId}`
    ).pipe(timeout(this.REQUEST_TIMEOUT_MS));
  }

  private tryProfileCandidate(candidateIds: number[], index: number): Observable<number> {
    if (index >= candidateIds.length) {
      return throwError(() => new Error('Unable to resolve a valid student profile ID.'));
    }

    const candidate = candidateIds[index];
    return this.getBasicProfile(candidate).pipe(
      map(profile => {
        const resolvedId = profile?.studentId || candidate;
        this.storage.set(this.PROFILE_ID_KEY, String(resolvedId));
        return resolvedId;
      }),
      catchError(() => this.tryProfileCandidate(candidateIds, index + 1))
    );
  }

  private buildCandidateIds(user: CurrentUser, cachedId: number): number[] {
    const raw = [
      cachedId,
      user.userId
    ];

    return Array.from(new Set(raw.map(value => Number(value)).filter(value => value > 0)));
  }
}