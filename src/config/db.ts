import { PrismaClient } from '@prisma/client'

export { ApplicationStatus, AvailabilityStatus, Role } from '@prisma/client'

const prisma = new PrismaClient()

export default prisma
