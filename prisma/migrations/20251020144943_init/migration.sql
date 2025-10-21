-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calculos" (
    "id" TEXT NOT NULL,
    "valorLocacao" DOUBLE PRECISION NOT NULL,
    "valorTaxas" DOUBLE PRECISION NOT NULL,
    "valorInicial" DOUBLE PRECISION NOT NULL,
    "valorOriginal" DOUBLE PRECISION NOT NULL,
    "valorComDesconto" DOUBLE PRECISION NOT NULL,
    "valorCorrigido" DOUBLE PRECISION NOT NULL,
    "taxaPoupanca" DOUBLE PRECISION NOT NULL DEFAULT 0.005,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "public"."clientes"("cpf");

-- AddForeignKey
ALTER TABLE "public"."calculos" ADD CONSTRAINT "calculos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calculos" ADD CONSTRAINT "calculos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
