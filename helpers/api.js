const axios = require('axios')

const sendToInbox = async (sender, message) =>{
    axios
        .post('http://localhost:8000/api/whatsapp/inbox', {
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