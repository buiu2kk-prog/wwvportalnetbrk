/* ==========================================================================
   WEBFIBER · Consentimento de cookies (LGPD) + Google Consent Mode v2
   O estado DEFAULT (tudo negado) é definido inline no <head>, antes do gtag.
   Este arquivo cuida apenas da interface e de gravar/atualizar a escolha.
   ========================================================================== */
(function () {
  "use strict";

  var CHAVE = "wf_consent";
  var VALIDADE_MESES = 6;

  /* ---------- persistência ----------
     localStorage + fallback para cookie 1st-party. Em aba anônima / Safari
     restritivo o localStorage lança exceção; sem o fallback o visitante
     aceitaria os cookies e veria o banner de novo na página seguinte, em loop. */
  function lerCookie() {
    var m = document.cookie.match(/(?:^|;\s*)wf_consent=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function ler() {
    var bruto = null;
    try { bruto = localStorage.getItem(CHAVE); } catch (e) {}
    if (!bruto) bruto = lerCookie();
    try {
      var c = JSON.parse(bruto || "null");
      if (c && c.v === 1 && Date.now() < c.exp) return c;
    } catch (e) {}
    return null;
  }

  function gravar(analytics, publicidade) {
    var c = {
      v: 1,
      analytics: !!analytics,
      ads: !!publicidade,
      exp: Date.now() + VALIDADE_MESES * 30 * 24 * 60 * 60 * 1000
    };
    var txt = JSON.stringify(c);
    var ok = false;
    try { localStorage.setItem(CHAVE, txt); ok = localStorage.getItem(CHAVE) === txt; } catch (e) {}
    if (!ok) {
      // cookie necessário: guarda a própria escolha de cookies (não exige consentimento)
      document.cookie = CHAVE + "=" + encodeURIComponent(txt) +
        ";path=/;max-age=" + (VALIDADE_MESES * 30 * 24 * 60 * 60) + ";SameSite=Lax";
    }
    return c;
  }

  /* ---------- aplica a escolha nas ferramentas ---------- */
  function aplicar(analytics, publicidade) {
    if (typeof gtag === "function") {
      gtag("consent", "update", {
        analytics_storage: analytics ? "granted" : "denied",
        ad_storage: publicidade ? "granted" : "denied",
        ad_user_data: publicidade ? "granted" : "denied",
        ad_personalization: publicidade ? "granted" : "denied"
      });
    }
    // Meta Pixel: com publicidade concedida, o bundle (adiado no <head> para
    // nao custar 108 KB e 172 ms em toda primeira visita) e carregado agora.
    if (publicidade && window.__wfLoadFb) window.__wfLoadFb();
    if (typeof fbq === "function") {
      if (publicidade) concederPixel();
      else fbq("consent", "revoke");
    }
  }

  /* Correcao de 10/11/2026. Na 1a visita o <head> poe na fila do Pixel: revoke, init, PageView.
     O "grant" era chamado logo depois de mandar carregar a biblioteca, ou seja, ANTES de ela
     existir, e ia para o FIM da mesma fila. Ao carregar, a biblioteca processava o revoke e
     segurava tudo o que vinha depois dele (inclusive o proprio grant): o Pixel nunca
     inicializava para quem aceitava os cookies na primeira visita (sem PageView, sem Lead).
     Agora o grant so e dado quando a biblioteca ja assumiu (fbq.callMethod existe); ai ele
     vale na hora e libera o init/PageView que estavam esperando. */
  function concederPixel() {
    if (fbq.callMethod) { fbq("consent", "grant"); return; }
    var feito = false, tentativas = 0, relogio = null;
    function concede() {
      if (feito || typeof fbq !== "function" || !fbq.callMethod) return;
      feito = true;
      if (relogio) clearInterval(relogio);
      fbq("consent", "grant");
    }
    var tag = document.querySelector('script[src*="connect.facebook.net"][src*="fbevents"]');
    if (tag) tag.addEventListener("load", concede);
    // reserva: confere a cada 100 ms por ate 20 s (biblioteca lenta ou tag nao encontrada)
    relogio = setInterval(function () {
      concede();
      if (!feito && ++tentativas > 200) clearInterval(relogio);
    }, 100);
  }

  /* ---------- interface ---------- */
  var HTML =
    '<div class="cookie__box" role="dialog" aria-modal="false" aria-labelledby="cookieTit" aria-describedby="cookieDesc">' +
      '<div class="cookie__txt">' +
        '<b id="cookieTit">Este site usa cookies</b>' +
        '<span id="cookieDesc">Usamos cookies essenciais para o site funcionar e, com a sua permissão, cookies de medição e de anúncios. ' +
        '<span class="cookie__resumo">Você pode aceitar, recusar os não essenciais ou escolher por categoria. </span>Veja a ' +
        '<a href="/politica-de-cookies">Política de Cookies</a> e a <a href="/politica-de-privacidade">Política de Privacidade</a>.</span>' +
      '</div>' +
      '<div class="cookie__acoes">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-c="prefs">Personalizar</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-c="rejeitar" aria-label="Recusar cookies não essenciais">Recusar<span class="cookie__lbl-longo"> não essenciais</span></button>' +
        '<button type="button" class="btn btn--wa btn--sm" data-c="aceitar">Aceitar todos</button>' +
      '</div>' +
      '<div class="cookie__prefs">' +
        '<div class="cookie__cat">' +
          '<div class="cookie__switch"><input type="checkbox" id="ckNec" checked disabled><label for="ckNec">Sempre ativo</label></div>' +
          '<div><h4>Necessários</h4><p>Fazem o site funcionar e guardam a sua escolha de cookies. Não podem ser desativados.</p></div>' +
        '</div>' +
        '<div class="cookie__cat">' +
          '<div class="cookie__switch"><input type="checkbox" id="ckAna"><label for="ckAna">Permitir</label></div>' +
          '<div><h4>Medição de audiência</h4><p>Google Analytics: quantas pessoas visitam o site e quais páginas são mais vistas. Dados agregados, sem identificar você.</p></div>' +
        '</div>' +
        '<div class="cookie__cat">' +
          '<div class="cookie__switch"><input type="checkbox" id="ckAds"><label for="ckAds">Permitir</label></div>' +
          '<div><h4>Publicidade</h4><p>Google Ads e Meta: medir se um anúncio gerou contato e evitar mostrar o mesmo anúncio repetidamente.</p></div>' +
        '</div>' +
        '<div class="cookie__prefs-acoes"><button type="button" class="btn btn--wa btn--sm" data-c="salvar">Salvar preferências</button></div>' +
      '</div>' +
    '</div>';

  var banner = null;
  var decidindo = false;   // trava contra duplo clique acionar o que está embaixo
  var focoAnterior = null; // devolve o foco ao elemento de origem

  function montar() {
    if (banner) return banner;
    banner = document.createElement("div");
    banner.className = "cookie";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.innerHTML = HTML;
    document.body.appendChild(banner);

    banner.addEventListener("click", function (e) {
      var alvo = e.target && e.target.closest && e.target.closest("[data-c]");
      if (!alvo || decidindo) return;
      var acao = alvo.getAttribute("data-c");

      if (acao === "prefs") {
        var salvo = ler();
        banner.querySelector("#ckAna").checked = salvo ? salvo.analytics : false;
        banner.querySelector("#ckAds").checked = salvo ? salvo.ads : false;
        banner.classList.add("is-prefs");
        return;
      }
      if (acao === "aceitar")  return decidir(true, true);
      if (acao === "rejeitar") return decidir(false, false);
      if (acao === "salvar") {
        return decidir(banner.querySelector("#ckAna").checked, banner.querySelector("#ckAds").checked);
      }
    });

    // Esc = recusar os não essenciais (grava a escolha, senão o banner voltaria sempre)
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && banner.classList.contains("is-open")) decidir(false, false);
    });
    return banner;
  }

  /* Roda fn logo depois da próxima pintura. Se a página sair ou for para 2º plano antes
     disso, roda na hora (pagehide / visibilitychange); o temporizador cobre aba oculta,
     onde o requestAnimationFrame não dispara. Nunca roda duas vezes. */
  function depoisDaPintura(fn) {
    var feito = false;
    function roda() {
      if (feito) return;
      feito = true;
      document.removeEventListener("visibilitychange", aoOcultar);
      window.removeEventListener("pagehide", roda);
      fn();
    }
    function aoOcultar() { if (document.visibilityState === "hidden") roda(); }
    document.addEventListener("visibilitychange", aoOcultar);
    window.addEventListener("pagehide", roda);
    if (window.requestAnimationFrame) requestAnimationFrame(function () { setTimeout(roda, 0); });
    setTimeout(roda, 300);
  }

  function decidir(analytics, publicidade) {
    if (decidindo) return;
    decidindo = true;
    gravar(analytics, publicidade);
    // Interface primeiro (Fase 1, 10/11/2026): o aviso some no próximo quadro. Atualizar o
    // consentimento no gtag e carregar o Pixel custa 110–240 ms num celular comum; dentro do
    // clique isso segurava a resposta ao toque. A escolha já está gravada na linha acima e é
    // aplicada às ferramentas logo depois da pintura.
    fechar();
    depoisDaPintura(function () { aplicar(analytics, publicidade); });
    // libera só depois que o clique atual terminou de propagar
    setTimeout(function () { decidindo = false; }, 400);
  }

  function abrir() {
    focoAnterior = document.activeElement;
    var b = montar();
    b.classList.add("is-open");
    // avisa o CSS: no mobile o hero cede espaco vertical e a stickybar sai de
    // cena, para o banner nao cair em cima dos botoes da primeira dobra
    document.documentElement.classList.add("consent-aberto");
    ligarRolagem();
    // leva o foco para dentro do diálogo (o banner fica no fim do body)
    var primeiro = b.querySelector("[data-c]");
    if (primeiro) setTimeout(function () { primeiro.focus(); }, 60);
  }

  /* Enquanto o aviso está aberto a stickybar fica escondida, para não empilhar
     duas barras fixas sobre os CTAs da primeira dobra. Só que quem simplesmente
     ignora o banner ficaria a visita INTEIRA sem a barra de conversão. Passada a
     primeira dobra o hero já saiu de cena: aí ela volta e o aviso sobe para cima
     dela. Fica no consent.js, e não no main.js, porque é o mesmo arquivo que põe
     e tira a classe .consent-aberto — se ele não rodar, nada disso se aplica. */
  var aoRolar = null;
  function ligarRolagem() {
    if (aoRolar) return;
    aoRolar = function () {
      document.documentElement.classList.toggle("rolou", (window.pageYOffset || 0) > 260);
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
  }
  function desligarRolagem() {
    if (!aoRolar) return;
    window.removeEventListener("scroll", aoRolar);
    aoRolar = null;
    document.documentElement.classList.remove("rolou");
  }

  function fechar() {
    if (!banner) return;
    desligarRolagem();
    banner.classList.remove("is-open", "is-prefs");
    document.documentElement.classList.remove("consent-aberto");
    if (focoAnterior && focoAnterior.focus) { try { focoAnterior.focus(); } catch (e) {} }
    focoAnterior = null;
  }

  /* ---------- inicialização ---------- */
  var escolha = ler();
  if (escolha) {
    // já decidiu antes: reaplica (o inline do <head> já fez isso, aqui só garante o fbq)
    aplicar(escolha.analytics, escolha.ads);
  } else {
    abrir();
  }

  // botão "Preferências de cookies" do rodapé
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest("[data-cookie-prefs]");
    if (!btn) return;
    e.preventDefault();
    abrir();
    montar().querySelector('[data-c="prefs"]').click();
  });

  // API pública mínima
  window.WFConsent = { abrir: abrir, ler: ler };
})();
