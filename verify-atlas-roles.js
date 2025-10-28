const mongoose = require('mongoose');
const { Role } = require('./src/models');

async function verifyRoles() {
    try {
        // Connect using the Atlas URI
        await mongoose.connect('mongodb+srv://apgoswamiinfo_db_user:laksgEvaawaZE2Wp@onlineexamination.awgplad.mongodb.net/online_exam_db?retryWrites=true&w=majority');
        
        console.log('Connected to MongoDB Atlas');
        console.log('Database:', mongoose.connection.db.databaseName);
        console.log('Host:', mongoose.connection.host);
        
        const roles = await Role.find().lean();
        console.log('\nRoles in database:');
        roles.forEach(role => {
            console.log(`- ${role.name} (${role.displayName})`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

verifyRoles();