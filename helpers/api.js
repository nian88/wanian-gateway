const axios = require('axios')
const url_gui = process.env.gui || 'http://app';
const sendToInbox = async (sender, message) =>{
    axios
        .post(url_gui+'/api/whatsapp/inbox', {
            'sender': sender,
            'message': message
        })
        .then(res => {
            // console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
}

module.exports = {
    sendToInbox
}