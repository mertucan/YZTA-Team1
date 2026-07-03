import StudentHealthFlags from "./pages/StudentHealthFlags";

export const studentHealthFlagsModule = {
  id: "student-health-flags",
  label: "Sağlık Bayrakları",
  icon: "⚕️",
  route: "/modules/student-health-flags",
  description: "Kronik rahatsızlığı olan öğrenciler için beslenme kısıtları",
  author: "Mert",
  component: StudentHealthFlags,
};
