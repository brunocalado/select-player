import { SelectPlayerAPI, SelectPlayerConfig } from './api.js';

const MODULE_ID = 'select-player';

Hooks.once('init', () => {
  // Settings
  game.settings.register(MODULE_ID, 'playerImages', {
    name: "Player Images",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, 'selectionSound', {
    name: "Som de Seleção",
    hint: "Arquivo de áudio que toca quando um jogador é sorteado.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/select-player/assets/selected.mp3",
    filePicker: "audio"
  });

  game.settings.registerMenu(MODULE_ID, 'configMenu', {
    name: "Configurar Imagens (Splash)",
    label: "Abrir Configuração",
    hint: "Defina imagens personalizadas para o efeito visual.",
    icon: "fas fa-images",
    type: SelectPlayerConfig,
    restricted: true
  });

  // API Global
  window.Select = {
    Players: SelectPlayerAPI.Players.bind(SelectPlayerAPI),
    Config: () => new SelectPlayerConfig().render(true)
  };

  console.log(`${MODULE_ID} | Initialized.`);
});

/**
 * Hook: createChatMessage
 * Este hook roda em TODOS os clientes conectados quando uma mensagem é criada.
 * Usamos isso para sincronizar o efeito visual sem depender de sockets manuais.
 */
Hooks.on('createChatMessage', (message) => {
  // Verifica se a mensagem tem a flag do nosso módulo
  const flags = message.flags?.[MODULE_ID];
  
  if (flags && flags.isResult) {
    console.log(`${MODULE_ID} | Mensagem de sorteio detectada via Hook.`);
    // Dispara o efeito visual e sonoro localmente para quem recebeu a mensagem
    SelectPlayerAPI.showSplash(flags.image, flags.name);
  }
});