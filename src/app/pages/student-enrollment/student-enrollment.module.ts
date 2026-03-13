import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { StudentEnrollmentPage } from './student-enrollment.page';

const routes: Routes = [{ path: '', component: StudentEnrollmentPage }];

@NgModule({
  imports: [CommonModule, HttpClientModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [StudentEnrollmentPage]
})
export class StudentEnrollmentPageModule {}