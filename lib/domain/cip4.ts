export const cip4Options = [
  { code: "0901", label: "Communication and Media Studies" },
  { code: "0909", label: "Public Relations, Advertising, and Applied Communication" },
  { code: "1101", label: "Computer and Information Sciences, General" },
  { code: "1401", label: "Engineering, General" },
  { code: "1409", label: "Civil Engineering" },
  { code: "1410", label: "Electrical, Electronics and Communications Engineering" },
  { code: "1419", label: "Mechanical Engineering" },
  { code: "1905", label: "Foods, Nutrition, and Wellness Studies, General" },
  { code: "2201", label: "Law" },
  { code: "2301", label: "English Language and Literature, General" },
  { code: "2601", label: "Biology/Biological Sciences, General" },
  { code: "2701", label: "Mathematics" },
  { code: "3001", label: "Biological and Physical Sciences" },
  { code: "3801", label: "Philosophy and Religious Studies, General" },
  { code: "4201", label: "Psychology, General" },
  { code: "4501", label: "Social Sciences, General" },
  { code: "4506", label: "Economics" },
  { code: "4510", label: "Political Science and Government" },
  { code: "5004", label: "Design and Applied Arts" },
  { code: "5202", label: "Business Administration and Management, General" },
  { code: "5214", label: "Marketing/Marketing Management, General" },
  { code: "5401", label: "History" },
] as const;

export function getCip4Label(code: string) {
  return cip4Options.find((item) => item.code === code)?.label;
}

export function getCip4Labels(codes: string[]) {
  return codes.map((code) => getCip4Label(code) ?? code);
}
