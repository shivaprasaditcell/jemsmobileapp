import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { ContactsPage } from './contacts.page';

const routes: Routes = [{ path: '', component: ContactsPage }];

@NgModule({
  imports: [CommonModule, FormsModule, HttpClientModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [ContactsPage]
})
export class ContactsPageModule {}
