export interface StudentBasicDetails {
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  nationality: string;
  religion: string;
  caste: string;
  category: string;
  bloodGroup: string;
  disability: string;
  idType: string;
  idNumber: string;
  motherTongue: string;
  birthPlace: string;
  annualIncome: number;
  usn: string;
  antiRaggingId: string;
}

export interface StudentCourseDetails {
  courseName: string;
  collegeName: string;
  admissionMode: string;
  batch: string;
  session: string;
  semester: string;
  specialization: string;
  sectionName: string;
  sectionId: number;
  admissionYear: number;
  regularLateral: number;
  dateOfAdmission: string;
  srNumber: string;
}

export interface StudentParentDetail {
  type: string;
  name: string;
  email: string;
  mobile: string;
  occupation: string;
}

export interface StudentAddress {
  type: string;
  address1: string;
  address2: string;
  state: number;
  pin: number;
}

export interface StudentBasicProfile {
  studentId: number;
  departmentId: number;
  basicDetails: StudentBasicDetails;
  courseDetails: StudentCourseDetails;
  parents: StudentParentDetail[];
  addresses: StudentAddress[];
}

export interface StudentAttendanceSummary {
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  attendancePct: number;
}

export type StudentFeeItem = Record<string, unknown>;
