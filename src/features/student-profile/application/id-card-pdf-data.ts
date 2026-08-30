export interface IdCardPdfData {
  rtl: boolean;
  centerName: string;
  studentName: string;
  studentPhone: string | null;
  className: string | null;
  enrolledDate: string | null;
  labels: {
    studentId: string;
    phone: string;
    class: string;
    enrolled: string;
  };
  studentId: string;
}
