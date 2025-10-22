import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const users = [
    {
      nome: 'TI Uprealiza',
      email: 'ti@uprealiza.com.br',
      senha: 'TIup123',
      role: 'admin'
    },
    {
      nome: 'Gabriel UPimoveis',
      email: 'gabriel@uprealiza.com',
      senha: 'UPimoveis123',
      role: 'user'
    }
  ]

  for (const u of users) {
    const hashed = await bcrypt.hash(u.senha, 10)
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {
        nome: u.nome,
        senha: hashed,
        role: u.role
      },
      create: {
        nome: u.nome,
        email: u.email,
        senha: hashed,
        role: u.role
      }
    })
    console.log(`Upserted user ${u.email}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
