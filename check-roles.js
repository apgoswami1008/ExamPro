const mongoose = require('mongoose');
const { Role } = require('./src/models');
const { connectDB } = require('./src/config/database');

async function checkRoles() {
    try {
        await connectDB();
        const roles = await Role.find().lean();
        console.log('Found roles:');
        roles.forEach(role => {
            console.log({
                name: role.name,
                displayName: role.displayName,
                _id: role._id.toString(),
                isSystem: role.isSystem
            });
        });

        const userRole = await Role.findOne({ name: 'user' });
        console.log('\nSpecifically searching for user role:');
        console.log(userRole ? {
            name: userRole.name,
            displayName: userRole.displayName,
            _id: userRole._id.toString(),
            isSystem: userRole.isSystem
        } : 'No user role found');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.connection.close();
    }
}

checkRoles();
