import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { Session } from '../../models/workload.model';
import { environment } from 'src/environments/environment';

export interface ContentNode {
  nodeId: number;
  nodeTitle: string;
  nodeDescription: string;
  nodeTypeId: number; // 1=Unit 2=Chapter 3=Topic
  nodeTypeName: string;
  displayOrder: number;
  parentNodeId?: number;
  attachments: any[];
  children: ContentNode[];
}

interface ContentTreeResponse {
  facultyId: number;
  subjectId: number;
  sessionId: number;
  nodes: ContentNode[];
  totalNodes: number;
}

@Component({
  selector: 'app-digital-content',
  templateUrl: './digital-content.page.html',
  styleUrls: ['./digital-content.page.scss'],
  standalone: false
})
export class DigitalContentPage implements OnInit {
  subjectName = '';
  subjectCode = '';
  subjectId = 0;
  sessionName = '';

  units: ContentNode[] = [];
  loading = true;
  error = false;

  expandedUnits = new Set<number>();
  expandedChapters = new Set<number>();

  private facultyId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      this.subjectId   = +p['subjectId']   || 0;
      this.subjectName = p['subjectName']  || 'Digital Content';
      this.subjectCode = p['subjectCode']  || '';
    });

    this.authService.user$.pipe(filter(u => !!u), take(1)).subscribe(u => {
      this.facultyId = u!.userId;
      this.loadSessionThenTree();
    });
  }

  toggleUnit(unitId: number) {
    this.expandedUnits.has(unitId)
      ? this.expandedUnits.delete(unitId)
      : this.expandedUnits.add(unitId);
  }

  toggleChapter(chapterId: number) {
    this.expandedChapters.has(chapterId)
      ? this.expandedChapters.delete(chapterId)
      : this.expandedChapters.add(chapterId);
  }

  isUnitExpanded(unitId: number)    { return this.expandedUnits.has(unitId); }
  isChapterExpanded(id: number) { return this.expandedChapters.has(id); }

  back() { this.router.navigateByUrl('/tabs/assigned-courses'); }

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  hasContent(html: string): boolean {
    if (!html) return false;
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim().length > 0;
  }

  private loadSessionThenTree() {
    this.loading = true;
    this.error   = false;

    this.http.get<Session[]>(`${environment.apiUrl}univesitymaster/getsessions`)
      .subscribe({
        next: sessions => {
          const current = sessions?.find((s: any) => s.iscurrentsession || s.isCurrent) ?? sessions?.[0];
          if (!current) { this.error = true; this.loading = false; return; }
          this.sessionName = current.sessionName || '';
          this.loadTree(current.sessionslnum);
        },
        error: () => { this.error = true; this.loading = false; }
      });
  }

  private loadTree(sessionId: number) {
    this.http.get<ContentTreeResponse>(
      `${environment.apiUrl}Content/tree/${this.facultyId}/${this.subjectId}/${sessionId}`
    ).subscribe({
      next: res => {
        this.units = res?.nodes || [];
        // auto-expand first unit
        if (this.units.length) this.expandedUnits.add(this.units[0].nodeId);
        this.loading = false;
      },
      error: () => { this.error = true; this.loading = false; }
    });
  }
}
