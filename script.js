document.addEventListener('DOMContentLoaded', () => {

    // Referencias a elementos del DOM
    const screens = {
        setup: document.getElementById('setup-screen'),
        roleAssignment: document.getElementById('role-assignment-screen'),
        inGame: document.getElementById('in-game-screen'),
        reveal: document.getElementById('reveal-screen'),
    };
    // ... (resto de referencias a elementos)
    const playerNameInput = document.getElementById('player-name-input');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const playersList = document.getElementById('players-list');
    const impostorCountSelect = document.getElementById('impostor-count');
    const categoriesContainer = document.getElementById('categories-container');
    const toggleCategoriesBtn = document.getElementById('toggle-categories-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const currentPlayerName = document.getElementById('current-player-name');
    const roleCard = document.getElementById('role-card');
    const roleTitle = document.getElementById('role-title');
    const roleDescription = document.getElementById('role-description');
    const hintButton = document.getElementById('hint-button');
    const nextPlayerBtn = document.getElementById('next-player-btn');
    const startingPlayerName = document.getElementById('starting-player-name');
    const revealRolesBtn = document.getElementById('reveal-roles-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const revealWord = document.getElementById('reveal-word');
    const revealImpostorsContainer = document.getElementById('reveal-impostors-container');
    const revealImpostorsList = document.getElementById('reveal-impostors-list');
    const revealSaboteurContainer = document.getElementById('reveal-saboteur-container');
    const revealSaboteur = document.getElementById('reveal-saboteur');
    const revealDetectiveContainer = document.getElementById('reveal-detective-container');
    const revealDetective = document.getElementById('reveal-detective');
    const playAgainBtn = document.getElementById('play-again-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const themeModal = document.getElementById('theme-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const themeButtons = document.querySelectorAll('.theme-btn');

    // Estado del juego
    let state = {
        players: [],
        gameSettings: {
            impostorCount: 1,
            selectedCategories: new Set(),
            useImpostorHint: false,
            useTrollMode: false,
            useSaboteurMode: false,
            useDetectiveMode: false,
        },
        currentRound: {
            word: '',
            category: '',
            startingPlayer: null,
            assignments: [],
            currentPlayerIndex: 0,
        },
        currentScreen: 'setup',
    };
    
    // --- Sound Manager ---
    const soundManager = {
        synth: new Tone.Synth().toDestination(),
        init() {
            // Iniciar el contexto de audio en una interacción del usuario
            document.body.addEventListener('click', () => Tone.start(), { once: true });
        },
        playClick() { this.synth.triggerAttackRelease("C4", "8n"); },
        playAdd() { this.synth.triggerAttackRelease("E4", "8n"); },
        playRemove() { this.synth.triggerAttackRelease("A3", "8n"); },
        playCardFlip() { new Tone.NoiseSynth().toDestination().triggerAttackRelease("8n"); },
        playRevealImpostor() { this.synth.triggerAttackRelease("B2", "4n"); },
        playStartGame() { this.synth.triggerAttackRelease("G4", "4n"); }
    };
    soundManager.init();

    // --- Lógica de Gestión de Estado y UI ---

    function showScreen(screenName) {
        const currentScreen = screens[state.currentScreen];
        const nextScreen = screens[screenName];
        
        if (currentScreen) {
            currentScreen.style.opacity = '0';
            setTimeout(() => {
                currentScreen.classList.add('hidden');
                nextScreen.classList.remove('hidden');
                nextScreen.style.opacity = '1';
                state.currentScreen = screenName;
            }, 400); // Coincide con la duración de la transición en CSS
        } else {
             Object.values(screens).forEach(screen => screen.classList.add('hidden'));
             nextScreen.classList.remove('hidden');
             nextScreen.style.opacity = '1';
             state.currentScreen = screenName;
        }
    }
    
    function addPlayerToList(player, index) {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-[var(--bg-main)] p-2 rounded-lg animate-fade-in-down';
        li.innerHTML = `
            <span>${player.name}</span>
            <button data-index="${index}" class="remove-player-btn text-gray-500 hover:text-[var(--role-impostor)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        `;
        playersList.appendChild(li);
    }

    function renderPlayers() {
        playersList.innerHTML = '';
        state.players.forEach((player, index) => {
            addPlayerToList(player, index);
        });
        updateImpostorCountOptions();
        validateGameStart();
        saveState();
    }

    function renderCategories() {
        categoriesContainer.innerHTML = '';
        Object.keys(wordCategories).forEach(category => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 cursor-pointer category-label';
            label.innerHTML = `
                <input type="checkbox" data-category="${category}" class="appearance-none w-5 h-5 bg-[var(--bg-main)] rounded-sm border border-gray-600 custom-checkbox transition-all">
                <span>${category}</span>
            `;
            categoriesContainer.appendChild(label);
        });
    }

    function validateGameStart() {
        const canStart = state.players.length >= 3 && state.players.length <= 12 && state.gameSettings.selectedCategories.size > 0;
        startGameBtn.disabled = !canStart;
    }

    function updateImpostorCountOptions() {
        const twoImpostorsOption = impostorCountSelect.querySelector('option[value="2"]');
        if (twoImpostorsOption) {
            twoImpostorsOption.disabled = state.players.length < 5;
            if (state.players.length < 5 && impostorCountSelect.value === "2") {
                impostorCountSelect.value = "1";
                state.gameSettings.impostorCount = 1;
            }
        }
    }

    // --- Lógica de Persistencia ---

    function saveState() {
        localStorage.setItem('imposterWhoPlayers', JSON.stringify(state.players));
    }

    function loadState() {
        try {
            const savedPlayers = localStorage.getItem('imposterWhoPlayers');
            if (savedPlayers) {
                const parsedPlayers = JSON.parse(savedPlayers);
                if (Array.isArray(parsedPlayers)) {
                    state.players = parsedPlayers.map(p => ({ name: p.name, wasImpostor: p.wasImpostor || false }));
                }
            }
        } catch (error) {
            console.error("Error al cargar el estado desde localStorage:", error);
            state.players = [];
        }
    }
    
    // --- Lógica de Temas ---
    function applyTheme(theme) {
        document.body.className = ''; // Limpiar clases de tema anteriores
        if (theme !== 'default') {
            document.body.classList.add(theme);
        }
        localStorage.setItem('imposterWhoTheme', theme);
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('imposterWhoTheme') || 'default';
        applyTheme(savedTheme);
    }

    // --- Lógica Principal del Juego (sin cambios) ---
    function startGame() {
        soundManager.playStartGame();
        const availableCategories = Array.from(state.gameSettings.selectedCategories);
        state.currentRound.category = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        const words = wordCategories[state.currentRound.category];
        state.currentRound.word = words[Math.floor(Math.random() * words.length)];
        state.currentRound.startingPlayer = state.players[Math.floor(Math.random() * state.players.length)];
        assignRoles();
        state.currentRound.currentPlayerIndex = 0;
        displayCurrentPlayerRole();
        showScreen('roleAssignment');
    }

    function assignRoles() {
        let playersToAssign = [...state.players];
        state.currentRound.assignments = [];
        state.players.forEach(p => p.wasImpostor = false);
        if (state.gameSettings.useTrollMode && Math.random() < 0.15) {
            playersToAssign.forEach(player => {
                state.currentRound.assignments.push({ player, role: 'Impostor', word: '???' });
                const p = state.players.find(p => p.name === player.name);
                if(p) p.wasImpostor = true;
            });
            saveState();
            return;
        }
        const impostors = selectWeightedPlayers(playersToAssign, state.gameSettings.impostorCount);
        impostors.forEach(impostor => {
            state.currentRound.assignments.push({ player: impostor, role: 'Impostor', word: '???' });
            const p = state.players.find(p => p.name === impostor.name);
            if(p) p.wasImpostor = true;
        });
        playersToAssign = playersToAssign.filter(p => !impostors.some(i => i.name === p.name));
        if (state.gameSettings.useSaboteurMode && playersToAssign.length > 0) {
            const saboteurIndex = Math.floor(Math.random() * playersToAssign.length);
            const saboteur = playersToAssign.splice(saboteurIndex, 1)[0];
            const possibleWords = wordCategories[state.currentRound.category].filter(w => w !== state.currentRound.word);
            const saboteurWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
            state.currentRound.assignments.push({ player: saboteur, role: 'Saboteador', word: saboteurWord });
        }
        if (state.gameSettings.useDetectiveMode && playersToAssign.length > 0) {
            const detectiveIndex = Math.floor(Math.random() * playersToAssign.length);
            const detective = playersToAssign.splice(detectiveIndex, 1)[0];
            state.currentRound.assignments.push({ player: detective, role: 'Detective', word: state.currentRound.word });
        }
        playersToAssign.forEach(player => {
            state.currentRound.assignments.push({ player, role: 'Inocente', word: state.currentRound.word });
        });
        state.currentRound.assignments.sort(() => Math.random() - 0.5);
        saveState();
    }

    function selectWeightedPlayers(players, count) {
        const selectedPlayers = [];
        let selectionPool = players.map(p => ({ player: p, weight: p.wasImpostor ? 1 : 3 }));
        for (let i = 0; i < count; i++) {
            const totalWeight = selectionPool.reduce((sum, p) => sum + p.weight, 0);
            if (totalWeight === 0) break;
            let randomTarget = Math.random() * totalWeight;
            let selectedIndex = -1;
            for (let j = 0; j < selectionPool.length; j++) {
                randomTarget -= selectionPool[j].weight;
                if (randomTarget < 0) { selectedIndex = j; break; }
            }
            if (selectedIndex !== -1) {
                selectedPlayers.push(selectionPool[selectedIndex].player);
                selectionPool.splice(selectedIndex, 1);
            }
        }
        return selectedPlayers;
    }

    function displayCurrentPlayerRole() {
        const assignment = state.currentRound.assignments[state.currentRound.currentPlayerIndex];
        if (!assignment) return;
        currentPlayerName.textContent = assignment.player.name;
        nextPlayerBtn.classList.add('hidden');
        hintButton.classList.add('hidden');
        let title = '', description = '';
        switch(assignment.role) {
            case 'Impostor':
                title = '🤫 ¡Eres IMPOSTOR!';
                description = 'Tu objetivo es descubrir la palabra secreta sin que te descubran.';
                if (state.currentRound.assignments.filter(a => a.role === 'Impostor').length > 1) {
                    soundManager.playRevealImpostor();
                }
                break;
            case 'Saboteador': title = '💣 ¡Eres SABOTEADOR!'; description = `Tu palabra es: <strong>${assignment.word}</strong>. Engaña a los demás.`; break;
            case 'Detective': title = '🕵️ ¡Eres DETECTIVE!'; description = `La palabra es: <strong>${assignment.word}</strong>. Descubre al impostor.`; break;
            default: title = '😇 Eres INOCENTE'; description = `La palabra es: <strong>${assignment.word}</strong>.`; break;
        }
        roleTitle.innerHTML = title;
        roleDescription.innerHTML = description;
        const isStartingPlayer = state.currentRound.startingPlayer.name === assignment.player.name;
        if (state.gameSettings.useImpostorHint && assignment.role === 'Impostor' && isStartingPlayer) {
            hintButton.classList.remove('hidden');
        }
    }

    function resetGame() {
        state.currentRound = { word: '', category: '', startingPlayer: null, assignments: [], currentPlayerIndex: 0 };
        validateGameStart();
        showScreen('setup');
    }

    // --- Manejadores de Eventos ---
    addPlayerBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        if (name && state.players.length < 12 && !state.players.some(p => p.name === name)) {
            soundManager.playAdd();
            const newPlayer = { name, wasImpostor: false };
            state.players.push(newPlayer);
            playerNameInput.value = '';
            addPlayerToList(newPlayer, state.players.length - 1); // Solo añade el nuevo
            updateImpostorCountOptions();
            validateGameStart();
            saveState();
        }
    });
    
    playersList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-player-btn')) {
            soundManager.playRemove();
            const index = parseInt(e.target.dataset.index, 10);
            state.players.splice(index, 1);
            renderPlayers(); // Re-render completo para actualizar índices
        }
    });

    roleCard.addEventListener('click', () => {
        if (roleCard.classList.contains('is-flipped')) return;
        soundManager.playCardFlip();
        roleCard.classList.add('is-flipped');
        if (state.currentRound.currentPlayerIndex < state.currentRound.assignments.length - 1) {
            nextPlayerBtn.textContent = 'Siguiente Jugador';
        } else {
            nextPlayerBtn.textContent = 'Empezar Partida';
        }
        nextPlayerBtn.classList.remove('hidden');
    });

    nextPlayerBtn.addEventListener('click', () => {
        soundManager.playClick();
        state.currentRound.currentPlayerIndex++;
        if (state.currentRound.currentPlayerIndex < state.currentRound.assignments.length) {
            roleCard.classList.remove('is-flipped');
            nextPlayerBtn.classList.add('hidden');
            setTimeout(() => { displayCurrentPlayerRole(); }, 400);
        } else {
            startingPlayerName.textContent = state.currentRound.startingPlayer.name;
            showScreen('inGame');
        }
    });

    revealRolesBtn.addEventListener('click', () => {
        soundManager.playClick();
        // Ocultar elementos para la animación
        revealWord.parentElement.style.opacity = '0';
        revealImpostorsContainer.style.opacity = '0';
        revealSaboteurContainer.style.opacity = '0';
        revealDetectiveContainer.style.opacity = '0';
        
        revealWord.textContent = state.currentRound.word;
        const impostors = state.currentRound.assignments.filter(a => a.role === 'Impostor');
        revealImpostorsList.innerHTML = impostors.map(a => `<li>${a.player.name}</li>`).join('');
        const saboteur = state.currentRound.assignments.find(a => a.role === 'Saboteador');
        if (saboteur) {
            revealSaboteur.textContent = `${saboteur.player.name} (Palabra: ${saboteur.word})`;
            revealSaboteurContainer.classList.remove('hidden');
        } else {
            revealSaboteurContainer.classList.add('hidden');
        }
        const detective = state.currentRound.assignments.find(a => a.role === 'Detective');
        if (detective) {
            revealDetective.textContent = detective.player.name;
            revealDetectiveContainer.classList.remove('hidden');
        } else {
            revealDetectiveContainer.classList.add('hidden');
        }
        
        showScreen('reveal');

        // Secuencia de revelación
        setTimeout(() => { revealWord.parentElement.style.transition = 'opacity 0.5s'; revealWord.parentElement.style.opacity = '1'; }, 500);
        setTimeout(() => { revealImpostorsContainer.style.transition = 'opacity 0.5s'; revealImpostorsContainer.style.opacity = '1'; }, 1000);
        if (saboteur) setTimeout(() => { revealSaboteurContainer.style.transition = 'opacity 0.5s'; revealSaboteurContainer.style.opacity = '1'; }, 1500);
        if (detective) setTimeout(() => { revealDetectiveContainer.style.transition = 'opacity 0.5s'; revealDetectiveContainer.style.opacity = '1'; }, 2000);
    });
    
    // Listeners de botones y toggles con sonido
    [startGameBtn, newGameBtn, playAgainBtn, toggleCategoriesBtn].forEach(btn => {
        btn.addEventListener('click', () => soundManager.playClick());
    });
    document.querySelectorAll('.category-checkbox, .custom-checkbox').forEach(cb => {
        cb.addEventListener('change', () => soundManager.playClick());
    });

    // Listeners del modal de temas
    settingsBtn.addEventListener('click', () => { soundManager.playClick(); themeModal.classList.remove('hidden'); });
    closeModalBtn.addEventListener('click', () => { soundManager.playClick(); themeModal.classList.add('hidden'); });
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            soundManager.playClick();
            applyTheme(button.dataset.theme);
        });
    });

    // --- Inicialización ---
    loadTheme();
    loadState();
    renderPlayers();
    renderCategories();
    validateGameStart();
    showScreen('setup');
    screens.setup.style.opacity = '1'; // Asegurar que la primera pantalla sea visible

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registrado'))
                .catch(err => console.error('Fallo en el registro del Service Worker:', err));
        });
    }

    // El resto de los listeners (keypress, select change, etc.) no necesitan cambios
    playerNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addPlayerBtn.click(); });
    impostorCountSelect.addEventListener('change', (e) => state.gameSettings.impostorCount = parseInt(e.target.value, 10));
    categoriesContainer.addEventListener('change', (e) => { if (e.target.classList.contains('category-checkbox')) { const category = e.target.dataset.category; if (e.target.checked) { state.gameSettings.selectedCategories.add(category); } else { state.gameSettings.selectedCategories.delete(category); } validateGameStart(); } });
    document.getElementById('impostor-hint-mode').addEventListener('change', e => state.gameSettings.useImpostorHint = e.target.checked);
    document.getElementById('troll-mode').addEventListener('change', e => state.gameSettings.useTrollMode = e.target.checked);
    document.getElementById('saboteur-mode').addEventListener('change', e => state.gameSettings.useSaboteurMode = e.target.checked);
    document.getElementById('detective-mode').addEventListener('change', e => state.gameSettings.useDetectiveMode = e.target.checked);
    newGameBtn.addEventListener('click', () => { state.players = []; localStorage.removeItem('imposterWhoPlayers'); resetGame(); renderPlayers(); });
    playAgainBtn.addEventListener('click', resetGame);
});
