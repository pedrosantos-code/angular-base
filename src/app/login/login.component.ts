import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  onLogin(email: string, password: string): void {
    this.errorMessage.set(null);

    if (!email || !password) {
      this.errorMessage.set('Preencha e-mail e senha.');
      return;
    }

    this.isLoading.set(true);

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        if (response.error) {
          console.error('Login error from Supabase:', response.error.message);
          this.errorMessage.set('Usuário não encontrado ou senha incorreta.');
          return;
        }

        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Login failed:', error);
        this.errorMessage.set('Ocorreu um erro ao tentar fazer login.');
      },
    });
  }
}