import { Component, OnInit } from '@angular/core';
import { StudentPortalService } from '../../core/services/student-portal.service';
import { StudentBasicProfile } from '../../models/student.model';

@Component({
  selector: 'app-student-documents',
  templateUrl: './student-documents.page.html',
  styleUrls: ['./student-documents.page.scss'],
  standalone: false
})
export class StudentDocumentsPage implements OnInit {
  profile: StudentBasicProfile | null = null;
  loading = true;
  error = '';

  constructor(private studentPortal: StudentPortalService) {}

  ngOnInit() {
    this.load();
  }

  load(event?: any, forceRefresh = false) {
    this.loading = true;
    this.error = '';

    this.studentPortal.getResolvedBasicProfile(forceRefresh).subscribe({
      next: profile => {
        this.profile = profile;
        this.loading = false;
        event?.target?.complete();
      },
      error: err => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Unable to load document details.';
        event?.target?.complete();
      }
    });
  }

  handleRefresh(event: any) {
    this.load(event, true);
  }
}