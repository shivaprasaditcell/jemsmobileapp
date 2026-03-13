import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { StudentQuizPage } from './student-quiz.page';

const routes: Routes = [{ path: '', component: StudentQuizPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [StudentQuizPage]
})
export class StudentQuizPageModule {}
