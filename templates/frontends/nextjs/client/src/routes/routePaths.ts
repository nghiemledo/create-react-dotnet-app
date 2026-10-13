export const ROUTE_PATHS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
    },
    DASHBOARD: '/dashboard',
    STUDENTS: {
        LIST: '/students',
        CREATE: '/students/create',
        DETAIL: (id: string | number) => `/students/${id}`,
    },
    // Khai báo thêm các route nghiệp vụ khác tại đây (Teachers, Courses...)
};