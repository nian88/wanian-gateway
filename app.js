const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { response } = require('express');
const fileUpload = require('express-fileupload');
const { phoneNumberFormatter } = require('./helpers/formatter');
const db = require('./helpers/mysqldb');
const api = require('./helpers/api');
const port = process.env.PORT || 3000;
const host = process.env.HOST ||"0.0.0.0";

const app = express();
const server = http.createServer(app);
// const io = socketIO(server);
const io = socketIO(server, {
  cors: {
    origin: '*',
  }
});

app.use(express.json());
app.use(express.urlencoded({extended: true }));
app.use(fileUpload({debug: true }));

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}


app.get('/', (req, res)=>{
    res.sendFile('index.html', {root: __dirname});
});


const client = new Client({
    puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // <- this one doesn't works in Windows
          '--disable-gpu'
        ],
    },
    session: sessionCfg
});


client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('message', async msg => {
    const phone = (await msg.getContact()).number;
    await api.sendToInbox(phone, msg.body);
});



client.initialize();

//koneksi ke socket IO
io.on('connection', function(socket){
    socket.emit('message', 'connecting...');

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr,(err, url)=>{
            socket.emit('qr', url);
            socket.emit('message', 'Qrcode diterima');
        });
    });

    client.on('authenticated', (session) => {

        socket.emit('authenticated', 'Whatsapp Is Authenticated');
        socket.emit('message', 'Whatsapp Is Authenticated');
        sessionCfg=session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });

    client.on('ready', () => {
        socket.emit('message', 'Whatsapp Is Ready');
        console.log('Ready');
    });
});

const checkRegisteredNumber = async function(number) {
    return await client.isRegisteredUser(number);
}

//send message Text
app.post('/send-message', async (req, res) => {
    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
        });
    }

    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

//send message Media
app.post('/send-media-local', async (req, res) => {
    const number = req.body.number + '@c.us';
    const message = req.body.message;
    const caption = req.body.caption;
    const fileUrl = req.body.url;
    //From Path
    // const media = MessageMedia.fromFilePath('./images.png');

    // From Upload
    // const file = req.files.file;
    // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);

    // From URL
    const attactment = await axios.get(fileUrl, { responseType: 'arraybuffer' }).then(response => {
        mimetype = response.headers['content-type'];
        return response.data.toString('base64');
    });
    const media = new MessageMedia(mimetype, attactment, 'Media');

    client.sendMessage(number, media, {caption: caption}).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});



server.listen(port, host, () =>
    console.log(`listening at http://${host}:${port}`)
);