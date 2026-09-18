import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../shared/reveal.directive';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealDirective],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  @Output() goLogin = new EventEmitter<void>();
  @Output() goRegister = new EventEmitter<void>();

  // Métodos disparadores para os eventos de autenticação/navegação
  onLoginClick(): void {
    this.goLogin.emit();
  }

  onRegisterClick(): void {
    this.goRegister.emit();
  }

  // Links de navegação do menu lateral/topo
  navLinks = [
    { label: 'Problema', href: '#problema' },
    { label: 'Proposta', href: '#proposta' },
    { label: 'Como funciona', href: '#funciona' },
    { label: 'Diferencial', href: '#diferencial' },
    { label: 'Impacto', href: '#impacto' }
  ];

  // Palavras-chave para a faixa de marquee animada
  keywords: string[] = [
    'RECOMENDAÇÃO POR IA',
    'FICHA TÉCNICA',
    'COMPARAÇÃO DE MODELOS',
    'NOTA COM REGRA PÚBLICA',
    'CONCESSIONÁRIAS',
    'AGENDAMENTO DE TEST-DRIVE'
  ];

  // Problemas mapeados na seção 01
  problems: string[] = [
    'Fichas técnicas em sites diferentes, cada uma com seu formato.',
    'Difícil saber qual modelo combina com o seu uso: cidade, estrada, família, orçamento.',
    'Depois de escolher, ainda é preciso procurar concessionária e marcar test-drive à parte.'
  ];

  // Linhas comparativas (Busca manual vs SEIA)
  oldRows = [
    { a: 'Modelo A', b: 'Ficha em um site, preço em outro', c: 'Incompleto', fg: '#B4453A' },
    { a: 'Modelo B', b: 'Atributos com nomes diferentes', c: 'Difícil de comparar', fg: '#B4453A' }
  ];

  newRows = [
    { a: 'Modelo A', b: 'Ficha técnica oficial Ford', c: 'Comparável' },
    { a: 'Modelo B', b: 'Ficha técnica oficial Ford', c: 'Comparável' }
  ];

  // Pilares da proposta (Seção 02)
  pillars = [
    { k: '01 / RECOMENDAÇÃO', t: 'Descreva seu uso', d: 'Conte sua rotina, passageiros, estrada e orçamento. A IA indica os modelos Ford que mais combinam.' },
    { k: '02 / TRANSPARÊNCIA', t: 'Nota com regra pública', d: 'Cada modelo recebe uma nota e um motivo. A página "Como a IA decide" mostra a conta.' },
    { k: '03 / AÇÃO', t: 'Compare e agende', d: 'Compare modelos lado a lado, encontre uma concessionária e agende o test-drive.' }
  ];

  // Etapas de funcionamento (Seção 03)
  steps = [
    { n: '01', t: 'Descreva', d: 'Escreva como você usa o carro ou escolha um atalho.' },
    { n: '02', t: 'Receba a nota', d: 'O sistema compara seu perfil com o de cada modelo e ordena por compatibilidade.' },
    { n: '03', t: 'Compare', d: 'Veja potência e velocidade máxima de cada versão na ficha técnica.' },
    { n: '04', t: 'Agende', d: 'Escolha uma concessionária próxima e marque o test-drive.' }
  ];

  // Dados da tabela comparativa (exemplo ilustrativo)
  tableRows = [
    { a: 'Atributo', b: 'Modelo A', c: 'Modelo B', d: 'Modelo C', bg: '#002B5C', fg: '#fff', fw: '700' },
    { a: 'Potência', b: 'Maior', c: 'Média', d: 'Menor', bg: '#fff', fg: '#41525F', fw: '400' },
    { a: 'Velocidade máx.', b: 'Média', c: 'Maior', d: 'Menor', bg: '#F7FAFC', fg: '#0B57A4', fw: '600' }
  ];

  // Barras do gráfico ilustrativo
  bars = [
    { h: '60%', c: '#2E7DD1', l: 'Modelo A' },
    { h: '45%', c: '#CFE0EF', l: 'Modelo B' },
    { h: '75%', c: '#2E7DD1', l: 'Modelo C' }
  ];

  // O que a plataforma oferece
  arch = [
    { t: 'Recomendação por IA', d: 'Modelos ordenados pelo seu perfil de uso' },
    { t: 'Modelos e comparação', d: 'Ficha técnica oficial e gráficos lado a lado' },
    { t: 'Concessionárias e agenda', d: 'Busca por CEP ou cidade e test-drive marcado' }
  ];

  // Tabela de diferenciais
  compare = [
    { k: 'Fonte da ficha', a: 'Vários sites', b: 'Varia a cada site', c: 'Ficha oficial Ford' },
    { k: 'Por que este modelo?', a: 'Você decide sozinho', b: 'Nem sempre explicado', c: 'Nota com regra pública' },
    { k: 'Próximo passo', a: 'Procurar à parte', b: 'Fora do site', c: 'Test-drive na mesma plataforma' }
  ];

  // Métricas de impacto
  metrics = [
    { v: '4', l: 'Etapas', n: 'Da descrição do uso ao test-drive' },
    { v: '1', l: 'Plataforma', n: 'Recomendação, comparação e agendamento' }
  ];

  valueCols = [
    { k: 'Para escolher', items: ['Recomendação baseada no seu uso real', 'Nota com motivo e regra pública'] },
    { k: 'Para decidir', items: ['Ficha técnica em um só lugar', 'Concessionária e test-drive a um clique'] }
  ];

  // Integrantes do squad
  team = [
    { n: 'Eric Segawa Montagner' },
    { n: 'João Victor Oliveira dos Santos' },
    { n: 'Matheus Alcântara Estevão' },
    { n: 'Nicolle Pelligrino Jelinski' },
    { n: 'Pedro Pereira dos Santos' },
  ];

  // Rola até a seção indicada (ids: problema, proposta, funciona, diferencial, impacto)
  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
