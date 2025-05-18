const bcrypt = require('bcrypt'); 
const mysql = require('mysql2/promise'); 

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_managment',
};

async function createAdmin() {
  let connection; 

  try {
    console.log('Starting admin creation process...');

    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established.');

    const [existingUsers] = await connection.execute('SELECT id, password_hash FROM users WHERE username = ?', ['ali']);
    const existingAdmin = existingUsers[0];

    if (existingAdmin) {
      console.log('Admin  already exists.');

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
    
      await connection.execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['ali', hashedPassword, 'admin']
      );
      console.log('Admin user created successfully.');
    }

   
    const [adminRows] = await connection.execute('SELECT id, username, role FROM users WHERE username = ?', ['ali']);
    const admin = adminRows[0];
    console.log('Admin verification:', admin ? `Admin user found: ${JSON.stringify(admin)}` : 'Admin user not found');

  } catch (error) {
    console.error('Error in admin creation:', error);
  } finally {
   
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

createAdmin();