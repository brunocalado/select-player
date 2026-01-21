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
      title: "Select Player - Configurar Jogadores",
      icon: "fas fa-user-edit",
      resizable: true,
      width: 600 // Aumentei um pouco para caber os novos campos
    },
    position: { width: 600, height: "auto" },
    form: {
      handler: SelectPlayerConfig.submit,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    form: { template: "modules/select-player/templates/config.hbs" }
  };

  async _prepareContext(_options) {
    // Busca a configuração nova (playerConfig)
    const playerConfig = game.settings.get('select-player', 'playerConfig') || {};
    
    // Filtra jogadores (não GM)
    const users = game.users.filter(u => !u.isGM).map(u => {
      const config = playerConfig[u.id] || {};
      
      // Tenta pegar o nome do Actor para mostrar como placeholder (dica visual)
      const actorName = u.character ? u.character.name : "Sem Actor Linkado";

      return {
        id: u.id,
        userName: u.name,
        actorName: actorName,
        avatar: u.avatar,
        // Dados salvos
        customImage: config.image || "",
        customName: config.name || ""
      };
    });

    return { users };
  }

  static async submit(event, form, formData) {
    // formData.object retorna chaves planas como "userid.image": "valor"
    // Usamos expandObject para transformar em { userid: { image: "...", name: "..." } }
    const data = foundry.utils.expandObject(formData.object);
    
    await game.settings.set('select-player', 'playerConfig', data);
    ui.notifications.info("Select Player: Configurações salvas!");
  }
}

/**
 * ==========================================
 * PARTE 2: Lógica Principal (Sorteio & Visual)
 * ==========================================
 */
export class SelectPlayerAPI {
  
  static async Players() {
    const eligibleUsers = game.users.filter(u => u.active && !u.isGM);
    
    if (eligibleUsers.length === 0) {
      ui.notifications.warn("Select Player: Nenhum jogador conectado para sortear.");
      return null;
    }

    // --- Sorteio ---
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
    const selectedUser = eligibleUsers[randomIndex];
    const userId = selectedUser.id;

    // --- Resolução de Dados (Config > Actor > User) ---
    const playerConfig = game.settings.get('select-player', 'playerConfig') || {};
    const userSettings = playerConfig[userId] || {};

    // 1. Resolução do NOME
    let displayName = userSettings.name; // Prioridade 1: Customizado
    if (!displayName && selectedUser.character) {
        displayName = selectedUser.character.name; // Prioridade 2: Actor Linkado
    }
    if (!displayName) {
        displayName = selectedUser.name; // Prioridade 3: Nome do Usuário Foundry
    }

    // 2. Resolução da IMAGEM
    let displayImage = userSettings.image; // Prioridade 1: Customizada
    // Opcional: Se quiser usar a imagem do Actor se não tiver customizada, descomente abaixo:
    // if (!displayImage && selectedUser.character) displayImage = selectedUser.character.img;
    if (!displayImage) {
        displayImage = selectedUser.avatar; // Prioridade Final: Avatar do Usuário
    }

    // --- Execução ---
    await this._postChatMessage(selectedUser, displayName, displayImage);
    
    return { user: selectedUser, name: displayName };
  }

  static showSplash(imgPath, name) {
    // --- Lógica de Som (Corrigida para V13) ---
    const soundPath = game.settings.get('select-player', 'selectionSound');
    if (soundPath) {
        // Toca no canal 'environment' (Ambiente) conforme solicitado
        // A API game.audio.play permite definir o canal explicitamente
        //game.audio.play(soundPath, { channel: "environment", volume: 0.8, loop: false });
        foundry.audio.AudioHelper.play({src: soundPath, channel: "environment", loop: false, volume: 1});

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

  static async _postChatMessage(user, finalName, finalImage) {
    // Usamos o nome resolvido (finalName) no card do chat também
    const content = `
      <div class="select-player-card">
        <h3>★ Selecionado!</h3>
        <div class="winner-info">
          <img src="${finalImage}" alt="${finalName}" />
          <span class="winner-name">${finalName}</span>
        </div>
      </div>
    `;

    await ChatMessage.create({
      content: content,
      speaker: ChatMessage.getSpeaker({ alias: "Gamemaster" }),
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: {
        "select-player": {
          isResult: true,
          image: finalImage,
          name: finalName
        }
      }
    });
  }
}