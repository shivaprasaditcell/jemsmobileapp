import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { MyTicket, MyTicketsResponse, TicketConversation, TicketDetail, TicketDetailResponse } from '../../models/helpdesk.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-my-tickets',
  templateUrl: './my-tickets.page.html',
  styleUrls: ['./my-tickets.page.scss'],
  standalone: false
})
export class MyTicketsPage implements OnInit {
  loading = true;
  tickets: MyTicket[] = [];
  activeFilter: string = 'ALL';
  selectedTicket: MyTicket | null = null;
  ticketDetail: TicketDetail | null = null;
  convoLoading = false;
  convoError = false;

  readonly filters = ['ALL', 'OPEN', 'IN PROGRESS', 'REOPEN', 'RESOLVED', 'CLOSED'];

  private userId = 0;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.authService.user$.pipe(filter(u => !!u), take(1)).subscribe(u => {
      this.userId = u!.userId;
      this.load();
    });
  }

  load(event?: any) {
    this.loading = true;
    this.http.post<MyTicketsResponse>(
      `${environment.apiUrl}HelpDesk/mytickets`,
      { userId: this.userId }
    ).subscribe({
      next:  res  => { this.tickets = res?.data || []; this.loading = false; event?.target?.complete(); },
      error: ()   => { this.loading = false; event?.target?.complete(); }
    });
  }

  handleRefresh(event: any) { this.load(event); }

  get filtered(): MyTicket[] {
    if (this.activeFilter === 'ALL') return this.tickets;
    return this.tickets.filter(t => t.status === this.activeFilter);
  }

  countFor(f: string): number {
    if (f === 'ALL') return this.tickets.length;
    return this.tickets.filter(t => t.status === f).length;
  }

  statusClass(status: string): string {
    switch (status) {
      case 'OPEN':        return 'status-open';
      case 'IN PROGRESS': return 'status-progress';
      case 'REOPEN':      return 'status-reopen';
      case 'RESOLVED':    return 'status-resolved';
      case 'CLOSED':      return 'status-closed';
      default:            return 'status-open';
    }
  }

  priorityClass(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'HIGH':   return 'pri-high';
      case 'MEDIUM': return 'pri-medium';
      case 'LOW':    return 'pri-low';
      default:       return 'pri-low';
    }
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30)  return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  openDetail(t: MyTicket) {
    this.selectedTicket = t;
    this.ticketDetail   = null;
    this.convoError     = false;
    this.convoLoading   = true;
    this.http.get<TicketDetailResponse>(
      `${environment.apiUrl}HelpDesk/ticket/${t.ticketId}`
    ).subscribe({
      next:  res => { this.ticketDetail = res?.data || null; this.convoLoading = false; },
      error: ()  => { this.convoLoading = false; this.convoError = true; }
    });
  }

  closeDetail() { this.selectedTicket = null; this.ticketDetail = null; this.convoError = false; }

  formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  get conversations(): TicketConversation[] {
    return this.ticketDetail?.conversations || [];
  }

  senderInitials(name: string): string {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
  }

  isSelf(c: TicketConversation): boolean {
    return c.user?.userId === this.userId;
  }
}
