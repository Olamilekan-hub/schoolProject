// src/scripts/seedCourses.ts - Seed Initial Courses
import { prisma } from "../config/database";
import { logger } from "../utils/logger";

const courses = [
  // Computer Science Courses
  {
    courseCode: "CSC101",
    courseTitle: "Introduction to Programming",
    description: "Basic programming concepts using Python",
    creditUnits: 3,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },
  {
    courseCode: "CSC201",
    courseTitle: "Data Structures and Algorithms",
    description: "Fundamental data structures and algorithmic analysis",
    creditUnits: 3,
    semester: "SECOND" as const,
    academicYear: "2024/2025",
  },
  {
    courseCode: "CSC301",
    courseTitle: "Database Management Systems",
    description: "Relational databases, SQL, and database design",
    creditUnits: 3,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },
  {
    courseCode: "CSC401",
    courseTitle: "Software Engineering",
    description: "Software development methodologies and project management",
    creditUnits: 4,
    semester: "SECOND" as const,
    academicYear: "2024/2025",
  },
  {
    courseCode: "CSC501",
    courseTitle: "Artificial Intelligence",
    description: "Machine learning, neural networks, and AI applications",
    creditUnits: 3,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },

  // Mathematics Courses
  {
    courseCode: "MTH101",
    courseTitle: "Calculus I",
    description: "Differential and integral calculus",
    creditUnits: 4,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },
  {
    courseCode: "MTH201",
    courseTitle: "Linear Algebra",
    description: "Matrices, vectors, and linear transformations",
    creditUnits: 3,
    semester: "SECOND" as const,
    academicYear: "2024/2025",
  },
  {
    courseCode: "MTH301",
    courseTitle: "Statistics and Probability",
    description: "Statistical analysis and probability theory",
    creditUnits: 3,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },

  // Physics Courses
  {
    courseCode: "PHY101",
    courseTitle: "General Physics I",
    description: "Mechanics, waves, and thermodynamics",
    creditUnits: 4,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },
  {
    courseCode: "PHY201",
    courseTitle: "General Physics II",
    description: "Electricity, magnetism, and optics",
    creditUnits: 4,
    semester: "SECOND" as const,
    academicYear: "2024/2025",
  },

  // English Courses
  {
    courseCode: "ENG101",
    courseTitle: "English Composition",
    description: "Academic writing and communication skills",
    creditUnits: 2,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },
  {
    courseCode: "ENG201",
    courseTitle: "Technical Writing",
    description: "Professional and technical communication",
    creditUnits: 2,
    semester: "SECOND" as const,
    academicYear: "2024/2025",
  },

  // Chemistry Courses
  {
    courseCode: "CHM101",
    courseTitle: "General Chemistry",
    description: "Basic principles of chemistry",
    creditUnits: 3,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },

  // Economics Courses
  {
    courseCode: "ECO101",
    courseTitle: "Principles of Economics",
    description: "Microeconomics and macroeconomics fundamentals",
    creditUnits: 3,
    semester: "SECOND" as const,
    academicYear: "2024/2025",
  },

  // General Studies
  {
    courseCode: "GNS101",
    courseTitle: "Critical Thinking",
    description: "Logic, reasoning, and analytical skills",
    creditUnits: 2,
    semester: "FIRST" as const,
    academicYear: "2024/2025",
  },
];

async function seedCourses() {
  try {
    logger.info("Starting course seeding...");

    // Create a temporary admin teacher for unassigned courses
    let tempTeacher = await prisma.user.findUnique({
      where: { email: "admin@system.local" },
    });

    if (!tempTeacher) {
      tempTeacher = await prisma.user.create({
        data: {
          email: "admin@system.local",
          passwordHash: "temp-hash", // This won't be used for login
          firstName: "System",
          lastName: "Administrator",
          role: "ADMIN",
          department: "Administration",
          employeeId: "SYS001",
          isActive: false, // Inactive so it can't be used to login
        },
      });
      logger.info("Created temporary system admin for course seeding");
    }

    const tempTeacherId = tempTeacher.id;

    for (const courseData of courses) {
      // Check if course already exists
      const existingCourse = await prisma.course.findUnique({
        where: { courseCode: courseData.courseCode },
      });

      if (!existingCourse) {
        await prisma.course.create({
          data: {
            ...courseData,
            teacherId: tempTeacherId, // Will be updated when actual teachers register
          },
        });
        logger.info(`Created course: ${courseData.courseCode} - ${courseData.courseTitle}`);
      } else {
        logger.info(`Course already exists: ${courseData.courseCode}`);
      }
    }

    logger.info(`Course seeding completed! ${courses.length} courses processed.`);
  } catch (error) {
    logger.error("Error seeding courses:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedCourses()
    .then(() => {
      console.log("✅ Course seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Course seeding failed:", error);
      process.exit(1);
    });
}

export { seedCourses };