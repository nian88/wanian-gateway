const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const parsePhoneNumber = require('libphonenumber-js');

//
//const db = require('./helpers/mysqldb');
//const api = require('./helpers/api');
const port = process.env.PORT || 3000;
const host = process.env.HOST ||"0.0.0.0";

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
  },
  allowEIO3: true
});

var isReady = false;

app.use(express.json());
app.use(express.urlencoded({extended: true }));
app.use(fileUpload({debug: true }));

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
    restartOnAuthFail: true,
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
    authStrategy: new LocalAuth()
});

client.initialize();

//koneksi ke socket IO
io.on('connection', function(socket){
    socket.emit('message', 'connecting...');
    isReady = false;

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr,(err, url)=>{
            socket.emit('qr', url);
            socket.emit('message', 'Qrcode diterima');
        });
    });

    client.on('ready', () => {
        socket.emit('message', 'Whatsapp Is Ready');
        console.log('Ready');
        isReady = true;
    });

    client.on('authenticated', () => {
        socket.emit('authenticated', 'Whatsapp Is Authenticated');
        socket.emit('message', 'Whatsapp Is Authenticated');
        console.log('Authenticated');
    });

    client.on('auth_failure', msg => {
        isReady = false;
        console.error('AUTHENTICATION FAILURE', msg);
    });

    client.on('disconnected', (reason) => {
        socket.emit('message', 'Whatsapp is disconnected!');
        isReady = false;
        console.error('Disconnected', reason);
        client.destroy();
        client.initialize();
      });
});

const checkRegisteredNumber = async function(number) {
    return await client.isRegisteredUser(number);
}

//send message Text
app.post('/send-message',[
      body('number').notEmpty(),
      body('message').notEmpty(),
  ], async (req, res) => {

    if(!isReady){
        return res.status(422).json({
          status: false,
          message: 'Server Not Ready'
        });
    }

    const errors = validationResult(req).formatWith(({
        msg
      }) => {
        return msg;
      });

      if (!errors.isEmpty()) {
        return res.status(422).json({
          status: false,
          message: errors.mapped()
        });
      }

    const numberOnly = req.body.number.toString().replace(/\D/g, '');

    if(numberOnly.length < 1){
        return res.status(422).json({
          status: false,
          message: 'Number Not Valid'
        });
    }

    const phoneNumber = parsePhoneNumber(numberOnly, 'ID');

    if (!phoneNumber.isValid()){
        return res.status(422).json({
          status: false,
          message: 'Number Not Valid'
        });
    }

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
