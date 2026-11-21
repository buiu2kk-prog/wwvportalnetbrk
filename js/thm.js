/* ==========================================================================
   THM TECNOLOGIA NET · INTERATIVIDADE & FUNCIONALIDADES (THM FIBRA)
   WhatsApp: (32) 99915-0568 | Fixo: (32) 3432-0218
   Juiz de Fora / MG & Rio Novo / MG
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Configuração Principal da THM
  const THM_CONFIG = {
    whatsappNumber: "5532999150568",
    whatsappDefaultMsg: "Olá! Vim pelo site e gostaria de contratar a internet fibra da THM Provedor.",
    cidadeBase: "Juiz de Fora - MG",
    filialEndereco: "Rua Vitorino Braga, 620 - Vitorino Braga, Juiz de Fora - MG",
    cnpj: "24.336.600/0004-36"
  };

  /* --------------------------------------------------------------------------
     1. Header com Efeito ao Rolar a Página
     -------------------------------------------------------------------------- */
  const header = document.querySelector('.thm-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });

  /* --------------------------------------------------------------------------
     2. Menu Mobile Toggle
     -------------------------------------------------------------------------- */
  const mobileToggle = document.querySelector('.thm-mobile-toggle');
  const navMenu = document.querySelector('.thm-nav__menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const isExpanded = navMenu.classList.contains('active');
      mobileToggle.setAttribute('aria-expanded', isExpanded);
    });

    // Fechar ao clicar em qualquer link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  /* --------------------------------------------------------------------------
     3. Alternador de Abas de Planos (Residencial vs Corporativo)
     -------------------------------------------------------------------------- */
  const tabBtns = document.querySelectorAll('.thm-tab-btn');
  const plansGrids = document.querySelectorAll('.thm-plans-category');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCategory = btn.getAttribute('data-target');

      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      plansGrids.forEach(grid => {
        if (grid.id === targetCategory) {
          grid.style.display = 'grid';
        } else {
          grid.style.display = 'none';
        }
      });
    });
  });

  /* --------------------------------------------------------------------------
     4. Simulador Interativo "Qual seu plano ideal?"
     -------------------------------------------------------------------------- */
  let pessoasCount = '3-5';
  let usoTipo = 'jogos';

  const quizBtns = document.querySelectorAll('.thm-quiz-btn');
  const resTag = document.getElementById('quizResTag');
  const resSpeed = document.getElementById('quizResSpeed');
  const resPrice = document.getElementById('quizResPrice');
  const resDesc = document.getElementById('quizResDesc');
  const resBtn = document.getElementById('quizResBtn');

  function atualizarRecomendacao() {
    let plano = {
      tag: "Mais Indicado para Sua Família",
      speed: "850 MEGA",
      price: "R$ 119,90/mês",
      desc: "Wi-Fi 6 Dual Band + Watch TV inclusa + Latência ultrabaixa para múltiplos aparelhos.",
      waMsg: "Olá! Fiz a simulação no site da THM e o plano ideal recomendado foi 850 Mega por R$ 119,90. Gostaria de assinar!"
    };

    if (pessoasCount === '1-2' && (usoTipo === 'basico' || usoTipo === 'streaming')) {
      plano = {
        tag: "Melhor Custo-Benefício",
        speed: "700 MEGA",
        price: "R$ 99,90/mês",
        desc: "Ideal para navegação rápida, home office e streaming em 4K sem travar.",
        waMsg: "Olá! Fiz a simulação no site da THM e tenho interesse no plano de 700 Mega por R$ 99,90. Podem me atender?"
      };
    } else if (pessoasCount === '6+' || usoTipo === 'jogos') {
      plano = {
        tag: "Velocidade Máxima & Extrema Estabilidade",
        speed: "1 GIGA TURBO",
        price: "R$ 149,90/mês",
        desc: "Velocidade máxima sem limites, ping de torneio, downloads instantâneos e suporte VIP.",
        waMsg: "Olá! Fiz a simulação no site da THM e o plano recomendado para minha casa foi o 1 Giga Turbo por R$ 149,90. Gostaria de verificar viabilidade!"
      };
    }

    if (resTag) resTag.textContent = plano.tag;
    if (resSpeed) resSpeed.textContent = plano.speed;
    if (resPrice) resPrice.textContent = plano.price;
    if (resDesc) resDesc.textContent = plano.desc;
    if (resBtn) {
      resBtn.href = `https://wa.me/${THM_CONFIG.whatsappNumber}?text=${encodeURIComponent(plano.waMsg)}`;
    }
  }

  quizBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = btn.parentElement;
      parent.querySelectorAll('.thm-quiz-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tipo = btn.getAttribute('data-type');
      const val = btn.getAttribute('data-val');

      if (tipo === 'pessoas') {
        pessoasCount = val;
      } else if (tipo === 'uso') {
        usoTipo = val;
      }

      atualizarRecomendacao();
    });
  });

  /* --------------------------------------------------------------------------
     5. Consulta Rápida de CEP / Endereço via WhatsApp
     -------------------------------------------------------------------------- */
  const cepForm = document.getElementById('thmCepForm');
  const cepInput = document.getElementById('thmCepInput');

  if (cepForm && cepInput) {
    cepForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = cepInput.value.trim();
      if (!val) {
        cepInput.focus();
        return;
      }

      const msg = `Olá THM Fibra! Gostaria de consultar a viabilidade técnica para o meu endereço/CEP: ${val} em Juiz de Fora / Rio Novo.`;
      const url = `https://wa.me/${THM_CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    });
  }

  /* --------------------------------------------------------------------------
     6. Animador Dinâmico do Medidor de Velocidade do Hero
     -------------------------------------------------------------------------- */
  const speedDisplay = document.getElementById('thmHeroSpeedVal');
  if (speedDisplay) {
    const velocidades = ['700', '850', '980', '1000'];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % velocidades.length;
      speedDisplay.textContent = velocidades[idx];
    }, 3500);
  }

  /* --------------------------------------------------------------------------
     7. Copiar CNPJ com Feedback Visual
     -------------------------------------------------------------------------- */
  const btnCopiarCnpj = document.getElementById('btnCopiarCnpj');
  if (btnCopiarCnpj) {
    btnCopiarCnpj.addEventListener('click', () => {
      navigator.clipboard.writeText("24336600000436").then(() => {
        const originalText = btnCopiarCnpj.innerHTML;
        btnCopiarCnpj.innerHTML = '<span>✓ CNPJ Copiado!</span>';
        setTimeout(() => {
          btnCopiarCnpj.innerHTML = originalText;
        }, 2200);
      });
    });
  }

  // Inicializa o simulador na carga
  atualizarRecomendacao();
});
