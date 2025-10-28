const mongoose = require('mongoose');
const { connectDB } = require('../database');
const { seedRoles } = require('./roleSeeder');

// Run seeders
const runSeeders = async () => {
    try {
        // Run role seeder
        await seedRoles();
        console.log('All seeders completed successfully');
    } catch (error) {
        console.error('Error running seeders:', error);
        throw error;
    }
};

// Run seeders if this file is run directly
if (require.main === module) {
    runSeeders()
        .then(() => {
            console.log('Database seeding completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Database seeding failed:', error);
            process.exit(1);
        });
}

module.exports = runSeeders;