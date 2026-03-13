import { Component, OnInit } from '@angular/core';
import { StudentPortalService } from '../../core/services/student-portal.service';
import { StudentFeeItem } from '../../models/student.model';

@Component({
  selector: 'app-student-fees',
  templateUrl: './student-fees.page.html',
  styleUrls: ['./student-fees.page.scss'],
  standalone: false
})
export class StudentFeesPage implements OnInit {
  fees: StudentFeeItem[] = [];
  loading = true;
  error = '';

  constructor(private studentPortal: StudentPortalService) {}

  ngOnInit() {
    this.load();
  }

  load(event?: any, forceRefresh = false) {
    this.loading = true;
    this.error = '';

    this.studentPortal.getResolvedFees(forceRefresh).subscribe({
      next: fees => {
        this.fees = fees || [];
        this.loading = false;
        event?.target?.complete();
      },
      error: err => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Unable to load fee details.';
        event?.target?.complete();
      }
    });
  }

  handleRefresh(event: any) {
    this.load(event, true);
  }

  objectKeys(item: StudentFeeItem): string[] {
    return Object.keys(item || {});
  }
}