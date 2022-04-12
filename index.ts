// #region 'Importing and configuration of Prisma'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import 'dotenv/config'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

const app = express()
app.use(cors())
app.use(express.json())
// #endregion

app.get('/', async (req, res) => {
    res.send("Server Up and Running")
})
  
app.listen(4000, () => {
console.log(`Server up: http://localhost:4000`)
})