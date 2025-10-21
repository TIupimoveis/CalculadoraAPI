import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const router = Router()

// Schema de validação para usuário
const usuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
})

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória')
})

// POST /api/usuarios/registro - Registrar novo usuário
router.post('/registro', async (req: any, res: any) => {
  try {
    const dados = usuarioSchema.parse(req.body)

    // Verificar se email já existe
    const usuarioExistente = await req.prisma.usuario.findUnique({
      where: { email: dados.email }
    })

    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Email já está sendo usado'
      })
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(dados.senha, 10)

    const usuario = await req.prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senha: senhaHash
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    // Gerar token JWT
    const token = jwt.sign(
      { userId: usuario.id, email: usuario.email },
      process.env.JWT_KEY!,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      data: { usuario, token },
      message: 'Usuário criado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    
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

// POST /api/usuarios/login - Fazer login
router.post('/login', async (req: any, res: any) => {
  try {
    const dados = loginSchema.parse(req.body)

    // Buscar usuário
    const usuario = await req.prisma.usuario.findUnique({
      where: { email: dados.email }
    })

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      })
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(dados.senha, usuario.senha)

    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      })
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: usuario.id, email: usuario.email },
      process.env.JWT_KEY!,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role
        },
        token
      },
      message: 'Login realizado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao fazer login:', error)
    
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

// Middleware de autenticação
const authMiddleware = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    
    const decoded = jwt.verify(token, process.env.JWT_KEY!) as any
    
    const usuario = await req.prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true
      }
    })

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      })
    }

    req.usuario = usuario
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    })
  }
}

// GET /api/usuarios/perfil - Obter perfil do usuário logado
router.get('/perfil', authMiddleware, async (req: any, res: any) => {
  try {
    res.json({
      success: true,
      data: req.usuario
    })
  } catch (error: any) {
    console.error('Erro ao buscar perfil:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

// Middleware para admin
const adminMiddleware = async (req: any, res: any, next: any) => {
  try {
    const usuario = await req.prisma.usuario.findUnique({
      where: { id: req.usuario.id }
    })

    if (!usuario || usuario.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar esta rota.'
      })
    }
    
    next()
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

// Schema para criação de usuário pelo admin
const usuarioAdminCreateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['admin', 'user']).default('user')
})

// Schema para atualização de usuário pelo admin
const usuarioAdminUpdateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.union([
    z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    z.literal('')
  ]).optional(),
  role: z.enum(['admin', 'user']).default('user')
})

// GET /api/usuarios - Listar todos os usuários (apenas admin)
router.get('/', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const usuarios = await req.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      success: true,
      data: usuarios
    })
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

// POST /api/usuarios - Criar usuário (apenas admin)
router.post('/', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const dados = usuarioAdminCreateSchema.parse(req.body)

    // Verificar se email já existe
    const usuarioExistente = await req.prisma.usuario.findUnique({
      where: { email: dados.email }
    })

    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Email já está sendo usado'
      })
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(dados.senha!, 10)

    const usuario = await req.prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senha: senhaHash,
        role: dados.role
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    res.status(201).json({
      success: true,
      data: usuario,
      message: 'Usuário criado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    
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

// PUT /api/usuarios/:id - Atualizar usuário (apenas admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const dados = usuarioAdminUpdateSchema.parse(req.body)

    // Verificar se usuário existe
    const usuarioExistente = await req.prisma.usuario.findUnique({
      where: { id }
    })

    if (!usuarioExistente) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      })
    }

    // Verificar se email já está sendo usado por outro usuário
    if (dados.email !== usuarioExistente.email) {
      const emailEmUso = await req.prisma.usuario.findUnique({
        where: { email: dados.email }
      })

      if (emailEmUso) {
        return res.status(400).json({
          success: false,
          message: 'Email já está sendo usado'
        })
      }
    }

    // Preparar dados para atualização
    const dadosAtualizacao: any = {
      nome: dados.nome,
      email: dados.email,
      role: dados.role
    }

    // Atualizar senha apenas se fornecida e não vazia
    if (dados.senha && dados.senha.trim() !== '') {
      dadosAtualizacao.senha = await bcrypt.hash(dados.senha, 10)
    }

    const usuario = await req.prisma.usuario.update({
      where: { id },
      data: dadosAtualizacao,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    res.json({
      success: true,
      data: usuario,
      message: 'Usuário atualizado com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    
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

// DELETE /api/usuarios/:id - Excluir usuário (apenas admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    // Verificar se usuário existe
    const usuario = await req.prisma.usuario.findUnique({
      where: { id }
    })

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      })
    }

    // Não permitir que admin exclua a si mesmo
    if (id === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode excluir sua própria conta'
      })
    }

    await req.prisma.usuario.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Usuário excluído com sucesso!'
    })
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    })
  }
})

export default router
export { authMiddleware }