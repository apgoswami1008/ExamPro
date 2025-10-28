const mongoose = require('mongoose');
const { Role } = require('../../models');
const { connectDB } = require('../database');

const defaultRoles = [
    {
        name: 'superadmin',
        displayName: 'Super Admin',
        description: 'Full system access',
        permissions: ['*'],
        isSystem: true
    },
    {
        name: 'admin',
        displayName: 'Administrator',
        description: 'System administrator with limited access',
        permissions: [
            'manage_users',
            'manage_courses',
            'manage_exams',
            'manage_questions',
            'view_reports',
            'manage_payments'
        ],
        isSystem: true
    },
    {
        name: 'instructor',
        displayName: 'Instructor',
        description: 'Can create and manage courses and exams',
        permissions: [
            'create_course',
            'edit_course',
            'create_exam',
            'edit_exam',
            'create_question',
            'edit_question',
            'view_results'
        ],
        isSystem: true
    },
    {
        name: 'user',
        displayName: 'Student',
        description: 'Regular user account',
        permissions: [
            'take_exam',
            'view_course',
            'view_profile',
            'edit_profile'
        ],
        isSystem: true
    }
];

const seedRoles = async () => {
    try {
        await connectDB();
        console.log('Connected to database:', mongoose.connection.db.databaseName);
        
        const beforeCount = await Role.countDocuments();
        console.log('Existing roles count:', beforeCount);
        
        await Role.deleteMany({});
        console.log('Cleared existing roles');

        const createdRoles = [];
        for (const roleData of defaultRoles) {
            try {
                const role = new Role(roleData);
                const savedRole = await role.save();
                createdRoles.push(savedRole);
                console.log('Created role:', savedRole.name);
            } catch (error) {
                console.error('Failed to create role:', roleData.name, error);
            }
        }

        const afterCount = await Role.countDocuments();
        console.log('\nRole creation summary:');
        console.log('- Expected roles:', defaultRoles.length);
        console.log('- Created roles:', createdRoles.length);
        console.log('- Total roles in database:', afterCount);

        const finalRoles = await Role.find().lean();
        console.log('\nVerification - All roles in database:');
        finalRoles.forEach(role => console.log('- ' + role.name));

    } catch (error) {
        console.error('Error seeding roles:', error);
        throw error;
    }
};

if (require.main === module) {
    seedRoles()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { seedRoles };
