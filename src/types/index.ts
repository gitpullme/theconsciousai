// Hospital type
export type Hospital = {
  id: string;
  name: string;
  state: string;
  city?: string;
  address?: string;
};

// Doctor type
export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  hospitalId: string;
  available: boolean;
  patientCount?: number;
};

// Appointment type
export type Appointment = {
  id: string;
  userId: string;
  hospitalId: string;
  doctorId?: string;
  symptoms: string;
  aiAnalysis?: string;
  severity?: number;
  status: AppointmentStatus;
  preferredDate: string;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
  hospital?: Hospital;
  doctor?: Doctor;
  user?: User;
};

export type User = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
};

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"; 