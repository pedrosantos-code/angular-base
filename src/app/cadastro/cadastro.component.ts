import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../auth.service';

export interface CadastroPayload {
  nome: string;
  email: string;
  senha: string;
  idade: number;
  genero: string;
}

export function camposIguais(campo: string, confirmacao: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(campo)?.value;
    const b = group.get(confirmacao)?.value;
    if (!b) return null;
    return a === b ? null : { divergente: true };
  };
}

@Component({
  selector: 'seia-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.css',
})
export class CadastroComponent {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  aviso = signal<string | null>(null);
  enviando = false;
  mostrarSenha = false;

  readonly fluxo = [
    { uso: 'família, viagem, estrada', modelo: 'Territory' },
    { uso: 'cidade, economia', modelo: 'Maverick Hybrid' },
    { uso: 'trilha, aventura', modelo: 'Bronco Sport' },
    { uso: 'trabalho, carga', modelo: 'Ranger' },
    { uso: 'performance', modelo: 'Mustang GT' },
    { uso: 'cidade, elétrico', modelo: 'Mustang Mach-E' },
    { uso: 'trabalho, viagem', modelo: 'Transit Minibus' },
  ];

  readonly fluxoDuplicado = [...this.fluxo, ...this.fluxo];

  readonly amostra = {
    modelo: 'Territory',
    perfil: 'perfil: família, estrada',
    nota: '73% compatível',
  };

  registerForm: FormGroup = this.fb.group(
    {
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      idade: ['', [Validators.required, Validators.min(13), Validators.max(120)]],
      genero: ['', Validators.required],
      senha: ['', [Validators.required, Validators.minLength(8)]],
      confirmacao: ['', Validators.required],
      termos: [false, Validators.requiredTrue],
    },
    { validators: camposIguais('senha', 'confirmacao') },
  );

  campo(nome: string): AbstractControl {
    return this.registerForm.get(nome)!;
  }

  invalido(nome: string): boolean {
    const c = this.campo(nome);
    return c.invalid && (c.touched || c.dirty);
  }

  get senhasDivergentes(): boolean {
    return this.registerForm.hasError('divergente') && !!this.campo('confirmacao').touched;
  }

  toggleMostrarSenha() {
    this.mostrarSenha = !this.mostrarSenha;
  }

  onRegister(..._args: unknown[]): void {
    this.errorMessage.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.enviando = true;
    const { nome, email, senha, idade, genero } = this.registerForm.getRawValue();

    // Emite para o componente pai caso ele escute o evento

    this.authService.register(email, senha, nome, Number(idade), genero).subscribe({
      next: (response) => {
        this.enviando = false;
        if (response.error) {
          console.error('Erro no Supabase:', response.error.message);
          this.errorMessage.set(response.error.message);
        } else {
          // Com confirmação por e-mail ligada, o Supabase não abre sessão até a pessoa confirmar.
          if (response.data.session) {
            this.router.navigate(['/portal']);
          } else {
            this.aviso.set('Conta criada. Confirme o e-mail que enviamos para poder entrar.');
          }
        }
      },
      error: (error) => {
        this.enviando = false;
        console.error('Falha na requisição:', error);
        this.errorMessage.set('Ocorreu um erro ao tentar criar a conta.');
      },
    });
  }

  onSubmit(): void {
    this.onRegister();
  }
}