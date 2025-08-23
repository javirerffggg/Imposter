document.addEventListener('DOMContentLoaded', () => {

    // Referencias a elementos del DOM
    const screens = {
        setup: document.getElementById('setup-screen'),
        roleAssignment: document.getElementById('role-assignment-screen'),
        inGame: document.getElementById('in-game-screen'),
        reveal: document.getElementById('reveal-screen'),
    };

    const playerNameInput = document.getElementById('player-name-input');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const playersList = document.getElementById('players-list');
    const impostorCountSelect = document.getElementById('impostor-count');
    const categoriesContainer = document.getElementById('categories-container');
    const toggleCategoriesBtn = document.getElementById('toggle-categories-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const currentPlayerName = document.getElementById('current-player-name');
    const roleCard = document.getElementById('role-card');
    const roleCardBack = document.getElementById('role-card-back');
    const roleTitle = document.getElementById('role-title');
    const roleDescription = document.getElementById('role-description');
    const hintButton = document.getElementById('hint-button');
    const nextPlayerBtn = document.getElementById('next-player-btn');
    const startingPlayerName = document.getElementById('starting-player-name');
    const revealRolesBtn = document.getElementById('reveal-roles-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const revealWord = document.getElementById('reveal-word');
    const revealImpostorsList = document.getElementById('reveal-impostors-list');
    const revealSaboteurContainer = document.getElementById('reveal-saboteur-container');
    const revealSaboteur = document.getElementById('reveal-saboteur');
    const revealDetectiveContainer = document.getElementById('reveal-detective-container');
    const revealDetective = document.getElementById('reveal-detective');
    const playAgainBtn = document.getElementById('play-again-btn');

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
            assignments: [], // { player, role, word }
            currentPlayerIndex: 0,
        },
        currentScreen: 'setup',
    };

    // --- Lógica de Gestión de Estado y UI ---

    /**
     * Cambia la pantalla visible en la aplicación.
     * @param {string} screenName - El nombre de la pantalla a mostrar ('setup', 'roleAssignment', 'inGame', 'reveal').
     */
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        screens[screenName].classList.remove('hidden');
        state.currentScreen = screenName;
    }

    /**
     * Renderiza la lista de jugadores en la pantalla de configuración.
     */
    function renderPlayers() {
        playersList.innerHTML = '';
        state.players.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-gray-700 p-2 rounded-md';
            li.innerHTML = `
                <span>${player.name}</span>
                <button data-index="${index}" class="remove-player-btn text-red-500 hover:text-red-400 font-bold text-lg">X</button>
            `;
            playersList.appendChild(li);
        });
        updateImpostorCountOptions();
        validateGameStart();
        saveState();
    }
    
    /**
     * Renderiza las checkboxes de categorías.
     */
    function renderCategories() {
        categoriesContainer.innerHTML = '';
        Object.keys(wordCategories).forEach(category => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 cursor-pointer text-sm';
            label.innerHTML = `
                <input type="checkbox" data-category="${category}" class="appearance-none w-4 h-4 bg-gray-700 rounded-sm border border-gray-600 custom-checkbox category-checkbox">
                <span>${category}</span>
            `;
            categoriesContainer.appendChild(label);
        });
    }

    /**
     * Actualiza el estado del botón "Asignar Roles" basado en las condiciones del juego.
     */
    function validateGameStart() {
        const canStart = state.players.length >= 3 && state.players.length <= 12 && state.gameSettings.selectedCategories.size > 0;
        startGameBtn.disabled = !canStart;
    }

    /**
     * Actualiza las opciones del selector de número de impostores.
     */
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

    /**
     * Guarda el estado de los jugadores en localStorage.
     */
    function saveState() {
        const stateToSave = {
            players: state.players,
        };
        localStorage.setItem('imposterWhoState', JSON.stringify(stateToSave));
    }

    /**
     * Carga el estado de los jugadores desde localStorage al iniciar.
     */
    function loadState() {
        try {
            const savedState = localStorage.getItem('imposterWhoState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                if (Array.isArray(parsedState.players)) {
                    state.players = parsedState.players.map(p => ({ name: p.name, wasImpostor: p.wasImpostor || false }));
                }
            }
        } catch (error) {
            console.error("Error al cargar el estado desde localStorage:", error);
            state.players = []; // Resetea a un estado seguro si hay un error
        }
    }


    // --- Lógica Principal del Juego ---

    /**
     * Inicia una nueva partida, asignando roles y palabras.
     */
    function startGame() {
        // 1. Seleccionar palabra y categoría
        const availableCategories = Array.from(state.gameSettings.selectedCategories);
        state.currentRound.category = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        const words = wordCategories[state.currentRound.category];
        state.currentRound.word = words[Math.floor(Math.random() * words.length)];

        // 2. Seleccionar jugador inicial
        state.currentRound.startingPlayer = state.players[Math.floor(Math.random() * state.players.length)];

        // 3. Asignar roles
        assignRoles();
        
        // 4. Iniciar la pantalla de asignación
        state.currentRound.currentPlayerIndex = 0;
        displayCurrentPlayerRole();
        showScreen('roleAssignment');
    }

    /**
     * Asigna los roles a los jugadores para la ronda actual.
     */
    function assignRoles() {
        let playersToAssign = [...state.players];
        state.currentRound.assignments = [];
        
        // Resetear wasImpostor para todos antes de la nueva asignación
        state.players.forEach(p => p.wasImpostor = false);

        // Modo Troll: 15% de probabilidad de que todos sean impostores
        if (state.gameSettings.useTrollMode && Math.random() < 0.15) {
            playersToAssign.forEach(player => {
                state.currentRound.assignments.push({ player, role: 'Impostor', word: '???' });
                const p = state.players.find(p => p.name === player.name);
                if(p) p.wasImpostor = true;
            });
            saveState();
            return;
        }

        // Asignación de Impostores (Ponderada)
        const impostors = selectWeightedPlayers(playersToAssign, state.gameSettings.impostorCount);
        impostors.forEach(impostor => {
            state.currentRound.assignments.push({ player: impostor, role: 'Impostor', word: '???' });
            const p = state.players.find(p => p.name === impostor.name);
            if(p) p.wasImpostor = true;
        });
        playersToAssign = playersToAssign.filter(p => !impostors.some(i => i.name === p.name));

        // Asignación de Saboteador
        if (state.gameSettings.useSaboteurMode && playersToAssign.length > 0) {
            const saboteurIndex = Math.floor(Math.random() * playersToAssign.length);
            const saboteur = playersToAssign.splice(saboteurIndex, 1)[0];
            const possibleWords = wordCategories[state.currentRound.category].filter(w => w !== state.currentRound.word);
            const saboteurWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
            state.currentRound.assignments.push({ player: saboteur, role: 'Saboteador', word: saboteurWord });
        }

        // Asignación de Detective
        if (state.gameSettings.useDetectiveMode && playersToAssign.length > 0) {
            const detectiveIndex = Math.floor(Math.random() * playersToAssign.length);
            const detective = playersToAssign.splice(detectiveIndex, 1)[0];
            state.currentRound.assignments.push({ player: detective, role: 'Detective', word: state.currentRound.word });
        }

        // Asignación de Inocentes
        playersToAssign.forEach(player => {
            state.currentRound.assignments.push({ player, role: 'Inocente', word: state.currentRound.word });
        });

        // Barajar las asignaciones para que el orden de revelación sea aleatorio
        state.currentRound.assignments.sort(() => Math.random() - 0.5);
        saveState();
    }

    /**
     * Selecciona jugadores usando un algoritmo ponderado.
     * @param {Array<Object>} players - Array de jugadores para seleccionar.
     * @param {number} count - Número de jugadores a seleccionar.
     * @returns {Array<Object>} - Array de jugadores seleccionados.
     */
    function selectWeightedPlayers(players, count) {
        const selectedPlayers = [];
        let selectionPool = players.map(p => ({
            player: p,
            weight: p.wasImpostor ? 1 : 3
        }));

        for (let i = 0; i < count; i++) {
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
        return selectedPlayers;
    }

    /**
     * Muestra la información del rol para el jugador actual en la pantalla de asignación.
     */
    function displayCurrentPlayerRole() {
        const assignment = state.currentRound.assignments[state.currentRound.currentPlayerIndex];
        if (!assignment) return;

        currentPlayerName.textContent = assignment.player.name;
        roleCard.classList.remove('is-flipped');
        nextPlayerBtn.classList.add('hidden');
        hintButton.classList.add('hidden');

        // Configurar la cara trasera de la tarjeta
        let title = '';
        let description = '';
        switch(assignment.role) {
            case 'Impostor':
                title = '🤫 ¡Eres IMPOSTOR!';
                description = 'Tu objetivo es descubrir la palabra secreta sin que te descubran.';
                break;
            case 'Saboteador':
                title = '💣 ¡Eres SABOTEADOR!';
                description = `Tu palabra es: <strong>${assignment.word}</strong>. Engaña a los demás.`;
                break;
            case 'Detective':
                title = '🕵️ ¡Eres DETECTIVE!';
                description = `La palabra es: <strong>${assignment.word}</strong>. Descubre al impostor.`;
                break;
            default: // Inocente
                title = '😇 Eres INOCENTE';
                description = `La palabra es: <strong>${assignment.word}</strong>.`;
                break;
        }
        roleTitle.innerHTML = title;
        roleDescription.innerHTML = description;

        // Lógica para el botón de pista
        const isStartingPlayer = state.currentRound.startingPlayer.name === assignment.player.name;
        if (state.gameSettings.useImpostorHint && assignment.role === 'Impostor' && isStartingPlayer) {
            hintButton.classList.remove('hidden');
        }
    }

    /**
     * Resetea el estado del juego para una nueva ronda, manteniendo los jugadores.
     */
    function resetGame() {
        state.currentRound = {
            word: '',
            category: '',
            startingPlayer: null,
            assignments: [],
            currentPlayerIndex: 0,
        };
        validateGameStart();
        showScreen('setup');
    }

    // --- Manejadores de Eventos ---
    
    addPlayerBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        if (name && state.players.length < 12 && !state.players.some(p => p.name === name)) {
            state.players.push({ name, wasImpostor: false });
            playerNameInput.value = '';
            renderPlayers();
        }
    });

    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPlayerBtn.click();
        }
    });

    playersList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-player-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            state.players.splice(index, 1);
            renderPlayers();
        }
    });

    impostorCountSelect.addEventListener('change', (e) => {
        state.gameSettings.impostorCount = parseInt(e.target.value, 10);
    });

    toggleCategoriesBtn.addEventListener('click', () => {
        const checkboxes = categoriesContainer.querySelectorAll('.category-checkbox');
        const allSelected = state.gameSettings.selectedCategories.size === Object.keys(wordCategories).length;
        
        checkboxes.forEach(cb => {
            cb.checked = !allSelected;
            const category = cb.dataset.category;
            if (!allSelected) {
                state.gameSettings.selectedCategories.add(category);
            } else {
                state.gameSettings.selectedCategories.delete(category);
            }
        });

        toggleCategoriesBtn.textContent = allSelected ? 'Seleccionar Todas' : 'Deseleccionar Todas';
        validateGameStart();
    });

    categoriesContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('category-checkbox')) {
            const category = e.target.dataset.category;
            if (e.target.checked) {
                state.gameSettings.selectedCategories.add(category);
            } else {
                state.gameSettings.selectedCategories.delete(category);
            }
            const allSelected = state.gameSettings.selectedCategories.size === Object.keys(wordCategories).length;
            toggleCategoriesBtn.textContent = allSelected ? 'Deseleccionar Todas' : 'Seleccionar Todas';
            validateGameStart();
        }
    });
    
    // Event listeners para modos especiales
    document.getElementById('impostor-hint-mode').addEventListener('change', e => state.gameSettings.useImpostorHint = e.target.checked);
    document.getElementById('troll-mode').addEventListener('change', e => state.gameSettings.useTrollMode = e.target.checked);
    document.getElementById('saboteur-mode').addEventListener('change', e => state.gameSettings.useSaboteurMode = e.target.checked);
    document.getElementById('detective-mode').addEventListener('change', e => state.gameSettings.useDetectiveMode = e.target.checked);

    startGameBtn.addEventListener('click', startGame);

    roleCard.addEventListener('click', () => {
        roleCard.classList.add('is-flipped');
        if (state.currentRound.currentPlayerIndex < state.currentRound.assignments.length - 1) {
            nextPlayerBtn.textContent = 'Siguiente Jugador';
        } else {
            nextPlayerBtn.textContent = 'Empezar Partida';
        }
        nextPlayerBtn.classList.remove('hidden');
    });
    
    hintButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que el clic voltee la tarjeta
        const possibleWords = wordCategories[state.currentRound.category].filter(w => w !== state.currentRound.word);
        const hintWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
        roleDescription.innerHTML += `<br><br><strong>Pista:</strong> Una palabra de la misma categoría es <strong>${hintWord}</strong>.`;
        hintButton.classList.add('hidden'); // Oculta el botón después de usarlo
    });

    nextPlayerBtn.addEventListener('click', () => {
        state.currentRound.currentPlayerIndex++;
        if (state.currentRound.currentPlayerIndex < state.currentRound.assignments.length) {
            displayCurrentPlayerRole();
        } else {
            startingPlayerName.textContent = state.currentRound.startingPlayer.name;
            showScreen('inGame');
        }
    });

    revealRolesBtn.addEventListener('click', () => {
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
    });

    newGameBtn.addEventListener('click', () => {
        // Reinicia todo, incluyendo la lista de jugadores
        state.players = [];
        localStorage.removeItem('imposterWhoState');
        resetGame();
        renderPlayers();
    });

    playAgainBtn.addEventListener('click', resetGame);

    // --- Inicialización ---
    loadState();
    renderPlayers();
    renderCategories();
    validateGameStart();
    showScreen('setup');

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registrado con éxito:', registration.scope);
                })
                .catch(error => {
                    console.error('Fallo en el registro del Service Worker:', error);
                });
        });
    }
});
