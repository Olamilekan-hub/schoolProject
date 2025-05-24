import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@school.edu',
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      employeeId: 'ADM001',
      department: 'IT Department',
      isActive: true,
    },
  })

  console.log('Created admin user:', admin)

  // Create sample course
  const course = await prisma.course.create({
    data: {
      courseCode: 'CSC101',
      courseTitle: 'Introduction to Computer Science',
      description: 'Basic concepts of computer science',
      teacherId: admin.id,
      creditUnits: 3,
      semester: 'FIRST',
      academicYear: '2024/2025',
    },
  })

  console.log('Created sample course:', course)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })