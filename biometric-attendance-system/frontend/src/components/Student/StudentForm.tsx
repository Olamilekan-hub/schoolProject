// src/components/Student/StudentForm.tsx
import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

import type { Student, CreateStudentData } from "../../types/student";
import type { Course } from "../../types/course";
import { studentService } from "../../services/students";

import Modal from "../../components/UI/Modal";
import Input from "../../components/UI/Input";
import Select from "../../components/UI/Select";
import Button from "../../components/UI/Button";

const studentSchema = z.object({
  matricNumber: z.string().min(1, "Matric number is required"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  middleName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  dateOfBirth: z.string().optional(),
  level: z.string().default("100"),
  department: z.string().optional(),
  faculty: z.string().optional(),
  courseIds: z.array(z.string()).min(1, "At least one course is required"),
});

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  courses: Course[];
  onSuccess: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({
  isOpen,
  onClose,
  student,
  courses,
  onSuccess,
}) => {
  const isEditing = !!student;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStudentData>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? {
          matricNumber: student.matricNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName || "",
          email: student.email || "",
          phone: student.phone || "",
          gender: student.gender,
          dateOfBirth: student.dateOfBirth
            ? new Date(student.dateOfBirth).toISOString().split("T")[0]
            : "",
          level: student.level,
          department: student.department || "",
          faculty: student.faculty || "",
          courseIds: student.studentCourses?.map((sc) => sc.courseId) || [],
        }
      : {
          level: "100",
          courseIds: [],
        },
  });

  const onSubmit = async (data: CreateStudentData) => {
    try {
      if (isEditing) {
        await studentService.updateStudent({ ...data, id: student.id });
        toast.success("Student updated successfully!");
      } else {
        await studentService.createStudent(data);
        toast.success("Student created successfully!");
      }

      onSuccess();
      reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to save student");
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Edit Student" : "Add New Student"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Matric Number"
            placeholder="e.g., CSC/2021/001"
            {...register("matricNumber")}
            error={errors.matricNumber?.message}
            required
          />

          <Input
            label="First Name"
            placeholder="Enter first name"
            {...register("firstName")}
            error={errors.firstName?.message}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Last Name"
            placeholder="Enter last name"
            {...register("lastName")}
            error={errors.lastName?.message}
            required
          />

          <Input
            label="Middle Name"
            placeholder="Enter middle name (optional)"
            {...register("middleName")}
            error={errors.middleName?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="student@example.com"
            {...register("email")}
            error={errors.email?.message}
          />

          <Input
            label="Phone"
            type="tel"
            placeholder="+234 xxx xxx xxxx"
            {...register("phone")}
            error={errors.phone?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Gender"
            {...register("gender")}
            error={errors.gender?.message}
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>

          <Input
            label="Date of Birth"
            type="date"
            {...register("dateOfBirth")}
            error={errors.dateOfBirth?.message}
          />

          <Input
            label="Level"
            placeholder="100"
            {...register("level")}
            error={errors.level?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Department"
            placeholder="e.g., Computer Science"
            {...register("department")}
            error={errors.department?.message}
          />

          <Input
            label="Faculty"
            placeholder="e.g., Science"
            {...register("faculty")}
            error={errors.faculty?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Courses <span className="text-red-500">*</span>
          </label>
          <Controller
            name="courseIds"
            control={control}
            render={({ field }) => (
              <div className="space-y- max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {courses.map((course) => (
                  <label
                    key={course.id}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      value={course.id}
                      checked={field.value.includes(course.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange([...field.value, course.id]);
                        } else {
                          field.onChange(
                            field.value.filter((id) => id !== course.id)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">
                      {course.courseCode} - {course.courseTitle}
                    </span>
                  </label>
                ))}
              </div>
            )}
          />
          {errors.courseIds && (
            <p className="mt-1 text-sm text-red-600">
              {errors.courseIds.message}
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditing ? "Update Student" : "Add Student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentForm;
