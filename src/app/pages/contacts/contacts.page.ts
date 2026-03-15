import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DeptStaff } from '../../models/dept-staff.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss'],
  standalone: false
})
export class ContactsPage implements OnInit {
  allStaff: DeptStaff[] = [];
  loading = true;

  // Filters
  selectedDept = '';
  searchText = '';

  // Search overlay
  searchOpen = false;

  // Detail popup
  selected: DeptStaff | null = null;
  selectedImgError = false;

  get isStudentUser(): boolean {
    return this.authService.isStudent();
  }

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.load();
  }

  private load(event?: any) {
    this.loading = true;

    if (this.authService.isStudent()) {
      const studentId = this.authService.getStudentId();
      this.http.get<any>(
        `${environment.apiUrl}studentauth/staffdirectory/${studentId}`
      ).subscribe({
        next: res => {
          const raw: any[] = res?.deptStaff || [];
          this.allStaff = raw.map(s => ({
            userId: s.userId || 0,
            salutationName: s.salutation || '',
            userFName: s.fName || '',
            userMname: s.mName || '',
            userLName: s.lName || '',
            userMobileNumber: s.phone || '',
            userEmailOfficial: s.email || '',
            userProfilepic: s.profilePic || '',
            departmentName: s.departmentName || '',
            departmentId: s.departmentId || 0,
            designationName: s.designationName || '',
            useremployeecode: s.useremployeecode || '',
            staffTypeName: s.staffTypeName || '',
            staffTypeId: s.staffTypeId
          } as DeptStaff));
          this.loading = false;
          event?.target?.complete();
        },
        error: () => { this.loading = false; event?.target?.complete(); }
      });
    } else {
      this.http.post<DeptStaff[]>(
        `${environment.apiUrl}DashboardDep/GetUserMasterForDept`,
        { departmentId: [-1], designationId: -1, EmptypeID: -1, StaffTypeId: -1 }
      ).subscribe({
        next: res => { this.allStaff = res || []; this.loading = false; event?.target?.complete(); },
        error: () => { this.loading = false; event?.target?.complete(); }
      });
    }
  }

  handleRefresh(event: any) { this.load(event); }

  get departments(): string[] {
    const seen = new Set<string>();
    return this.allStaff
      .map(s => s.departmentName)
      .filter(d => d && !seen.has(d) && !!seen.add(d))
      .sort();
  }

  get searchResults(): DeptStaff[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return [];
    return this.allStaff.filter(s => {
      const name = `${s.salutationName} ${s.userFName} ${s.userMname} ${s.userLName}`.toLowerCase();
      return (
        name.includes(q) ||
        s.designationName?.toLowerCase().includes(q) ||
        s.useremployeecode?.toLowerCase().includes(q)
      );
    }).slice(0, 20);
  }

  get filtered(): DeptStaff[] {
    const q = this.searchText.trim().toLowerCase();
    return this.allStaff.filter(s => {
      if (this.selectedDept && s.departmentName !== this.selectedDept) return false;
      if (q) {
        const name = `${s.salutationName} ${s.userFName} ${s.userMname} ${s.userLName}`.toLowerCase();
        const matched =
          name.includes(q) ||
          s.designationName?.toLowerCase().includes(q) ||
          s.useremployeecode?.toLowerCase().includes(q) ||
          s.staffTypeName?.toLowerCase().includes(q) ||
          s.usercategoryName?.toLowerCase().includes(q);
        if (!matched) return false;
      }
      return true;
    });
  }

  fullName(s: DeptStaff): string {
    return [s.salutationName, s.userFName, s.userMname, s.userLName].filter(v => v?.trim()).join(' ');
  }

  initials(s: DeptStaff): string {
    return ((s.userFName?.[0] || '') + (s.userLName?.[0] || s.userMname?.[0] || '')).toUpperCase() || '?';
  }

  openSearch() { this.searchOpen = true; this.searchText = ''; }
  closeSearch() { this.searchOpen = false; this.searchText = ''; }

  openDetail(s: DeptStaff) {
    this.searchOpen = false;
    this.searchText = '';
    // Let search overlay unmount before showing detail sheet
    setTimeout(() => {
      this.selected = s;
      this.selectedImgError = false;
    }, 50);
  }
  closeDetail() { this.selected = null; }
}
