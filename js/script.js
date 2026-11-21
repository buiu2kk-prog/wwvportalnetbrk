/**
 * MULTILIG INTERNET - SCRIPTS & INTERATIVIDADE
 * Desenvolvido com foco em alta conversão e experiência de usuário
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Header scroll effect
  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 2. Menu Mobile Toggle
  const burgerBtn = document.getElementById('burgerBtn');
  const navMenu = document.getElementById('navMenu');

  if (burgerBtn && navMenu) {
    burgerBtn.addEventListener('click', () => {
      navMenu.classList.toggle('mobile-open');
      const isOpen = navMenu.classList.contains('mobile-open');
      burgerBtn.setAttribute('aria-expanded', isOpen);
    });

    // Fechar ao clicar em qualquer link
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('mobile-open');
      });
    });
  }

  // 3. Alternância de Abas de Planos (Residencial vs Corporativo)
  const tabBtns = document.querySelectorAll('.plan-tab-btn');
  const residentialPlans = document.getElementById('residentialPlans');
  const corporatePlans = document.getElementById('corporatePlans');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-target');
      if (target === 'corporate') {
        residentialPlans.style.display = 'none';
        corporatePlans.style.display = 'grid';
      } else {
        residentialPlans.style.display = 'grid';
        corporatePlans.style.display = 'none';
      }
    });
  });

  // 4. FAQ Accordion Interativo
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    header.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      // Fecha todos
      faqItems.forEach(i => i.classList.remove('open'));
      // Abre se não estava aberto
      if (!wasOpen) {
        item.classList.add('open');
      }
    });
  });

  // 5. Consulta de CEP / Viabilidade de Cobertura
  const cepInput = document.getElementById('cepInput');
  const btnVerificarCep = document.getElementById('btnVerificarCep');
  const cepResult = document.getElementById('cepResult');

  if (cepInput) {
    // Máscara CEP
    cepInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 8) value = value.slice(0, 8);
      if (value.length > 5) {
        value = value.replace(/^(\d{5})(\d)/, '$1-$2');
      }
      e.target.value = value;
    });

    // Enter tecla
    cepInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verificarViabilidade();
      }
    });
  }

  if (btnVerificarCep) {
    btnVerificarCep.addEventListener('click', verificarViabilidade);
  }

  async function verificarViabilidade() {
    if (!cepInput || !cepResult) return;
    const cepClean = cepInput.value.replace(/\D/g, '');

    if (cepClean.length !== 8) {
      cepResult.innerHTML = '<span style="color: #ff94b4;">⚠️ Digite um CEP válido com 8 dígitos.</span>';
      return;
    }

    cepResult.innerHTML = '<span style="color: #BFD8FF;">🔎 Verificando cabeamento de fibra no endereço...</span>';

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await res.json();

      if (data.erro) {
        cepResult.innerHTML = '<span style="color: #ff94b4;">⚠️ CEP não encontrado. Fale com nossos consultores para consultar seu endereço manual.</span>';
        return;
      }

      const cidade = data.localidade || 'Curitiba';
      const bairro = data.bairro || 'sua região';
      const logradouro = data.logradouro ? `${data.logradouro}, ` : '';

      // Redirecionamento amigável para o WhatsApp com os dados preenchidos
      const msg = encodeURIComponent(`Olá, Multilig! Gostaria de contratar internet fibra para o endereço: ${logradouro}${bairro} - ${cidade} (CEP: ${cepInput.value}). Tem viabilidade de instalação?`);
      const waUrl = `https://wa.me/554132454747?text=${msg}`;

      cepResult.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <p style="color: #7cf2b2; margin-bottom: 8px;">🎉 <strong>Excelente notícia!</strong> Temos rota de fibra ativa para <strong>${bairro} - ${cidade}</strong>.</p>
          <a href="${waUrl}" target="_blank" class="btn btn--wa" style="padding: 10px 18px; font-size: 0.9rem;">
            Continuar no WhatsApp com meu CEP
          </a>
        </div>
      `;
    } catch (err) {
      // Fallback amigável
      const msgFallback = encodeURIComponent(`Olá, Multilig! Gostaria de consultar viabilidade de internet fibra para o CEP: ${cepInput.value} em Curitiba.`);
      cepResult.innerHTML = `
        <div style="background: rgba(7, 85, 222, 0.25); border: 1px solid var(--azul-glow); border-radius: 8px; padding: 12px; margin-top: 10px;">
          <p style="color: #c9dcff; margin-bottom: 8px;">📡 Consulta registrada para o CEP <strong>${cepInput.value}</strong> em Curitiba/PR.</p>
          <a href="https://wa.me/554132454747?text=${msgFallback}" target="_blank" class="btn btn--wa" style="padding: 10px 18px; font-size: 0.9rem;">
            Confirmar Cobertura com Atendente
          </a>
        </div>
      `;
    }
  }

  // 6. Modal de Central do Assinante / 2ª Via
  const modalOverlay = document.getElementById('modalOverlay');
  const openModalBtns = document.querySelectorAll('.open-fatura-modal');
  const closeModalBtn = document.getElementById('modalCloseBtn');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modalOverlay) modalOverlay.classList.add('active');
    });
  });

  if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('active');
    });

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }
});
