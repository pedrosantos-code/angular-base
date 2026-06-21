import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-cadastro',
  imports: [RouterLink],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.css',
})
export class CadastroComponent {
  protected readonly title = signal('meu-projeto');
  private authService = inject(AuthService);
  private router = inject(Router);

  onRegister(email: string, password: string) {
    this.authService.register(email, password).subscribe({
      next: (response) => {
        if (response.error) {
          console.error('Registration error from Supabase:', response.error.message);
        } else {
          console.log('Registration successful:', response);
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        console.error('Registration failed:', error);
      }
    });
  }
}
