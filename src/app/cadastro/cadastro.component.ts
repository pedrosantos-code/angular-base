import { Component, signal, inject, Output, EventEmitter } from '@angular/core';
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
}

/** Provedores gratuitos mais comuns no Brasil — cadastro é B2B. */
const PROVEDORES_PESSOAIS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com',
  'yahoo.com.br', 'icloud.com', 'me.com', 'bol.com.br', 'uol.com.br',
  'terra.com.br', 'ig.com.br', 'globo.com', 'proton.me', 'protonmail.com',
];

export function emailProfissional(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = (control.value ?? '').toString().trim().toLowerCase();
    const dominio = valor.split('@')[1];
    if (!dominio) return null;
    return PROVEDORES_PESSOAIS.includes(dominio) ? { pessoal: true } : null;
  };
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
  @Output() cadastrar = new EventEmitter<CadastroPayload>();
  @Output() goSite = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  enviando = false;
  mostrarSenha = false;

  readonly fluxo = [
    'toro 2.0 td4  |  "170cv @3750rpm"',
    'amarok v6  |  potencia: 258',
    's10 2.8 ltz  |  "aut. 8 marchas"',
    'hilux srx  |  R$ 329.990,00',
    'frontier pro-4x  |  torque 45,9 kgf.m',
    'rampage rebel  |  "2.2 turbodiesel"',
    'l200 triton  |  190cv/3500',
    'poer king  |  cambio: 8AT',
    'montana premier  |  "1.2 turbo 133cv"',
    'strada ranch  |  preco 149.990',
  ];

  readonly fluxoDuplicado = [...this.fluxo, ...this.fluxo];

  readonly amostra = {
    veiculo: 'Ranger 2.0 Diesel',
    atributos: '170 cv · 47,9 kgfm · AT 10v ·',
    preco: 'R$ 189.900',
  };

  readonly marcas = 14;

  registerForm: FormGroup = this.fb.group(
    {
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email, emailProfissional()]],
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
    const { nome, email, senha } = this.registerForm.getRawValue();

    // Emite para o componente pai caso ele escute o evento
    this.cadastrar.emit({ nome, email, senha });

    this.authService.register(email, senha).subscribe({
      next: (response) => {
        this.enviando = false;
        if (response.error) {
          console.error('Erro no Supabase:', response.error.message);
          this.errorMessage.set(response.error.message);
        } else {
          console.log('Cadastro realizado com sucesso:', response);
          this.router.navigate(['/home']);
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