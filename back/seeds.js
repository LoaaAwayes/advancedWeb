const bcrypt = require('bcrypt'); // Use bcrypt instead of bcryptjs for consistency with previous steps
const mysql = require('mysql2/promise'); // Use mysql2/promise for async/await database operations

// Replace with your MySQL database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'task_managment', // Use the database name you created
};

async function createAdmin() {
  let connection; // Declare connection outside try block

  try {
    console.log('Starting admin creation process...');

    // Establish database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established.');

    // Check if admin with username 'ali' already exists
    const [existingUsers] = await connection.execute('SELECT id, password_hash FROM users WHERE username = ?', ['ali']);
    const existingAdmin = existingUsers[0];

    if (existingAdmin) {
      console.log('Admin  already exists.');

      // Check if the existing admin's password needs updating
      const passwordMatch = await bcrypt.compare('2003', existingAdmin.password_hash);

      if (!passwordMatch) {
         console.log('Admin password needs to be updated.');
         const hashedPassword = await bcrypt.hash('2003', 10);
         await connection.execute('UPDATE users SET password_hash = ?, role = ? WHERE username = ?', [hashedPassword, 'admin', 'ali']);
         console.log('Admin password and role updated successfully.');
      } else {
          console.log('Admin password is up to date.');
      }

    } else {
      console.log('Creating new admin user...');
      const hashedPassword = await bcrypt.hash('2003', 10);
      // We need to include all NOT NULL columns in the INSERT statement
      await connection.execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['ali', hashedPassword, 'admin'] // Add a placeholder email
      );
      console.log('Admin user created successfully.');
    }

    // Verify admin creation/existence
    const [adminRows] = await connection.execute('SELECT id, username, role FROM users WHERE username = ?', ['ali']);
    const admin = adminRows[0];
    console.log('Admin verification:', admin ? `Admin user found: ${JSON.stringify(admin)}` : 'Admin user not found');

  } catch (error) {
    console.error('Error in admin creation:', error);
  } finally {
    // Close the database connection
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

createAdmin();