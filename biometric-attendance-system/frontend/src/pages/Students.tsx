// src/pages/Students.tsx
import React, { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Fingerprint,
  Mail,
  Phone,
} from "lucide-react";

import { useStudents } from "../hooks/useStudents";
import { useCourses } from "../hooks/useCourses";
import type {
  Student,
  CreateStudentData,
  Gender,
  StudentStatus,
} from "../types/student";
import type { Course } from "../types/course";

import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import Select from "../components/UI/Select";
import Table from "../components/UI/Table";
import Modal from "../components/UI/Modal";
import Card from "../components/UI/Card";
import Badge from "../components/UI/Badge";
import SearchInput from "../components/UI/SearchInput";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import BiometricEnrollment from "../components/Biometric/BiometricEnrollment";
import StudentForm from "../components/Student/StudentForm";

const Students: React.FC = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bulkActions, setBulkActions] = useState<string[]>([]);

  // Data fetching
  const {
    data: students,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useStudents({
    search: searchQuery,
    courseId: selectedCourse,
    status: selectedStatus as StudentStatus,
  });

  const { data: courses, isLoading: coursesLoading } = useCourses();

  // Table columns configuration
  const columns = [
    {
      key: "checkbox",
      header: "",
      width: "40px",
      render: (student: Student) => (
        <input
          type="checkbox"
          checked={bulkActions.includes(student.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setBulkActions([...bulkActions, student.id]);
            } else {
              setBulkActions(bulkActions.filter((id) => id !== student.id));
            }
          }}
          className="border-gray-300 rounded text-primary-600 focus:ring-primary-500"
        />
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (student: Student) => (
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-300 rounded-full">
            <span className="text-sm font-medium text-gray-700">
              {student.firstName[0]}
              {student.lastName[0]}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-sm text-gray-500">{student.matricNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (student: Student) => (
        <div className="space-y-1">
          {student.email && (
            <div className="flex items-center space-x-1">
              <Mail className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">{student.email}</span>
            </div>
          )}
          {student.phone && (
            <div className="flex items-center space-x-1">
              <Phone className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">{student.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "course",
      header: "Courses",
      render: (student: Student) => (
        <div className="space-y-1">
          {student.studentCourses?.slice(0, 2).map((sc) => (
            <Badge key={sc.id} variant="secondary" size="sm">
              {sc.course?.courseCode}
            </Badge>
          ))}
          {(student.studentCourses?.length || 0) > 2 && (
            <Badge variant="secondary" size="sm">
              +{(student.studentCourses?.length || 0) - 2} more
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "biometric",
      header: "Biometric",
      render: (student: Student) => (
        <div className="flex items-center space-x-2">
          <Fingerprint
            className={`h-4 w-4 ${
              student.biometricEnrolled ? "text-success-600" : "text-gray-400"
            }`}
          />
          <Badge
            variant={student.biometricEnrolled ? "success" : "error"}
            size="sm"
          >
            {student.biometricEnrolled ? "Enrolled" : "Not Enrolled"}
          </Badge>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (student: Student) => (
        <Badge
          variant={
            student.status === "ACTIVE"
              ? "success"
              : student.status === "INACTIVE"
                ? "warning"
                : "secondary"
          }
          size="sm"
        >
          {student.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (student: Student) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEditStudent(student)}
            className="text-primary-600 hover:text-primary-900"
            title="Edit Student"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleBiometricEnrollment(student)}
            className={`${
              student.biometricEnrolled
                ? "text-success-600 hover:text-success-900"
                : "text-warning-600 hover:text-warning-900"
            }`}
            title={
              student.biometricEnrolled
                ? "Update Biometric"
                : "Enroll Biometric"
            }
          >
            <Fingerprint className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleDeleteStudent(student)}
            className="text-red-600 hover:text-red-900"
            title="Delete Student"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Event handlers
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setShowAddModal(true);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowEditModal(true);
  };

  const handleBiometricEnrollment = (student: Student) => {
    setSelectedStudent(student);
    setShowBiometricModal(true);
  };

  const handleDeleteStudent = async (student: Student) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${student.firstName} ${student.lastName}?`
      )
    ) {
      // TODO: Implement delete functionality
      console.log("Delete student:", student.id);
    }
  };

  const handleBulkAction = (action: string) => {
    if (bulkActions.length === 0) return;

    switch (action) {
      case "delete":
        if (window.confirm(`Delete ${bulkActions.length} selected students?`)) {
          // TODO: Implement bulk delete
          console.log("Bulk delete:", bulkActions);
        }
        break;
      case "activate":
        // TODO: Implement bulk activate
        console.log("Bulk activate:", bulkActions);
        break;
      case "deactivate":
        // TODO: Implement bulk deactivate
        console.log("Bulk deactivate:", bulkActions);
        break;
    }
  };

  const handleExportStudents = () => {
    // TODO: Implement export functionality
    console.log("Export students");
  };

  const handleImportStudents = () => {
    // TODO: Implement import functionality
    console.log("Import students");
  };

  const filteredStudents = students || [];

  return (
    <div className="space-y- lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">
            Manage student records and biometric enrollment
          </p>
        </div>
        <Button
          onClick={handleAddStudent}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student</span>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-xl font-bold">{filteredStudents.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Fingerprint className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Biometric Enrolled</p>
              <p className="text-xl font-bold">
                {filteredStudents.filter((s) => s.biometricEnrolled).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <UserX className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Enrollment</p>
              <p className="text-xl font-bold">
                {filteredStudents.filter((s) => !s.biometricEnrolled).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Students</p>
              <p className="text-xl font-bold">
                {filteredStudents.filter((s) => s.status === "ACTIVE").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex flex-col space-y- sm:flex-row sm:space-y-0 sm:space-x-4">
            <SearchInput
              onSearch={setSearchQuery}
              placeholder="Search students..."
              className="w-full sm:w-64"
            />

            <Select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="">All Courses</option>
              {courses?.map((course: Course) => (
                <option key={course.id} value={course.id}>
                  {course.courseCode}
                </option>
              ))}
            </Select>

            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-32"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="GRADUATED">Graduated</option>
            </Select>
          </div>

          <div className="flex flex-wrap items-center space-x-2">
            {bulkActions.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {bulkActions.length} selected
                </span>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleBulkAction("activate")}
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => handleBulkAction("deactivate")}
                >
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="error"
                  onClick={() => handleBulkAction("delete")}
                >
                  Delete
                </Button>
              </div>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={handleImportStudents}
              className="flex items-center space-x-1"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportStudents}
              className="flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card className="overflow-hidden">
        <Table
          columns={columns}
          data={filteredStudents}
          loading={studentsLoading}
          emptyMessage="No students found. Add your first student to get started."
        />
      </Card>

      {/* Modals */}
      <StudentForm
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        courses={courses || []}
        onSuccess={() => {
          refetchStudents();
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedStudent(null);
        }}
      />

      {selectedStudent && (
        <BiometricEnrollment
          isOpen={showBiometricModal}
          onClose={() => {
            setShowBiometricModal(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          onEnrollmentComplete={(updatedStudent) => {
            refetchStudents();
            setShowBiometricModal(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default Students;
