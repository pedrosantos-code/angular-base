import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  protected readonly title = signal('meu-projeto');
  private authService = inject(AuthService);
  private router = inject(Router);

  onLogin(email: string, password: string) {
    this.authService.login(email, password).subscribe({
      next: (response) => {
        if (response.error) {
          console.error('Login error from Supabase:', response.error.message);
        } else {
          console.log('Login successful:', response);
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        console.error('Login failed:', error);
      }
    });
  }
}
