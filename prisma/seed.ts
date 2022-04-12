import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

const users = [
  {
    id: 1,
    userName:  'avenger22',
    email: 'jurgenhasmeta@email.com',
    password: bcrypt.hashSync("jurgen123", 8)
  },
  {
    id: 2,
    userName:  'geri12',
    email: 'geri@email.com',
    password: bcrypt.hashSync("geri123", 8)  
  },
  {
    id: 3,
    userName:  'visard12',
    email: 'andrea@email.com',
    password: bcrypt.hashSync("visard123", 8)  
  },
  {
    id: 4,
    userName:  'marsel12',
    email: 'marsel@email.com',
    password: bcrypt.hashSync("marsel123", 8)  
  }
]

async function createStuff () {

    //@ts-ignore
    await prisma.user.deleteMany()
  
    for (const user of users) {
      await prisma.user.create({ data: user })
    }
  
}
  
createStuff()