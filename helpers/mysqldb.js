const mysql = require('mysql2/promise');

const createConnection = async () => {
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: ''
    });
}

const isMember = async (phone) => {
    const connection = await createConnection();
    const [is_register] = await connection.execute('SELECT count(id) as is_member FROM members WHERE phone = ?', [phone]);
    if(is_register[0].is_member >= 1) return true;
    return false;
}

const getReply = async (keyword, phone) => {
    const connection = await createConnection();
    const [is_register] = await connection.execute('SELECT count(id) as is_member FROM members WHERE phone = ?', [phone]);
    if(is_register[0].is_member === 0){
        keyword = 'not_member';
    }
    const [rows] = await connection.execute('SELECT message FROM wa_replies WHERE keyword = ?', [keyword]);
    if (rows.length > 0) return rows[0].message;
    return false;
}

const setRegister = async (name, phone) => {
    console.log('register');
    const connection = await createConnection();
    const [member] = await connection.execute('insert into members (name, phone) values(?,?)', [name, phone]);
    const keyword = 'selamat_datang';
    const [rows] = await connection.execute('SELECT message FROM wa_replies WHERE keyword = ?', [keyword]);
    const reply = rows[0].message
    if (rows.length > 0) return reply.replace('/kodememberkamu/g', 'CLINK1');
    return false;
}




module.exports = {
    createConnection,
    getReply,
    isMember,
    setRegister
}