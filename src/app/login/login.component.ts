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
  errorMessage = signal<string | null>(null);
  private authService = inject(AuthService);
  private router = inject(Router);

  onLogin(email: string, password: string) {
    this.errorMessage.set(null); // Limpa o erro ao tentar de novo
    this.authService.login(email, password).subscribe({
      next: (response) => {
        if (response.error) {
          console.error('Login error from Supabase:', response.error.message);
          this.errorMessage.set('Usuário não encontrado ou senha incorreta.');
        } else {
          console.log('Login successful:', response);
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.errorMessage.set('Ocorreu um erro ao tentar fazer login.');
      }
    });
  }
}
