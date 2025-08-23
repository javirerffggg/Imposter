const achievements = {
    FIRST_IMPOSTOR_WIN: {
        name: "Primer Engaño",
        description: "Gana tu primera partida como Impostor.",
        check: (playerStats, isWinner, role) => role === 'Impostor' && isWinner && playerStats.winsAsImpostor === 1
    },
    JESTER_WIN: {
        name: "El Mundo Arde",
        description: "Gana una partida como el Bufón.",
        check: (playerStats, isWinner, role) => role === 'Bufón' && isWinner
    },
    MIME_MASTER: {
        name: "Maestro de la Mímica",
        description: "Forma parte del equipo ganador como el Mimo.",
        check: (playerStats, isWinner, role) => role === 'Mimo' && isWinner
    },
    PERFECT_GAME: {
        name: "Juego Perfecto",
        description: "Gana como Impostor sin que nadie te vote en la acusación final.",
        check: (playerStats, isWinner, role, context) => role === 'Impostor' && isWinner && context.votesAgainst === 0
    },
    FIVE_WINS: {
        name: "Veterano",
        description: "Gana 5 partidas en total.",
        check: (playerStats) => (playerStats.winsAsInnocent + playerStats.winsAsImpostor + playerStats.winsAsJester) === 5
    },
    CUSTOM_LIST_WIN: {
        name: "Conocimiento Propio",
        description: "Gana una partida usando una lista de palabras personalizada.",
        check: (playerStats, isWinner, role, context) => isWinner && context.isCustomCategory
    }
};
