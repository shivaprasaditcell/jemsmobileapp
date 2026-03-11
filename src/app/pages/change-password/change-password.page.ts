import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  standalone: false
})
export class ChangePasswordPage {
  form: FormGroup;
  isSubmitting = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {
    this.form = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', Validators.required],
        confirmPassword: ['', Validators.required]
      },
      { validators: [this.passwordsMatchValidator, this.newPasswordDiffersValidator] }
    );
  }

  get currentPassword(): AbstractControl | null {
    return this.form.get('currentPassword');
  }

  get newPassword(): AbstractControl | null {
    return this.form.get('newPassword');
  }

  get confirmPassword(): AbstractControl | null {
    return this.form.get('confirmPassword');
  }

  changePassword(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const currentPassword = this.currentPassword?.value || '';
    const newPassword = this.newPassword?.value || '';

    this.isSubmitting = true;
    this.authService.changePassword(currentPassword, newPassword)
      .pipe(finalize(() => { this.isSubmitting = false; }))
      .subscribe({
        next: async (res) => {
          this.form.reset();
          const toast = await this.toastCtrl.create({
            message: res?.message || 'Password updated successfully.',
            duration: 2500,
            color: 'success',
            position: 'top'
          });
          await toast.present();
        },
        error: async (err) => {
          const toast = await this.toastCtrl.create({
            message: err?.error?.message || err?.message || 'Unable to update password. Please try again.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!confirmPassword) return null;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private newPasswordDiffersValidator(control: AbstractControl): ValidationErrors | null {
    const currentPassword = control.get('currentPassword')?.value;
    const newPassword = control.get('newPassword')?.value;
    if (!currentPassword || !newPassword) return null;
    return currentPassword !== newPassword ? null : { sameAsCurrent: true };
  }
}
