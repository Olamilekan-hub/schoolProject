// src/pages/Register.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, Fingerprint } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import MultiSelect from "../components/UI/MultiSelect";
import AddCourseModal from "../components/Courses/AddCourseModal";
import { coursesService } from "../services/courses";
import type { RegisterData } from "../types/auth";
import type { Option } from "../components/UI/MultiSelect";

const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    department: z.string().min(2, "Department is required"),
    employeeId: z.string().optional(),
    registrationKey: z.string().min(1, "Registration key is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Option[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const { register: registerUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load available courses
  useEffect(() => {
    const loadCourses = async () => {
      setLoadingCourses(true);
      try {
        const courses = await coursesService.getAllCourses();
        setAvailableCourses(courses);
      } catch (error) {
        console.error("Failed to load courses:", error);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  const handleAddCourse = (newCourse: Option) => {
    setAvailableCourses(prev => [...prev, newCourse]);
    setSelectedCourses(prev => [...prev, newCourse.value]);
    setShowAddCourseModal(false);
  };

  const onSubmit = async (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;

    const response = await registerUser({
      ...registerData,
      courses: selectedCourses,
    } as RegisterData);

    if (response.success) {
      navigate("/dashboard", { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <Fingerprint className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Register as a teacher to manage attendance
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                placeholder="First name"
                {...register("firstName")}
                error={errors.firstName?.message}
                autoComplete="given-name"
                autoFocus
              />

              <Input
                label="Last Name"
                type="text"
                placeholder="Last name"
                {...register("lastName")}
                error={errors.lastName?.message}
                autoComplete="family-name"
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              {...register("email")}
              error={errors.email?.message}
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register("password")}
                error={errors.password?.message}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="Enter your phone number"
              {...register("phone")}
              error={errors.phone?.message}
              autoComplete="tel"
            />

            <Input
              label="Department"
              type="text"
              placeholder="e.g., Computer Science"
              {...register("department")}
              error={errors.department?.message}
            />

            <Input
              label="Employee ID (Optional)"
              type="text"
              placeholder="Enter your employee ID"
              {...register("employeeId")}
              error={errors.employeeId?.message}
            />

            <Input
              label="Registration Key"
              type="text"
              placeholder="Enter registration key"
              {...register("registrationKey")}
              error={errors.registrationKey?.message}
              helperText="Contact your administrator for the registration key"
            />

            <MultiSelect
              label="Courses You'll Teach"
              placeholder="Select courses you will teach..."
              options={availableCourses}
              selectedValues={selectedCourses}
              onChange={setSelectedCourses}
              onAddNew={() => setShowAddCourseModal(true)}
              disabled={loadingCourses}
              className="mb-4"
            />

            {loadingCourses && (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-gray-600">Loading courses...</span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
            className="group relative flex justify-center"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <UserPlus className="h-5 w-5 text-primary-500 group-hover:text-primary-400" />
            </span>
            Create Account
          </Button>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign in here
              </Link>
            </span>
          </div>
        </form>
      </div>

      {/* Add Course Modal */}
      <AddCourseModal
        isOpen={showAddCourseModal}
        onClose={() => setShowAddCourseModal(false)}
        onCourseAdded={handleAddCourse}
      />
    </div>
  );
};

export default Register;
