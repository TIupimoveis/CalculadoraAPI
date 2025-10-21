import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

// Importar rotas
import calculoRoutes from './routes/calculo'
import clienteRoutes from './routes/cliente'
import usuarioRoutes from './routes/usuario'

const app = express()
const prisma = new PrismaClient()

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://calculdora-ten.vercel.app' // domínio do frontend Vercel
  ],
  credentials: true
}))
app.use(express.json())

// Middleware para disponibilizar o Prisma nas rotas
app.use((req: any, res, next) => {
  req.prisma = prisma
  next()
})

// Rotas
app.use('/api/calculos', calculoRoutes)
app.use('/api/clientes', clienteRoutes)
app.use('/api/usuarios', usuarioRoutes)

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Calculadora API funcionando!', 
    timestamp: new Date().toISOString() 
  })
})

// Tratamento de erros
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: 'Algo deu errado!', 
    message: err.message 
  })
})


// Exportar o app para Vercel Serverless Functions
export default app;
