
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'EPMS_SUPER_SECRET_KEY_2026'

const users = [
    { id: 1, username: 'admin_pm', password: 'password123', role: 'Project Manager' },
    { id: 2, username: 'planner_user', password: 'password123', role: 'Planner' },
    { id: 3, username: 'cost_eng', password: 'password123', role: 'Cost Engineer' },
    { id: 4, username: 'site_eng', password: 'password123', role: 'Site Engineer' },
    { id: 5, username: 'mgmt_user', password: 'password123', role: 'Management' }
]

app.post('/api/login', (req, res) => {
    const { username, password } = req.body
    const user = users.find(u => u.username === username && u.password === password)

    if (user) {
        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '8h' }
        )
        return res.status(200).json({
            success: true,
            token: token,
            role: user.role,
            username: user.username
        })
    }
    res.status(401).json({ success: false, message: 'Invalid credentials.' })
})

app.listen(port, () => {
    console.log(`Server is currently running on port: ${port}`)
})