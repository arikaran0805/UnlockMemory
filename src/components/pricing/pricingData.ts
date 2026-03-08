export interface PricingCourse {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface PricingCareer {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  includedCourseIds: string[];
}

export const SAMPLE_COURSES: PricingCourse[] = [
  { id: "excel", name: "Excel", description: "Master spreadsheets, formulas, and data manipulation for business reporting.", price: 2000 },
  { id: "sql", name: "SQL", description: "Query databases, join tables, and extract insights from structured data.", price: 3000 },
  { id: "powerbi", name: "Power BI", description: "Build interactive dashboards and visual reports for stakeholders.", price: 4000 },
  { id: "python", name: "Python", description: "Learn programming fundamentals and data processing with Python.", price: 3500 },
  { id: "tableau", name: "Tableau", description: "Create stunning data visualizations and analytical dashboards.", price: 2500 },
  { id: "statistics", name: "Statistics", description: "Understand probability, distributions, and statistical inference.", price: 2000 },
  { id: "pandas", name: "Pandas for Analysis", description: "Wrangle and analyze data efficiently with the Pandas library.", price: 2200 },
  { id: "interview", name: "Interview Preparation", description: "Prepare for data and business analyst interviews with confidence.", price: 1500 },
];

export const SAMPLE_CAREERS: PricingCareer[] = [
  {
    id: "data-analyst",
    name: "Data Analyst Career",
    description: "Build core skills for reporting, dashboards, and business insights.",
    duration: "3 Months",
    icon: "BarChart3",
    includedCourseIds: ["excel", "sql", "powerbi"],
  },
  {
    id: "business-analyst",
    name: "Business Analyst Career",
    description: "Learn analysis, reporting, stakeholder thinking, and dashboard skills.",
    duration: "3 Months",
    icon: "Briefcase",
    includedCourseIds: ["excel", "sql", "interview"],
  },
  {
    id: "data-science",
    name: "Data Science Career",
    description: "Build analytical and machine learning foundations with practical tools.",
    duration: "5 Months",
    icon: "Brain",
    includedCourseIds: ["python", "statistics", "sql"],
  },
];

export const formatPrice = (amount: number): string => `₹${amount.toLocaleString("en-IN")}`;
