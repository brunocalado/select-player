import { SelectPlayerAPI, SelectPlayerConfig } from './api.js';

const MODULE_ID = 'select-player';

Hooks.once('init', () => {
  // 1. Setting para armazenar Configuração (Imagem e Nome)
  // Mudamos de 'playerImages' para 'playerConfig' para suportar objetos completos
  game.settings.register(MODULE_ID, 'playerConfig', {
    name: "Player Configuration",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  // 2. Setting para o Som de Seleção
  game.settings.register(MODULE_ID, 'selectionSound', {
    name: "Som de Seleção",
    hint: "Arquivo de áudio que toca quando um jogador é sorteado.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/select-player/assets/selected.mp3",
    filePicker: "audio"
  });

  // 3. Menu de Configuração
  game.settings.registerMenu(MODULE_ID, 'configMenu', {
    name: "Configurar Jogadores (Splash & Nomes)",
    label: "Abrir Configuração",
    hint: "Defina imagens e nomes personalizados para o sorteio.",
    icon: "fas fa-user-cog",
    type: SelectPlayerConfig,
    restricted: true
  });

  // 4. API Global
  window.Select = {
    Players: SelectPlayerAPI.Players.bind(SelectPlayerAPI),
    Config: () => new SelectPlayerConfig().render(true)
  };

  console.log(`${MODULE_ID} | Initialized.`);
});

/**
 * Hook: createChatMessage
 * Sincroniza o efeito visual entre todos os clientes.
 */
Hooks.on('createChatMessage', (message) => {
  const flags = message.flags?.[MODULE_ID];
  
  if (flags && flags.isResult) {
    SelectPlayerAPI.showSplash(flags.image, flags.name);
  }
});