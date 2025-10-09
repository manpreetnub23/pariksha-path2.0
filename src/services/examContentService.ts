import api from "@/utils/api";

export interface ExamInfoSection {
  id: string;
  header: string;
  content: string;
  order: number;
  is_active: boolean;
}

export interface ExamContent {
  exam_code: string;
  title: string;
  description: string;
  thumbnail_url?: string | null;
  banner_url?: string | null;
  exam_info_sections: ExamInfoSection[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getExamContentByCode(
  examCode: string
): Promise<ExamContent | null> {
  try {
    const response = await api.get(
      `/exam-contents/${encodeURIComponent(examCode)}`
    );

    if (response.status === 404) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching exam content:", error);
    throw error;
  }
}

export async function getAllExamContents(): Promise<ExamContent[]> {
  try {
    const response = await api.get(`/exam-contents/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching exam contents:", error);
    throw error;
  }
}
