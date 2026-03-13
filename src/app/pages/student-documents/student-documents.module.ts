import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { StudentDocumentsPage } from './student-documents.page';

const routes: Routes = [{ path: '', component: StudentDocumentsPage }];

@NgModule({
  imports: [CommonModule, HttpClientModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [StudentDocumentsPage]
})
export class StudentDocumentsPageModule {}