const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * ==========================================
 * PARTE 1: Janela de Configuração (AppV2)
 * ==========================================
 */
export class SelectPlayerConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "select-player-config",
    window: {
      title: "Select Player - Configuração",
      icon: "fas fa-cogs",
      resizable: true,
      width: 500
    },
    position: { width: 500, height: "auto" },
    form: {
      handler: SelectPlayerConfig.submit,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    form: { template: "modules/select-player/templates/config.hbs" }
  };

  async _prepareContext(_options) {
    const savedImages = game.settings.get('select-player', 'playerImages') || {};
    const users = game.users.filter(u => !u.isGM).map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      customImage: savedImages[u.id] || "" 
    }));
    return { users };
  }

  static async submit(event, form, formData) {
    const data = formData.object;
    await game.settings.set('select-player', 'playerImages', data);
    ui.notifications.info("Select Player: Imagens salvas com sucesso!");
  }
}

/**
 * ==========================================
 * PARTE 2: Lógica Principal (Sorteio & Visual)
 * ==========================================
 */
export class SelectPlayerAPI {
  
  static async Players() {
    // 1. Filtrar Jogadores Elegíveis
    const eligibleUsers = game.users.filter(u => u.active && !u.isGM);
    
    if (eligibleUsers.length === 0) {
      ui.notifications.warn("Select Player: Nenhum jogador conectado para sortear.");
      return null;
    }

    // 2. Sortear
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
    const selectedUser = eligibleUsers[randomIndex];

    // 3. Pegar imagem
    const savedImages = game.settings.get('select-player', 'playerImages') || {};
    const displayImage = savedImages[selectedUser.id] || selectedUser.avatar;

    // 4. Criar Mensagem no Chat com FLAG especial
    // A flag será o gatilho para o efeito visual em TODOS os clients (via Hook createChatMessage)
    await this._postChatMessage(selectedUser, displayImage);
    
    return selectedUser;
  }

  /**
   * Cria o elemento visual na tela (DOM) e TOCA O SOM.
   */
  static showSplash(imgPath, name) {
    // --- Lógica de Som (Corrigida para V13) ---
    const soundPath = game.settings.get('select-player', 'selectionSound');
    if (soundPath) {
        // Namespace correto na V13: foundry.audio.AudioHelper
        foundry.audio.AudioHelper.play({ src: soundPath, volume: 0.8, loop: false });
    }

    // --- Lógica Visual ---
    const existing = document.getElementById('select-player-splash');
    if (existing) existing.remove();

    const splash = document.createElement('div');
    splash.id = 'select-player-splash';
    splash.innerHTML = `
        <div class="splash-content">
            <img src="${imgPath}" class="splash-img">
            <div class="splash-text">${name}</div>
        </div>
    `;

    document.body.appendChild(splash);

    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 500);
    }, 3000);
  }

  static async _postChatMessage(user, displayImage) {
    const content = `
      <div class="select-player-card">
        <h3>★ Selecionado!</h3>
        <div class="winner-info">
          <img src="${displayImage}" alt="${user.name}" />
          <span class="winner-name">${user.name}</span>
        </div>
      </div>
    `;

    // Adicionamos 'flags' para que o Hook identifique que essa mensagem deve disparar o Splash
    await ChatMessage.create({
      content: content,
      speaker: ChatMessage.getSpeaker({ alias: "Gamemaster" }),
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: {
        "select-player": {
          isResult: true,
          image: displayImage,
          name: user.name
        }
      }
    });
  }
}