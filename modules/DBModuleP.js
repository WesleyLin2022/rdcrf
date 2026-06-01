const mysql = require('mysql2');

// 创建连接池，设置连接池的参数
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Root2023@',
  database: 'rdcrf',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

module.exports = pool.promise();