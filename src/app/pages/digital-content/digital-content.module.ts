import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { DigitalContentPage } from './digital-content.page';

const routes: Routes = [{ path: '', component: DigitalContentPage }];

@NgModule({
  imports: [CommonModule, IonicModule, HttpClientModule, RouterModule.forChild(routes)],
  declarations: [DigitalContentPage]
})
export class DigitalContentPageModule {}
