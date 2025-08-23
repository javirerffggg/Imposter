document.addEventListener('DOMContentLoaded', () => {

    // --- Constantes y Definiciones ---
    const ROLES = {
        IMPOSTOR: 'Impostor',
        JESTER: 'Bufón',
        MIME: 'Mimo',
        SABOTEUR: 'Saboteador',
        DETECTIVE: 'Detective',
        INNOCENT: 'Inocente',
    };

    // --- Referencias a Elementos del DOM ---
    const screens = {
        setup: document.getElementById('setup-screen'),
        roleAssignment: document.getElementById('role-assignment-screen'),
        inGame: document.getElementById('in-game-screen'),
        // accusation: document.getElementById('accusation-screen'), // Eliminado del flujo
        reveal: document.getElementById('reveal-screen'),
        customLists: document.getElementById('custom-lists-screen'),
    };
    const playerNameInput = document.getElementById('player-name-input');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const playersList = document.getElementById('players-list');
    const impostorCountSelect = document.getElementById('impostor-count');
    const categoriesContainer = document.getElementById('categories-container');
    const toggleCategoriesBtn = document.getElementById('toggle-categories-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const roleCard = document.getElementById('role-card');
    const roleTitle = document.getElementById('role-title');
    const roleDescription = document.getElementById('role-description');
    const nextPlayerBtn = document.getElementById('next-player-btn');
    const startingPlayerName = document.getElementById('starting-player-name');
    const accusationBtn = document.getElementById('accusation-btn'); // Este botón ahora revela los roles
    const newGameBtn = document.getElementById('new-game-btn');
    const revealWord = document.getElementById('reveal-word');
    const revealImpostorsList = document.getElementById('reveal-impostors-list');
    const playAgainBtn = document.getElementById('play-again-btn');
    const roundEventBanner = document.getElementById('round-event-banner');
    const roundEventText = document.getElementById('round-event-text');
    // const accusationPlayerList = document.getElementById('accusation-player-list'); // Ya no se usa
    const winLossOverlay = document.getElementById('win-loss-overlay');
    
    // Modales y sus botones
    const modals = {
        rules: document.getElementById('rules-modal'),
        playerStats: document.getElementById('player-stats-modal'),
        achievements: document.getElementById('achievements-modal'),
        theme: document.getElementById('theme-modal'),
    };
    document.getElementById('rules-btn').addEventListener('click', () => { renderRulesModal(); showModal('rules'); });
    document.getElementById('achievements-btn').addEventListener('click', () => { renderAchievementsModal(); showModal('achievements'); });
    document.getElementById('settings-btn').addEventListener('click', () => showModal('theme'));
    document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', hideAllModals));

    // Lógica de Listas Personalizadas
    const customListsBtn = document.getElementById('custom-lists-btn');
    const backToSetupBtn = document.getElementById('back-to-setup-btn');
    const saveListBtn = document.getElementById('save-list-btn');
    const newListNameInput = document.getElementById('new-list-name');
    const newListWordsTextarea = document.getElementById('new-list-words');
    const customListsContainer = document.getElementById('custom-lists-container');
    
    // Lógica de Presets
    const savePresetBtn = document.getElementById('save-preset-btn');
    const presetSelect = document.getElementById('preset-select');

    // Lógica de Logros
    const achievementToast = document.getElementById('achievement-toast');
    const achievementToastText = document.getElementById('achievement-toast-text');

    // --- Estado Global ---
    let masterPlayerList = [];
    let state = {
        players: [],
        gameSettings: {},
        currentRound: {},
        currentScreen: null,
    };
    const resetGameSettings = () => { state.gameSettings = { impostorCount: 1, selectedCategories: new Set(), useImpostorHint: false, useTrollMode: false, useSaboteurMode: false, useDetectiveMode: false, useJesterMode: false, useMimeMode: false, useRoundEvents: false }; };
    const resetCurrentRound = () => { state.currentRound = { word: '', category: '', isCustomCategory: false, startingPlayer: null, assignments: [], currentPlayerIndex: 0, activeEvent: null, eliminatedPlayer: null }; };

    // --- Sound Manager ---
    const soundManager = {
        synth: new Tone.Synth().toDestination(),
        init() { document.body.addEventListener('click', () => Tone.start(), { once: true }); },
        playClick() { this.synth.triggerAttackRelease("C4", "8n"); },
        playAdd() { this.synth.triggerAttackRelease("E4", "8n"); },
        playRemove() { this.synth.triggerAttackRelease("A3", "8n"); },
        playWin() { this.synth.triggerAttackRelease("C5", "4n"); },
        playLose() { this.synth.triggerAttackRelease("C3", "4n"); },
        playCardFlip() { new Tone.NoiseSynth({noise: {type: 'white'}, envelope: {attack: 0.001, decay: 0.1, sustain: 0}}).toDestination().triggerAttackRelease("8n"); },
        playRevealImpostor() { this.synth.triggerAttackRelease("B2", "4n"); },
    };
    soundManager.init();

    // --- Lógica de UI General ---
    function showScreen(screenName) {
        const currentScreenEl = state.currentScreen ? screens[state.currentScreen] : null;
        const nextScreenEl = screens[screenName];
        if (currentScreenEl) {
            currentScreenEl.style.opacity = '0';
            setTimeout(() => {
                currentScreenEl.classList.add('hidden');
                nextScreenEl.classList.remove('hidden');
                nextScreenEl.style.opacity = '1';
                state.currentScreen = screenName;
            }, 400);
        } else {
            Object.values(screens).forEach(s => s.classList.add('hidden'));
            nextScreenEl.classList.remove('hidden');
            nextScreenEl.style.opacity = '1';
            state.currentScreen = screenName;
        }
    }
    
    function showModal(modalName) {
        soundManager.playClick();
        hideAllModals();
        modals[modalName].classList.remove('hidden');
    }
    function hideAllModals() {
        Object.values(modals).forEach(m => m.classList.add('hidden'));
    }

    // --- Lógica de Jugadores y Estadísticas ---
    function loadMasterPlayerList() { masterPlayerList = JSON.parse(localStorage.getItem('imposterWhoMasterList') || '[]'); }
    function saveMasterPlayerList() { localStorage.setItem('imposterWhoMasterList', JSON.stringify(masterPlayerList)); }
    function getPlayerByName(name) { return masterPlayerList.find(p => p.name.toLowerCase() === name.toLowerCase()); }
    function createPlayer(name) { return { name, stats: { games: 0, winsAsImpostor: 0, winsAsInnocent: 0, winsAsJester: 0 }, achievements: [] }; }
    
    function addPlayerToGame(name) {
        const trimmedName = name.trim();
        if (!trimmedName || state.players.length >= 12 || state.players.some(p => p.name === trimmedName)) return;
        soundManager.playAdd();
        let player = getPlayerByName(trimmedName);
        if (!player) {
            player = createPlayer(trimmedName);
            masterPlayerList.push(player);
        }
        state.players.push(player);
        playerNameInput.value = '';
        renderPlayers();
        saveMasterPlayerList();
    }
    
    function renderPlayers() {
        playersList.innerHTML = '';
        state.players.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-[var(--bg-main)] p-2 rounded-lg animate-fade-in-down';
            li.innerHTML = `
                <span class="cursor-pointer flex-grow p-1">${player.name}</span>
                <button data-index="${index}" class="remove-player-btn text-gray-500 hover:text-[var(--role-impostor)] transition-colors p-1">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            li.querySelector('span').addEventListener('click', () => showPlayerStats(player.name));
            playersList.appendChild(li);
        });
        validateGameStart();
    }
    
    function showPlayerStats(playerName) {
        const player = getPlayerByName(playerName);
        if (!player) return;
        document.getElementById('stats-player-name').textContent = `Estadísticas de ${player.name}`;
        const statsContent = document.getElementById('stats-content');
        statsContent.innerHTML = `
            <p>Partidas Jugadas: ${player.stats.games}</p>
            <p>Victorias (Impostor): ${player.stats.winsAsImpostor}</p>
            <p>Victorias (Inocente): ${player.stats.winsAsInnocent}</p>
            <p>Victorias (Bufón): ${player.stats.winsAsJester}</p>
        `;
        showModal('playerStats');
    }
    
    // --- Lógica de Roles y Partida ---
    
    /**
     * Asigna roles a los jugadores de la partida actual.
     * La lógica incluye la selección ponderada de impostores y la asignación aleatoria del resto de roles especiales.
     * @returns {void}
     */
    function assignRoles() {
        let playersToAssign = [...state.players];
        state.currentRound.assignments = [];
        
        let availableRoles = [];
        if (state.gameSettings.useJesterMode) availableRoles.push(ROLES.JESTER);
        if (state.gameSettings.useMimeMode) availableRoles.push(ROLES.MIME);
        if (state.gameSettings.useSaboteurMode) availableRoles.push(ROLES.SABOTEUR);
        if (state.gameSettings.useDetectiveMode) availableRoles.push(ROLES.DETECTIVE);

        const impostors = selectWeightedPlayers(playersToAssign, state.gameSettings.impostorCount);
        impostors.forEach(impostor => {
            state.currentRound.assignments.push({ player: impostor, role: ROLES.IMPOSTOR });
        });
        playersToAssign = playersToAssign.filter(p => !impostors.includes(p));

        availableRoles.forEach(role => {
            if (playersToAssign.length > 0) {
                const index = Math.floor(Math.random() * playersToAssign.length);
                const player = playersToAssign.splice(index, 1)[0];
                state.currentRound.assignments.push({ player, role });
            }
        });

        playersToAssign.forEach(player => {
            state.currentRound.assignments.push({ player, role: ROLES.INNOCENT });
        });

        const wordPool = getWordPool();
        state.currentRound.assignments.forEach(a => {
            if (a.role === ROLES.IMPOSTOR || a.role === ROLES.JESTER) { a.word = '???'; } 
            else if (a.role === ROLES.SABOTEUR) {
                const possibleWords = wordPool.filter(w => w !== state.currentRound.word);
                a.word = possibleWords[Math.floor(Math.random() * possibleWords.length)] || state.currentRound.word;
            } else { a.word = state.currentRound.word; }
        });
        state.currentRound.assignments.sort(() => Math.random() - 0.5);
    }
    
    function displayCurrentPlayerRole() {
        const assignment = state.currentRound.assignments[state.currentRound.currentPlayerIndex];
        document.getElementById('current-player-name').textContent = assignment.player.name;
        let title = '', description = '';
        switch(assignment.role) {
            case ROLES.IMPOSTOR: title = '🤫 ¡Eres IMPOSTOR!'; description = 'Descubre la palabra secreta.'; if(state.gameSettings.impostorCount > 0) soundManager.playRevealImpostor(); break;
            case ROLES.JESTER: title = '🃏 ¡Eres BUFÓN!'; description = '¡Consigue que te eliminen para ganar!'; break;
            case ROLES.MIME: title = '🤐 ¡Eres MIMO!'; description = `La palabra es <strong>${assignment.word}</strong>. ¡NO PUEDES HABLAR!`; break;
            case ROLES.SABOTEUR: title = '💣 ¡Eres SABOTEADOR!'; description = `Tu palabra es: <strong>${assignment.word}</strong>.`; break;
            case ROLES.DETECTIVE: title = '🕵️ ¡Eres DETECTIVE!'; description = `La palabra es: <strong>${assignment.word}</strong>.`; break;
            default: title = '😇 Eres INOCENTE'; description = `La palabra es: <strong>${assignment.word}</strong>.`; break;
        }
        roleTitle.innerHTML = title;
        roleDescription.innerHTML = description;
    }

    function startGame() {
        const wordPool = getWordPool();
        if (wordPool.length === 0) { alert("Por favor, selecciona al menos una categoría con palabras."); return; }
        
        // CORRECCIÓN: Asegurarse de que la tarjeta esté boca abajo al iniciar
        roleCard.classList.remove('is-flipped');
        nextPlayerBtn.classList.add('hidden');

        const selectedCategoryName = Array.from(state.gameSettings.selectedCategories)[0];
        state.currentRound.isCustomCategory = !!getCustomLists().find(l => l.category === selectedCategoryName);
        state.currentRound.word = wordPool[Math.floor(Math.random() * wordPool.length)];
        state.currentRound.startingPlayer = state.players[Math.floor(Math.random() * state.players.length)];
        
        if (state.gameSettings.useRoundEvents && Math.random() < 0.25) { // 25% chance
            const events = [{id: 'double_vote', text: `¡VOTO DOBLE! <strong>${state.players[Math.floor(Math.random()*state.players.length)].name}</strong> tiene dos votos esta ronda.`}];
            state.currentRound.activeEvent = events[0];
            roundEventText.innerHTML = state.currentRound.activeEvent.text;
            roundEventBanner.classList.remove('hidden');
        } else {
            roundEventBanner.classList.add('hidden');
        }
        
        assignRoles();
        state.currentRound.currentPlayerIndex = 0;
        displayCurrentPlayerRole();
        showScreen('roleAssignment');
    }
    
    // --- Lógica de Fin de Partida ---
    
    /**
     * Muestra la pantalla de revelación sin votación.
     */
    function revealRolesWithoutVoting() {
        // Actualiza la estadística de partidas jugadas para todos en la ronda
        state.players.forEach(p => {
            const player = getPlayerByName(p.name);
            if (player) {
                player.stats.games++;
            }
        });
        saveMasterPlayerList();

        // Muestra la pantalla de revelación
        showRevealScreen();
    }

    function showRevealScreen() {
        winLossOverlay.classList.add('hidden');
        revealWord.textContent = state.currentRound.word;
        const impostors = state.currentRound.assignments.filter(a => a.role === ROLES.IMPOSTOR);
        revealImpostorsList.innerHTML = impostors.map(a => `<li>${a.player.name}</li>`).join('');
        // Aquí iría la lógica para mostrar otros roles si se quisiera
        showScreen('reveal');
    }
    
    // --- Lógica de Logros ---
    // La lógica de logros permanece, pero no se activará sin un ganador/perdedor.
    // Esto es intencional según el nuevo flujo de juego sin votación.
    function checkAndUnlockAchievements(player, isWinner, role) {
        const context = {
            votesAgainst: state.currentRound.eliminatedPlayer === player.name ? 1 : 0,
            isCustomCategory: state.currentRound.isCustomCategory
        };
        for (const key in achievements) {
            if (!player.achievements.includes(key)) {
                if (achievements[key].check(player.stats, isWinner, role, context)) {
                    player.achievements.push(key);
                    showAchievementToast(achievements[key]);
                }
            }
        }
    }
    function showAchievementToast(achievement) {
        achievementToastText.textContent = achievement.name;
        achievementToast.classList.remove('hidden');
        setTimeout(() => {
            achievementToast.style.transform = 'translateY(0)';
            achievementToast.style.opacity = '1';
        }, 100);
        setTimeout(() => {
            achievementToast.style.transform = 'translateY(5rem)';
            achievementToast.style.opacity = '0';
            setTimeout(() => achievementToast.classList.add('hidden'), 500);
        }, 4000);
    }
    
    // --- Lógica de Listas Personalizadas y Presets ---
    function getCustomLists() { return JSON.parse(localStorage.getItem('imposterWhoCustomLists') || '[]'); }
    function saveCustomLists(lists) { localStorage.setItem('imposterWhoCustomLists', JSON.stringify(lists)); }
    function getWordPool() {
        const selectedCategories = Array.from(state.gameSettings.selectedCategories);
        const allWordLists = getAllWordLists();
        return selectedCategories.flatMap(cat => allWordLists[cat] || []);
    }
    function getAllWordLists() {
        const custom = getCustomLists().reduce((obj, item) => ({...obj, [item.category]: item.words}), {});
        return { ...wordCategories, ...custom };
    }
    function renderCategories() {
        categoriesContainer.innerHTML = '';
        const allCats = getAllWordLists();
        Object.keys(allCats).forEach(category => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 cursor-pointer category-label';
            label.innerHTML = `<input type="checkbox" data-category="${category}" class="appearance-none w-5 h-5 bg-[var(--bg-main)] rounded-sm border border-gray-600 custom-checkbox transition-all"><span>${category}</span>`;
            categoriesContainer.appendChild(label);
        });
    }
    
    function getPresets() { return JSON.parse(localStorage.getItem('imposterWhoPresets') || '[]'); }
    function savePresets(presets) { localStorage.setItem('imposterWhoPresets', JSON.stringify(presets)); }
    function renderPresets() {
        const presets = getPresets();
        presetSelect.innerHTML = '<option value="">-- Cargar --</option>';
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            presetSelect.appendChild(option);
        });
    }
    function loadPreset(presetName) {
        const preset = getPresets().find(p => p.name === presetName);
        if (!preset) return;
        impostorCountSelect.value = preset.impostorCount;
        document.querySelectorAll('.game-mode-cb').forEach(cb => {
            const modeKey = 'use' + cb.id.charAt(0).toUpperCase() + cb.id.slice(1).replace('-mode', '');
            cb.checked = !!preset[modeKey];
        });
        updateGameSettingsFromUI();
    }

    // --- Renderizado de Modales ---
    function renderRulesModal() {
        document.getElementById('rules-content').innerHTML = `
            <div class="space-y-3 text-[var(--text-dark)]">
                <p><strong>Objetivo:</strong> Los <strong>Inocentes</strong> deben descubrir quién es el <strong>Impostor</strong>. El <strong>Impostor</strong> debe engañar a todos y evitar ser descubierto.</p>
                <hr class="border-gray-600">
                <p><strong>😇 Inocente:</strong> Conoces la palabra secreta. Da pistas sutiles para encontrar a otros inocentes.</p>
                <p><strong>🤫 Impostor:</strong> NO conoces la palabra. Finge que la sabes y trata de adivinarla.</p>
                <p><strong>💣 Saboteador:</strong> Tienes una palabra diferente pero relacionada. Tu objetivo es crear caos.</p>
                <p><strong>🕵️ Detective:</strong> Conoces la palabra y tu objetivo es encontrar al Impostor.</p>
                <p><strong>🃏 Bufón:</strong> NO conoces la palabra. Tu objetivo es que te voten para ser eliminado. Si lo consigues, ganas tú solo.</p>
                <p><strong>🤐 Mimo:</strong> Eres un Inocente, pero no puedes hablar. ¡Usa solo gestos!</p>
            </div>
        `;
    }
    function renderAchievementsModal() {
        const achievementsList = document.getElementById('achievements-list');
        const allPlayerAchievements = new Set(masterPlayerList.flatMap(p => p.achievements));
        achievementsList.innerHTML = Object.entries(achievements).map(([key, ach]) => {
            const unlocked = allPlayerAchievements.has(key);
            return `<div class="p-2 ${unlocked ? 'opacity-100' : 'opacity-40'}">
                        <h4 class="font-bold text-[var(--text-light)]">${unlocked ? '🏆' : '🔒'} ${ach.name}</h4>
                        <p class="text-sm text-[var(--text-dark)]">${ach.description}</p>
                    </div>`;
        }).join('');
    }
    
    // --- Inicialización ---
    function init() {
        resetGameSettings();
        resetCurrentRound();
        loadMasterPlayerList();
        loadTheme();
        renderCategories();
        renderPlayers();
        renderPresets();
        showScreen('setup');
    }
    
    // --- Event Listeners ---
    addPlayerBtn.addEventListener('click', () => addPlayerToGame(playerNameInput.value));
    playerNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addPlayerToGame(playerNameInput.value); });
    playersList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-player-btn');
        if (removeBtn) {
            soundManager.playRemove();
            state.players.splice(removeBtn.dataset.index, 1);
            renderPlayers();
        }
    });
    startGameBtn.addEventListener('click', startGame);
    
    // CORRECCIÓN: El botón de acusación ahora revela los roles directamente
    accusationBtn.addEventListener('click', revealRolesWithoutVoting);

    nextPlayerBtn.addEventListener('click', () => {
        soundManager.playClick();
        state.currentRound.currentPlayerIndex++;
        if (state.currentRound.currentPlayerIndex < state.currentRound.assignments.length) {
            roleCard.classList.remove('is-flipped');
            nextPlayerBtn.classList.add('hidden');
            setTimeout(displayCurrentPlayerRole, 400);
        } else {
            showScreen('inGame');
        }
    });
    roleCard.addEventListener('click', () => {
        if(roleCard.classList.contains('is-flipped')) return;
        soundManager.playCardFlip();
        roleCard.classList.add('is-flipped');
        nextPlayerBtn.classList.remove('hidden');
    });
    
    customListsBtn.addEventListener('click', () => showScreen('customLists'));
    backToSetupBtn.addEventListener('click', () => { renderCategories(); showScreen('setup'); });
    saveListBtn.addEventListener('click', () => {
        const name = newListNameInput.value.trim();
        const words = newListWordsTextarea.value.split('\n').map(w => w.trim()).filter(Boolean);
        if (name && words.length > 0) {
            const lists = getCustomLists();
            lists.push({ category: name, words });
            saveCustomLists(lists);
            newListNameInput.value = '';
            newListWordsTextarea.value = '';
            // Aquí se podría renderizar la lista de listas personalizadas
        }
    });
    
    savePresetBtn.addEventListener('click', () => {
        const name = prompt("Nombre para este preset:");
        if (!name || !name.trim()) return;
        const preset = { name: name.trim(), impostorCount: impostorCountSelect.value };
        document.querySelectorAll('.game-mode-cb').forEach(cb => {
            const modeKey = 'use' + cb.id.charAt(0).toUpperCase() + cb.id.slice(1).replace('-mode', '');
            preset[modeKey] = cb.checked;
        });
        const presets = getPresets();
        presets.push(preset);
        savePresets(presets);
        renderPresets();
    });
    presetSelect.addEventListener('change', (e) => {
        if(e.target.value) loadPreset(e.target.value);
    });

    // --- Lógica de Temas ---
    function applyTheme(theme) {
        document.body.className = 'min-h-screen flex items-center justify-center p-4';
        if (theme !== 'default') document.body.classList.add(theme);
        localStorage.setItem('imposterWhoTheme', theme);
    }
    function loadTheme() {
        const savedTheme = localStorage.getItem('imposterWhoTheme') || 'default';
        applyTheme(savedTheme);
    }
    document.querySelectorAll('.theme-btn').forEach(button => {
        button.addEventListener('click', () => {
            soundManager.playClick();
            applyTheme(button.dataset.theme);
        });
    });
    
    function validateGameStart() {
        startGameBtn.disabled = !(state.players.length >= 3 && state.players.length <= 12 && state.gameSettings.selectedCategories.size > 0);
    }

    categoriesContainer.addEventListener('change', e => {
        if(e.target.type === 'checkbox') {
            const category = e.target.dataset.category;
            if(e.target.checked) state.gameSettings.selectedCategories.add(category);
            else state.gameSettings.selectedCategories.delete(category);
            validateGameStart();
        }
    });
    
    function updateGameSettingsFromUI() {
        state.gameSettings.impostorCount = parseInt(impostorCountSelect.value, 10);
        document.querySelectorAll('.game-mode-cb').forEach(cb => {
            const settingName = 'use' + cb.id.charAt(0).toUpperCase() + cb.id.slice(1).replace('-mode', '');
            state.gameSettings[settingName] = cb.checked;
        });
    }

    document.querySelectorAll('.game-mode-cb, #impostor-count').forEach(el => {
        el.addEventListener('change', updateGameSettingsFromUI);
    });

    playAgainBtn.addEventListener('click', () => {
        resetCurrentRound();
        showScreen('setup');
    });

    // CORRECCIÓN: El botón "Nuevo Juego" ahora mantiene a los jugadores
    newGameBtn.addEventListener('click', () => {
        resetCurrentRound();
        // state.players = []; // Esta línea se ha eliminado para mantener a los jugadores
        renderPlayers();
        showScreen('setup');
    });
    
    // Función para seleccionar jugadores ponderados
    function selectWeightedPlayers(players, count) {
        const selectedPlayers = [];
        let selectionPool = players.map(p => {
            const masterP = getPlayerByName(p.name);
            const wasImpostor = masterP ? masterP.wasImpostor : false;
            return { player: p, weight: wasImpostor ? 1 : 3 };
        });

        for (let i = 0; i < count && selectionPool.length > 0; i++) {
            const totalWeight = selectionPool.reduce((sum, p) => sum + p.weight, 0);
            if (totalWeight === 0) break;

            let randomTarget = Math.random() * totalWeight;
            let selectedIndex = -1;

            for (let j = 0; j < selectionPool.length; j++) {
                randomTarget -= selectionPool[j].weight;
                if (randomTarget < 0) {
                    selectedIndex = j;
                    break;
                }
            }
            
            if (selectedIndex !== -1) {
                selectedPlayers.push(selectionPool[selectedIndex].player);
                selectionPool.splice(selectedIndex, 1);
            }
        }
        
        masterPlayerList.forEach(mp => {
            mp.wasImpostor = selectedPlayers.some(sp => sp.name === mp.name);
        });
        saveMasterPlayerList();

        return selectedPlayers;
    }
    
    init();
});
