import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { FacultySubject } from '../../models/workload.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-assigned-courses',
  templateUrl: './assigned-courses.page.html',
  styleUrls: ['./assigned-courses.page.scss'],
  standalone: false
})
export class AssignedCoursesPage implements OnInit {
  courses: FacultySubject[] = [];
  loading = true;

  private facultyId = 0;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.user$.pipe(filter(u => !!u), take(1)).subscribe(u => {
      this.facultyId = u!.userId;
      this.load();
    });
  }

  load(event?: any) {
    this.loading = true;
    this.http.get<FacultySubject[]>(
      `${environment.apiUrl}FacultyWorkload/GetFacultySubjects/${this.facultyId}`
    ).subscribe({
      next: res => { this.courses = res || []; this.loading = false; event?.target?.complete(); },
      error: ()  => { this.loading = false; event?.target?.complete(); }
    });
  }

  handleRefresh(event: any) { this.load(event); }

  openContent(course: FacultySubject) {
    this.router.navigate(['/tabs/digital-content'], {
      queryParams: {
        subjectId:   course.subjectslnum,
        subjectName: course.courseName,
        subjectCode: course.courseCode
      }
    });
  }

  activityColor(index: number): string {
    const colors = ['#125875', '#0ea5e9', '#F26622', '#7c3aed', '#10b981', '#f59e0b'];
    return colors[index % colors.length];
  }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
  }
}
