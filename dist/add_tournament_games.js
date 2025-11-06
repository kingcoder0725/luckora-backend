const mongoose = require('mongoose');
const config = require('../config.js');

// Connect to MongoDB
mongoose.connect(config.mongodb_url, { useNewUrlParser: true, useUnifiedTopology: true });

const TournamentGamesSchema = new mongoose.Schema({
    game_id: { type: String, required: true, unique: true },
    game_name: { type: String, required: true },
    vendor: { type: String, required: true },
    subtype: { type: String, required: true },
    status: { type: Boolean, default: true },
    description: { type: String, default: "Tournament/Promo game for accepting WIN transactions" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

const TournamentGames = mongoose.model('tournament_games', TournamentGamesSchema);

// Tournament/Promo games to add
const tournamentGames = [
    {
        game_id: '23259',
        game_name: 'PromoWins',
        vendor: 'pragmatic',
        subtype: 'TOURNAMENT',
        status: true,
        description: 'Tournament game for accepting WIN transactions from Pragmatic tournaments'
    },
    {
        game_id: '17299',
        game_name: 'Evoplay Bonus',
        vendor: 'evoplay',
        subtype: 'PROMO / TOURNAMENT',
        status: true,
        description: 'Tournament/Promo game for accepting WIN transactions from Evoplay tournaments'
    },
    {
        game_id: '11500',
        game_name: 'Awards',
        vendor: 'barbara-bang',
        subtype: 'PROMO',
        status: true,
        description: 'Promo game for accepting WIN transactions from Barbara Bang tournaments'
    }
];

async function addTournamentGames() {
    try {
        console.log('Starting to add tournament games to tournament_games table...');
        
        for (const game of tournamentGames) {
            const existingGame = await TournamentGames.findOne({ game_id: game.game_id });
            if (existingGame) {
                console.log(`Tournament game ${game.game_id} (${game.game_name}) already exists, updating...`);
                await TournamentGames.updateOne(
                    { game_id: game.game_id },
                    { $set: { ...game, updated_at: new Date() } }
                );
                console.log(`Updated tournament game ${game.game_id} successfully`);
            } else {
                console.log(`Adding new tournament game: ${game.game_id} - ${game.game_name}`);
                const newGame = await TournamentGames.create(game);
                console.log(`Created tournament game ${game.game_id} with ID: ${newGame._id}`);
            }
        }
        
        console.log('\n=== Tournament games added/updated successfully! ===');
        
        // Verify the games were created
        console.log('\n=== Verifying created tournament games ===');
        for (const gameId of ['23259', '17299', '11500']) {
            const game = await TournamentGames.findOne({ game_id: gameId });
            if (game) {
                console.log(`✓ Tournament Game ${gameId}: ${game.game_name} (${game.vendor}) - Subtype: ${game.subtype} - Status: ${game.status}`);
            } else {
                console.log(`✗ Tournament Game ${gameId}: NOT FOUND`);
            }
        }
        
        // Show all tournament games
        console.log('\n=== All Tournament Games ===');
        const allGames = await TournamentGames.find({}).sort({ game_id: 1 });
        allGames.forEach(game => {
            console.log(`- ${game.game_id}: ${game.game_name} (${game.vendor}) - ${game.subtype}`);
        });
        
    } catch (error) {
        console.error('Error adding tournament games:', error);
    } finally {
        mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

addTournamentGames();
