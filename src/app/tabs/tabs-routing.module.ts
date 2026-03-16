import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('../pages/home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'timetable',
        loadChildren: () => import('../pages/timetable/timetable.module').then(m => m.TimetablePageModule)
      },
      {
        path: 'attendance',
        loadChildren: () => import('../pages/attendance/attendance.module').then(m => m.AttendancePageModule)
      },
      {
        path: 'events',
        loadChildren: () => import('../pages/events/events.module').then(m => m.EventsPageModule)
      },
      {
        path: 'contacts',
        loadChildren: () => import('../pages/contacts/contacts.module').then(m => m.ContactsPageModule)
      },
      {
        path: 'hrms',
        loadChildren: () => import('../pages/hrms/hrms.module').then(m => m.HrmsPageModule)
      },
      {
        path: 'monthly-biometric',
        loadChildren: () => import('../pages/monthly-biometric/monthly-biometric.module').then(m => m.MonthlyBiometricPageModule)
      },
      {
        path: 'helpdesk',
        loadChildren: () => import('../pages/helpdesk/helpdesk.module').then(m => m.HelpdeskPageModule)
      },
      {
        path: 'my-tickets',
        loadChildren: () => import('../pages/my-tickets/my-tickets.module').then(m => m.MyTicketsPageModule)
      },
      {
        path: 'workload',
        loadChildren: () => import('../pages/workload/workload.module').then(m => m.WorkloadPageModule)
      },
      {
        path: 'assigned-courses',
        loadChildren: () => import('../pages/assigned-courses/assigned-courses.module').then(m => m.AssignedCoursesPageModule)
      },
      {
        path: 'my-workload',
        loadChildren: () => import('../pages/my-workload/my-workload.module').then(m => m.MyWorkloadPageModule)
      },
      {
        path: 'change-password',
        loadChildren: () => import('../pages/change-password/change-password.module').then(m => m.ChangePasswordPageModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('../pages/settings/settings.module').then(m => m.SettingsPageModule)
      },
      {
        path: 'mentoring-sessions',
        loadChildren: () => import('../pages/mentoring-sessions/mentoring-sessions.module').then(m => m.MentoringSessionsPageModule)
      },
      {
        path: 'digital-content',
        loadChildren: () => import('../pages/digital-content/digital-content.module').then(m => m.DigitalContentPageModule)
      },
      {
        path: 'student-personal-info',
        loadChildren: () => import('../pages/student-personal-info/student-personal-info.module').then(m => m.StudentPersonalInfoPageModule)
      },
      {
        path: 'student-enrollment',
        loadChildren: () => import('../pages/student-enrollment/student-enrollment.module').then(m => m.StudentEnrollmentPageModule)
      },
      {
        path: 'student-fees',
        loadChildren: () => import('../pages/student-fees/student-fees.module').then(m => m.StudentFeesPageModule)
      },
      {
        path: 'student-documents',
        loadChildren: () => import('../pages/student-documents/student-documents.module').then(m => m.StudentDocumentsPageModule)
      },
      {
        path: 'student-attendance',
        loadChildren: () => import('../pages/student-attendance/student-attendance.module').then(m => m.StudentAttendancePageModule)
      },
      {
        path: 'student-timetable',
        loadChildren: () => import('../pages/student-timetable/student-timetable.module').then(m => m.StudentTimetablePageModule)
      },
      {
        path: 'student-quiz/:sessionId',
        loadChildren: () => import('../pages/student-quiz/student-quiz.module').then(m => m.StudentQuizPageModule)
      },
      {
        path: 'student-marks',
        loadChildren: () => import('../pages/student-marks/student-marks.module').then(m => m.StudentMarksPageModule)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsRoutingModule {}
