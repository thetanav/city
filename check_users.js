import { PrismaClient } from './generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  })
  console.log('Users:', users)
  
  const tickets = await prisma.ticket.findMany({
    select: { id: true, userId: true, tierName: true }
  })
  console.log('Tickets:', tickets)
}

main().catch(console.error).finally(() => prisma.$disconnect())
