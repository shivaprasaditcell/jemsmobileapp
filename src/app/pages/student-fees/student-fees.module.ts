import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { StudentFeesPage } from './student-fees.page';

const routes: Routes = [{ path: '', component: StudentFeesPage }];

@NgModule({
  imports: [CommonModule, HttpClientModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [StudentFeesPage]
})
export class StudentFeesPageModule {}