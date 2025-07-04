const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection',(socket) => {
    console.log('New connection!')

    socket.on('join', ({username, room}, cb) => {
        const { error, user } = addUser({
            id: socket.id,
            username,
            room
        })

        if(error){
            return cb(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        cb()
    })

    socket.on('sendMessage', (msg, cb) => {
        const user = getUser(socket.id)

        const filter = new Filter()
        if(filter.isProfane(msg)){
            return cb('Profanity not allowed')
        }

        io.to(user.room).emit('message', generateMessage(user.username, msg))
        cb()
    })

    socket.on('sendLocation', (location, cb) => { 
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage',generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        cb()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message',generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server up on port ${port}`)
})