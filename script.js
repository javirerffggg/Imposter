document.addEventListener('DOMContentLoaded', () => {

    // Referencias a todos los elementos del DOM
    const screens = {
        setup: document.getElementById('setup-screen'),
        roleAssignment: document.getElementById('role-assignment-screen'),
        inGame: document.getElementById('in-game-screen'),
        accusation: document.getElementById('accusation-screen'),
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
    const accusationBtn = document.getElementById('accusation-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const revealWord = document.getElementById('reveal-word');
    const revealImpostorsList = document.getElementById('reveal-impostors-list');
    const playAgainBtn = document.getElementById('play-again-btn');
    const roundEventBanner = document.getElementById('round-event-banner');
    const roundEventText = document.getElementById('round-event-text');
    const accusationPlayerList = document.getElementById('accusation-player-list');
    const winLossOverlay = document.getElementById('win-loss-overlay');
    
    // Modales y sus botones
    const modals = {
        rules: document.getElementById('rules-modal'),
        playerStats: document.getElementById('player-stats-modal'),
        achievements: document.getElementById('achievements-modal'),
        theme: document.getElementById('theme-modal'),
    };
    document.getElementById('rules-btn').addEventListener('click', () => showModal('rules'));
    document.getElementById('achievements-btn').addEventListener('click', () => showModal('achievements'));
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
    let masterPlayerList = []; // Lista persistente de todos los jugadores y sus stats
    let state = {
        players: [], // Jugadores en la partida actual
        gameSettings: {},
        currentRound: {},
    };
    const resetGameSettings = () => { state.gameSettings = { impostorCount: 1, selectedCategories: new Set(), useImpostorHint: false, useTrollMode: false, useSaboteurMode: false, useDetectiveMode: false, useJesterMode: false, useMimeMode: false, useRoundEvents: false }; };
    const resetCurrentRound = () => { state.currentRound = { word: '', category: '', isCustomCategory: false, startingPlayer: null, assignments: [], currentPlayerIndex: 0, activeEvent: null, eliminatedPlayer: null }; };

    // --- Sound Manager ---
    const soundManager = {
        synth: new Tone.Synth().toDestination(),
        init() { document.body.addEventListener('click', () => Tone.start(), { once: true }); },
        playClick() { this.synth.triggerAttackRelease("C4", "8n"); },
        playWin() { this.synth.triggerAttackRelease("C5", "4n"); },
        playLose() { this.synth.triggerAttackRelease("C3", "4n"); },
        playCardFlip() { new Tone.NoiseSynth({noise: {type: 'white'}, envelope: {attack: 0.001, decay: 0.1, sustain: 0}}).toDestination().triggerAttackRelease("8n"); },
        playRevealImpostor() { this.synth.triggerAttackRelease("B2", "4n"); },
    };
    soundManager.init();

    // --- Lógica de UI General ---
    function showScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.add('hidden'));
        screens[screenName].classList.remove('hidden');
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
    function loadMasterPlayerList() {
        masterPlayerList = JSON.parse(localStorage.getItem('imposterWhoMasterList') || '[]');
    }
    function saveMasterPlayerList() {
        localStorage.setItem('imposterWhoMasterList', JSON.stringify(masterPlayerList));
    }
    function getPlayerByName(name) {
        return masterPlayerList.find(p => p.name.toLowerCase() === name.toLowerCase());
    }
    function createPlayer(name) {
        return {
            name,
            stats: { games: 0, winsAsImpostor: 0, winsAsInnocent: 0, winsAsJester: 0 },
            achievements: []
        };
    }
    function addPlayerToGame(name) {
        if (state.players.length >= 12 || state.players.some(p => p.name === name)) return;
        let player = getPlayerByName(name);
        if (!player) {
            player = createPlayer(name);
            masterPlayerList.push(player);
        }
        state.players.push(player);
        renderPlayers();
        saveMasterPlayerList();
    }
    function renderPlayers() {
        playersList.innerHTML = '';
        state.players.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-[var(--bg-main)] p-2 rounded-lg animate-fade-in-down cursor-pointer';
            li.innerHTML = `<span>${player.name}</span><button data-index="${index}" class="remove-player-btn text-gray-500 hover:text-[var(--role-impostor)]">X</button>`;
            li.addEventListener('click', (e) => {
                if (e.target === li || e.target === li.firstChild) showPlayerStats(player.name);
            });
            playersList.appendChild(li);
        });
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
    function assignRoles() {
        // ... (lógica de asignación existente, modificada para incluir Bufón y Mimo)
        let playersToAssign = [...state.players];
        state.currentRound.assignments = [];
        
        let availableRoles = [];
        if (state.gameSettings.useJesterMode) availableRoles.push('Bufón');
        if (state.gameSettings.useMimeMode) availableRoles.push('Mimo');
        if (state.gameSettings.useSaboteurMode) availableRoles.push('Saboteador');
        if (state.gameSettings.useDetectiveMode) availableRoles.push('Detective');

        // Asignar Impostores primero
        const impostors = selectWeightedPlayers(playersToAssign, state.gameSettings.impostorCount);
        impostors.forEach(impostor => {
            state.currentRound.assignments.push({ player: impostor, role: 'Impostor' });
        });
        playersToAssign = playersToAssign.filter(p => !impostors.includes(p));

        // Asignar roles especiales aleatoriamente
        availableRoles.forEach(role => {
            if (playersToAssign.length > 0) {
                const index = Math.floor(Math.random() * playersToAssign.length);
                const player = playersToAssign.splice(index, 1)[0];
                state.currentRound.assignments.push({ player, role });
            }
        });

        // El resto son inocentes
        playersToAssign.forEach(player => {
            state.currentRound.assignments.push({ player, role: 'Inocente' });
        });

        // Asignar palabras
        state.currentRound.assignments.forEach(a => {
            if (a.role === 'Impostor' || a.role === 'Bufón') {
                a.word = '???';
            } else if (a.role === 'Saboteador') {
                const possibleWords = getWordPool().filter(w => w !== state.currentRound.word);
                a.word = possibleWords[Math.floor(Math.random() * possibleWords.length)];
            } else {
                a.word = state.currentRound.word;
            }
        });

        state.currentRound.assignments.sort(() => Math.random() - 0.5);
    }
    
    function displayCurrentPlayerRole() {
        const assignment = state.currentRound.assignments[state.currentRound.currentPlayerIndex];
        // ... (lógica existente, modificada para las tarjetas de Bufón y Mimo)
        let title = '', description = '';
        switch(assignment.role) {
            case 'Impostor': title = '🤫 ¡Eres IMPOSTOR!'; description = 'Descubre la palabra secreta.'; break;
            case 'Bufón': title = '🃏 ¡Eres BUFÓN!'; description = '¡Consigue que te eliminen para ganar!'; break;
            case 'Mimo': title = '🤐 ¡Eres MIMO!'; description = `La palabra es <strong>${assignment.word}</strong>. ¡NO PUEDES HABLAR!`; break;
            // ... otros roles
            default: title = '😇 Eres INOCENTE'; description = `La palabra es: <strong>${assignment.word}</strong>.`; break;
        }
        roleTitle.innerHTML = title;
        roleDescription.innerHTML = description;
    }

    function startGame() {
        // ... (lógica existente, modificada para Eventos de Ronda)
        // Seleccionar palabra
        const pool = getWordPool();
        const selectedCategory = state.gameSettings.selectedCategories.values().next().value; // Simplificado
        state.currentRound.isCustomCategory = !!getCustomLists().find(l => l.category === selectedCategory);
        state.currentRound.word = pool[Math.floor(Math.random() * pool.length)];
        
        // Evento de Ronda
        if (state.gameSettings.useRoundEvents && Math.random() < 0.15) {
            const events = [{id: 'double_vote', text: `¡VOTO DOBLE! ${state.players[Math.floor(Math.random()*state.players.length)].name} tiene dos votos.`}];
            state.currentRound.activeEvent = events[0];
            roundEventText.textContent = state.currentRound.activeEvent.text;
            roundEventBanner.classList.remove('hidden');
        } else {
            roundEventBanner.classList.add('hidden');
        }
        
        assignRoles();
        // ... resto de la función
        showScreen('roleAssignment');
    }
    
    // --- Lógica de Fin de Partida ---
    function handleAccusation(eliminatedPlayerName) {
        state.currentRound.eliminatedPlayer = eliminatedPlayerName;
        const eliminatedAssignment = state.currentRound.assignments.find(a => a.player.name === eliminatedPlayerName);
        let winner = '';

        if (eliminatedAssignment.role === 'Bufón') {
            winner = 'Bufón';
            showWinLossOverlay('¡EL BUFÓN GANA!', 'from-yellow-400 to-orange-500');
        } else {
            const impostors = state.currentRound.assignments.filter(a => a.role === 'Impostor');
            const impostorWasEliminated = impostors.some(i => i.player.name === eliminatedPlayerName);
            if (impostorWasEliminated) {
                winner = 'Inocentes';
                showWinLossOverlay('¡INOCENTES GANAN!', 'from-blue-400 to-green-400');
            } else {
                winner = 'Impostores';
                showWinLossOverlay('¡IMPOSTORES GANAN!', 'from-red-500 to-purple-600');
            }
        }
        updateAllStats(winner);
        setTimeout(showRevealScreen, 3000);
    }

    function showWinLossOverlay(text, gradientClass) {
        winLossOverlay.textContent = text;
        winLossOverlay.className = `... flex ... bg-gradient-to-br ${gradientClass}`; // Clases base + gradiente
        winLossOverlay.classList.remove('hidden');
    }

    function updateAllStats(winner) {
        state.currentRound.assignments.forEach(a => {
            const player = getPlayerByName(a.player.name);
            if (!player) return;
            player.stats.games++;
            let isWinner = false;
            if (winner === 'Bufón' && a.role === 'Bufón') { player.stats.winsAsJester++; isWinner = true; }
            if (winner === 'Inocentes' && !['Impostor', 'Bufón'].includes(a.role)) { player.stats.winsAsInnocent++; isWinner = true; }
            if (winner === 'Impostores' && a.role === 'Impostor') { player.stats.winsAsImpostor++; isWinner = true; }
            
            checkAndUnlockAchievements(player, isWinner, a.role);
        });
        saveMasterPlayerList();
    }

    // --- Lógica de Logros ---
    function checkAndUnlockAchievements(player, isWinner, role) {
        const context = {
            votesAgainst: state.currentRound.eliminatedPlayer === player.name ? 1 : 0, // Simplificado
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
        const allCategories = { ...wordCategories, ...getCustomLists().reduce((obj, item) => ({...obj, [item.category]: item.words}), {}) };
        return selectedCategories.flatMap(cat => allCategories[cat] || []);
    }
    // ... (resto de funciones para CRUD de listas y presets)

    // --- Inicialización ---
    function init() {
        resetGameSettings();
        resetCurrentRound();
        loadMasterPlayerList();
        // ... (resto de la inicialización)
        showScreen('setup');
    }

    init();
});
