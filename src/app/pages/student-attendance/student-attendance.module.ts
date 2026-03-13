import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { StudentAttendancePage } from './student-attendance.page';

const routes: Routes = [{ path: '', component: StudentAttendancePage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [StudentAttendancePage]
})
export class StudentAttendancePageModule {}
