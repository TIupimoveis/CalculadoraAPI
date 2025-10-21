import { Router } from 'express'
import { z } from 'zod'

const router = Router()

// Schema de validação para cliente
const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().min(11, 'CPF inválido'),
  email: z.string().email('Email inválido')
})

// GET /api/clientes - Listar todos os clientes
router.get('/', async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, search } = req.query

    const where = search ? {
      OR: [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } }
      ]
    } : {}

    const clientes = await req.prisma.cliente.findMany({
      where,
      include: {
        _count: {
          select: { calculos: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    })

    const total = await req.prisma.cliente.count({ where })

    res.json({
      success: true,
      data: clientes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar clientes:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

// GET /api/clientes/:id - Buscar cliente por ID
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params

    const cliente = await req.prisma.cliente.findUnique({
      where: { id },
      include: {
        calculos: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      })
    }

    res.json({
      success: true,
      data: cliente
    })
  } catch (error: any) {
    console.error('Erro ao buscar cliente:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

// POST /api/clientes - Criar novo cliente
router.post('/', async (req: any, res: any) => {
  try {
    const dados = clienteSchema.parse(req.body)

    // Verificar se CPF já existe
    const clienteExistente = await req.prisma.cliente.findUnique({
      where: { cpf: dados.cpf }
    })

    if (clienteExistente) {
      return res.status(400).json({
        success: false,
        message: 'Cliente com este CPF já existe'
      })
    }

    const cliente = await req.prisma.cliente.create({
      data: dados
    })

    res.status(201).json({
      success: true,
      data: cliente,
      message: 'Cliente criado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error)
    
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

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params
    const dados = clienteSchema.parse(req.body)

    const cliente = await req.prisma.cliente.findUnique({
      where: { id }
    })

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      })
    }

    // Verificar se CPF já existe em outro cliente
    if (dados.cpf !== cliente.cpf) {
      const clienteComCpf = await req.prisma.cliente.findUnique({
        where: { cpf: dados.cpf }
      })

      if (clienteComCpf) {
        return res.status(400).json({
          success: false,
          message: 'CPF já está sendo usado por outro cliente'
        })
      }
    }

    const clienteAtualizado = await req.prisma.cliente.update({
      where: { id },
      data: dados
    })

    res.json({
      success: true,
      data: clienteAtualizado,
      message: 'Cliente atualizado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error)
    
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

// DELETE /api/clientes/:id - Deletar cliente
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params

    const cliente = await req.prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: {
          select: { calculos: true }
        }
      }
    })

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      })
    }

    if (cliente._count.calculos > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar cliente que possui cálculos'
      })
    }

    await req.prisma.cliente.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Cliente deletado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao deletar cliente:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

export default router