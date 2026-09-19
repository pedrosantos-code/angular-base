import { Component, DestroyRef, ElementRef, HostListener, NgZone, afterNextRender, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../shared/reveal.directive';
import { HeroRevealComponent } from './hero-reveal/hero-reveal.component';
import { HeroVehicleStageComponent } from './hero-vehicle-stage/hero-vehicle-stage.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealDirective, HeroRevealComponent, HeroVehicleStageComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);
  private zone = inject(NgZone);

  constructor() {
    // O palco do Hero gruda logo abaixo do cabeçalho: sincroniza --reveal-top com a altura real dele
    // (desktop e celular têm alturas diferentes), sem degrau nem faixa entre os dois.
    afterNextRender(() => {
      const root = this.host.nativeElement;
      const header = root.querySelector<HTMLElement>('.site-header');
      const hero = root.querySelector<HTMLElement>('app-hero-reveal');
      if (!header) return;
      this.trackHeaderColor(root, header);
      if (!hero || typeof ResizeObserver === 'undefined') return;
      const sync = () => {
        hero.style.setProperty('--reveal-top', `${header.getBoundingClientRect().height}px`);
        window.dispatchEvent(new Event('resize'));
      };
      const ro = new ResizeObserver(sync);
      ro.observe(header);
      this.destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  // Menu do cabeçalho no mobile
  menuOpen = signal(false);

  // Cor de fundo do cabeçalho: acompanha a seção escura que está por trás dele (null = branco normal)
  headerBg = signal<string | null>('#050709');

  // Links de navegação do cabeçalho, do menu mobile e do rodapé (id da seção de destino)
  navLinks = [
    { label: 'Problema', id: 'problema' },
    { label: 'Proposta', id: 'proposta' },
    { label: 'Como funciona', id: 'funciona' },
    { label: 'Diferencial', id: 'diferencial' },
    { label: 'Impacto', id: 'impacto' }
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
    { a: 'Modelo A', b: 'Ficha em um site, preço em outro', c: 'Incompleto' },
    { a: 'Modelo B', b: 'Atributos com nomes diferentes', c: 'Difícil de comparar' }
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

  // Dados da tabela comparativa (exemplo ilustrativo). kind: head | row | alt
  tableRows = [
    { a: 'Atributo', b: 'Modelo A', c: 'Modelo B', d: 'Modelo C', kind: 'head' },
    { a: 'Potência', b: 'Maior', c: 'Média', d: 'Menor', kind: 'row' },
    { a: 'Velocidade máx.', b: 'Média', c: 'Maior', d: 'Menor', kind: 'alt' }
  ];

  // Barras do gráfico ilustrativo (h = altura, strong = cor de destaque)
  bars = [
    { h: '60%', strong: true, l: 'Modelo A' },
    { h: '45%', strong: false, l: 'Modelo B' },
    { h: '75%', strong: true, l: 'Modelo C' }
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

  /**
   * O cabeçalho pega a cor da seção que passa por baixo dele: as seções escuras/azuis declaram
   * data-header-bg="#hex". Sem seção escura sob ele, volta ao branco. O cálculo roda fora do Angular
   * e só entra na zona quando a cor muda.
   */
  private trackHeaderColor(root: HTMLElement, header: HTMLElement): void {
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-header-bg]'));
    let frame = 0;
    const evaluate = () => {
      frame = 0;
      const line = header.getBoundingClientRect().bottom - 1;
      const under = sections.find((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= line && r.bottom > line;
      });
      const bg = under?.dataset['headerBg'] ?? null;
      if (bg !== this.headerBg()) this.zone.run(() => this.headerBg.set(bg));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(evaluate);
    };
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
    });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    });
    schedule();
  }

  toggleMenu(): void {
    this.menuOpen.update((aberto) => !aberto);
  }

  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  // Links de navegação: rola suave até a seção (ids: problema, proposta, funciona, diferencial, impacto)
  goTo(event: Event, id: string): void {
    event.preventDefault();
    this.closeMenu();
    this.scrollTo(id);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
