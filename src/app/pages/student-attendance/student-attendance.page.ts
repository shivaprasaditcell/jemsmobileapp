import { Component, OnInit } from '@angular/core';
import { StudentPortalService } from '../../core/services/student-portal.service';
import { StudentAttendanceSummary } from '../../models/student.model';

@Component({
  selector: 'app-student-attendance',
  templateUrl: './student-attendance.page.html',
  styleUrls: ['./student-attendance.page.scss'],
  standalone: false
})
export class StudentAttendancePage implements OnInit {
  attendance: StudentAttendanceSummary | null = null;
  loading = true;
  error = '';

  constructor(private studentPortal: StudentPortalService) {}

  ngOnInit() {
    this.load();
  }

  load(event?: any, forceRefresh = false) {
    this.loading = true;
    this.error = '';
    this.studentPortal.getResolvedAttendance(forceRefresh).subscribe({
      next: data => {
        this.attendance = data;
        this.loading = false;
        event?.target?.complete();
      },
      error: err => {
        this.error = err?.error?.message || err?.message || 'Unable to load attendance.';
        this.loading = false;
        event?.target?.complete();
      }
    });
  }

  handleRefresh(event: any) {
    this.load(event, true);
  }

  get pct(): number {
    return this.attendance?.attendancePct ?? 0;
  }

  get pctColor(): string {
    if (this.pct >= 75) return '#4d9c58';
    if (this.pct >= 60) return '#ed7a1c';
    return '#eb445a';
  }

  get strokeDashoffset(): number {
    const circumference = 2 * Math.PI * 52; // r=52
    return circumference - (circumference * this.pct / 100);
  }
}
