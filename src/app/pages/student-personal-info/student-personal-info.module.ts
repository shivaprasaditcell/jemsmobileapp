import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { StudentPersonalInfoPage } from './student-personal-info.page';

const routes: Routes = [{ path: '', component: StudentPersonalInfoPage }];

@NgModule({
  imports: [CommonModule, HttpClientModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [StudentPersonalInfoPage]
})
export class StudentPersonalInfoPageModule {}