import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from './usuario'

const router = Router()

// Schema de validação para criar um cálculo
const criarCalculoSchema = z.object({
  valorLocacao: z.number().positive('Valor da locação deve ser positivo'),
  valorTaxas: z.number().positive('Valor das taxas deve ser positivo'),
  cliente: z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    telefone: z.string().min(10, 'Telefone inválido'),
    cpf: z.string().min(11, 'CPF inválido'),
    email: z.string().email('Email inválido')
  }),
  taxaPoupanca: z.number().optional().default(0.005) // 0.5%
})

// POST /api/calculos - Criar novo cálculo
router.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const dados = criarCalculoSchema.parse(req.body)
    
    // Verificar se cliente já existe pelo CPF
    let cliente = await req.prisma.cliente.findUnique({
      where: { cpf: dados.cliente.cpf }
    })

    // Se não existe, criar novo cliente
    if (!cliente) {
      cliente = await req.prisma.cliente.create({
        data: dados.cliente
      })
    } else {
      // Se existe, atualizar dados do cliente
      cliente = await req.prisma.cliente.update({
        where: { cpf: dados.cliente.cpf },
        data: dados.cliente
      })
    }

    // Calcular valores
    const valorInicial = dados.valorLocacao + dados.valorTaxas
    const valorOriginal = valorInicial * 4
    const valorComDesconto = valorOriginal * 0.75
    const valorCorrigido = valorComDesconto * (1 + dados.taxaPoupanca)

    // Criar o cálculo associado ao usuário logado
    const calculo = await req.prisma.calculo.create({
      data: {
        valorLocacao: dados.valorLocacao,
        valorTaxas: dados.valorTaxas,
        valorInicial,
        valorOriginal,
        valorComDesconto,
        valorCorrigido,
        taxaPoupanca: dados.taxaPoupanca,
        clienteId: cliente.id,
        usuarioId: req.usuario.id // Associar ao usuário logado
      },
      include: {
        cliente: true
      }
    })

    res.status(201).json({
      success: true,
      data: calculo,
      message: 'Cálculo criado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao criar cálculo:', error)
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

// GET /api/calculos - Listar cálculos (filtrados por usuário se não for admin)
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, clienteId } = req.query

    // Admins veem todos os cálculos, usuários veem apenas os seus
    let where: any = clienteId ? { clienteId } : {}
    
    if (req.usuario.role !== 'admin') {
      where.usuarioId = req.usuario.id
    }

    const calculos = await req.prisma.calculo.findMany({
      where,
      include: {
        cliente: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    })

    const total = await req.prisma.calculo.count({ where })

    res.json({
      success: true,
      data: calculos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar cálculos:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

// GET /api/calculos/:id - Buscar cálculo por ID
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const calculo = await req.prisma.calculo.findUnique({
      where: { id },
      include: {
        cliente: true
      }
    })

    if (!calculo) {
      return res.status(404).json({
        success: false,
        message: 'Cálculo não encontrado'
      })
    }

    res.json({
      success: true,
      data: calculo
    })
  } catch (error: any) {
    console.error('Erro ao buscar cálculo:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

// DELETE /api/calculos/:id - Deletar cálculo
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const calculo = await req.prisma.calculo.findUnique({
      where: { id }
    })

    if (!calculo) {
      return res.status(404).json({
        success: false,
        message: 'Cálculo não encontrado'
      })
    }

    await req.prisma.calculo.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Cálculo deletado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao deletar cálculo:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

export default router