// Replaces React Router's location state for one-off success messages on the list page.
export const STUDENT_NOTICES = {
  created: 'Tạo sinh viên mới thành công.',
  deleted: 'Đã xóa sinh viên.',
} as const;

export type StudentNotice = keyof typeof STUDENT_NOTICES;

export const NOTICE_PARAM = 'notice';

export const getStudentNotice = (value: string | null) =>
  value && Object.hasOwn(STUDENT_NOTICES, value) ? STUDENT_NOTICES[value as StudentNotice] : undefined;
