"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";
import api from "@/utils/api";

interface ExamInfoSection {
  id: string;
  header: string;
  content: string;
}

interface ExamContent {
  exam_code: string;
  title: string;
  description: string;
  linked_course_id: string;
  thumbnail_url?: string | null;
  banner_url?: string | null;
  exam_info_sections: ExamInfoSection[];
}

export default function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ examName: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ unwrap params (since it's a promise in Next.js 15+)
  const resolvedParams = use(params);
  const examNameRaw = resolvedParams.examName;

  const action = searchParams.get("action") || "add";

  const examName = examNameRaw
    ? decodeURIComponent(examNameRaw).replace(/-/g, " ")
    : "Unknown Exam";

  const [examContent, setExamContent] = useState<ExamContent>({
    exam_code: examNameRaw || "",
    title: examName,
    description: "",
    linked_course_id: "dummy-course-id", // TODO: replace with real course id
    thumbnail_url: null,
    banner_url: null,
    exam_info_sections: [
      {
        id: uuidv4(),
        header: "Syllabus",
        content: "Maths, Reasoning, GK, English...",
      },
      {
        id: uuidv4(),
        header: "Exam Pattern",
        content: "Tier 1, Tier 2, descriptive etc...",
      },
    ],
  });

  const [debugInfo, setDebugInfo] = useState<string>("");

  const [newSectionHeader, setNewSectionHeader] = useState<string>("");
  const [newSectionContent, setNewSectionContent] = useState<string>("");

  useEffect(() => {
    const actionFromUrl = searchParams.get("action") || "add";
    console.log("🔍 Debug Info:", {
      examNameRaw,
      actionFromUrl,
      examContent: {
        exam_code: examContent.exam_code,
        title: examContent.title,
        description: examContent.description,
        linked_course_id: examContent.linked_course_id
      }
    });
    setDebugInfo(`Action: ${actionFromUrl}, Exam Code: ${examNameRaw}, Mode: ${actionFromUrl === "edit" ? "EDIT" : "ADD"}`);

    // Force re-render to ensure debug info is updated
    setDebugInfo(prev => `${prev} | Updated: ${Date.now()}`);
  }, [examNameRaw, searchParams, examContent]);

  useEffect(() => {
    if (action === "edit") {
      api
        .get(`/exam-contents/${encodeURIComponent(examNameRaw)}`)
        .then((response) => {
          const data = response.data;
          setExamContent({
            exam_code: data.exam_code || examNameRaw,
            title: data.title || examName,
            description: data.description || "",
            linked_course_id: data.linked_course_id || "dummy-course-id",
            thumbnail_url: data.thumbnail_url || null,
            banner_url: data.banner_url || null,
            exam_info_sections: data.exam_info_sections || [],
          });
        })
        .catch((error) => {
          console.error("Error fetching exam content:", error);
        });
    }
  }, [examNameRaw, action, examName]);

  const addSection = () => {
    if (!newSectionHeader.trim() && !newSectionContent.trim()) return;

    setExamContent((prev: ExamContent) => ({
      ...prev,
      exam_info_sections: [
        ...prev.exam_info_sections,
        {
          id: uuidv4(),
          header: newSectionHeader.trim(),
          content: newSectionContent.trim(),
        },
      ],
    }));

    setNewSectionHeader("");
    setNewSectionContent("");
  };

  const removeSection = (id: string) => {
    setExamContent((prev: ExamContent) => ({
      ...prev,
      exam_info_sections: prev.exam_info_sections.filter((s: ExamInfoSection) => s.id !== id),
    }));
  };

  const saveContent = async () => {
    // Validate required fields before sending
    if (!examContent.title.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!examContent.description || !examContent.description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (!examContent.linked_course_id || !examContent.linked_course_id.trim()) {
      alert("Please enter a linked course ID");
      return;
    }

    // Ensure we're using the correct exam_code for the URL
    const examCodeForUrl = examContent.exam_code || examNameRaw;
    const url =
      action === "edit"
        ? `/exam-contents/${encodeURIComponent(examCodeForUrl)}`
        : `/exam-contents/`;

    console.log("🔍 Action Detection:", {
      action,
      examNameRaw,
      examCodeForUrl,
      url,
      isEditMode: action === "edit"
    });

    // Double-check the action detection
    if (action !== "edit" && action !== "add") {
      console.warn("⚠️ Unexpected action value:", action);
      alert(`Unexpected action: ${action}. Please refresh the page and try again.`);
      return;
    }

    // Prepare data for backend - ensure all fields are properly formatted
    const dataToSend = {
      exam_code: examCodeForUrl,
      title: examContent.title.trim(),
      description: examContent.description.trim(),
      linked_course_id: examContent.linked_course_id.trim(),
      thumbnail_url: examContent.thumbnail_url || null,
      banner_url: examContent.banner_url || null,
      exam_info_sections: examContent.exam_info_sections.map((section: ExamInfoSection) => ({
        id: section.id,
        header: section.header.trim(),
        content: section.content.trim(),
        order: 0,
        is_active: true
      }))
    };

    try {
      console.log("📤 Sending payload:", dataToSend);
      console.log("📤 HTTP Method:", action === "edit" ? "PUT" : "POST");

      const response =
        action === "edit"
          ? await api.put(url, dataToSend)
          : await api.post(url, dataToSend);

      console.log("✅ Response received:", response.status, response.data);
      alert("Content saved successfully!");
      router.push("/admin/add-content");
    } catch (error: any) {
      console.error("❌ Error saving content:", error);
      console.error("❌ Error response:", error.response?.data);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to save content. Please try again.";
      alert(`Failed to save content: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div className="max-w-5xl mx-auto p-6 w-full flex-1">
        <h1 className="text-3xl font-bold mb-6 text-green-900">
          {action === "edit" ? "Edit" : "Add"} Content for {examContent.title}
        </h1>

        {/* Debug Info */}
        <div className="mb-4 p-2 bg-gray-100 rounded text-sm">
          <strong>Debug:</strong> {debugInfo}
        </div>

        {/* Title */}
        <input
          type="text"
          placeholder="Exam Title"
          value={examContent.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setExamContent((prev: ExamContent) => ({ ...prev, title: e.target.value }))
          }
          className="border px-3 py-2 rounded w-full mb-3"
        />

        {/* Description */}
        <textarea
          placeholder="Exam Description"
          value={examContent.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setExamContent((prev: ExamContent) => ({ ...prev, description: e.target.value }))
          }
          className="border px-3 py-2 rounded w-full mb-6 resize-none"
        />

        {/* Linked Course */}
        <input
          type="text"
          placeholder="Linked Course ID"
          value={examContent.linked_course_id}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setExamContent((prev: ExamContent) => ({
              ...prev,
              linked_course_id: e.target.value,
            }))
          }
          className="border px-3 py-2 rounded w-full mb-6"
        />

        {/* Thumbnail URL */}
        <input
          type="url"
          placeholder="Thumbnail URL (optional)"
          value={examContent.thumbnail_url || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setExamContent((prev: ExamContent) => ({
              ...prev,
              thumbnail_url: e.target.value || null,
            }))
          }
          className="border px-3 py-2 rounded w-full mb-6"
        />

        {/* Banner URL */}
        <input
          type="url"
          placeholder="Banner URL (optional)"
          value={examContent.banner_url || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setExamContent((prev: ExamContent) => ({
              ...prev,
              banner_url: e.target.value || null,
            }))
          }
          className="border px-3 py-2 rounded w-full mb-6"
        />

        {/* Add New Section */}
        <div className="mb-6 flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0">
          <input
            type="text"
            placeholder="Section Header"
            value={newSectionHeader}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSectionHeader(e.target.value)}
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <textarea
            placeholder="Section Content"
            value={newSectionContent}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSectionContent(e.target.value)}
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <button
            onClick={addSection}
            className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition cursor-pointer"
          >
            Add Section
          </button>
        </div>

        {/* Section List */}
        <div className="space-y-4">
          {examContent.exam_info_sections.map((section: ExamInfoSection) => (
            <motion.div
              key={section.id}
              whileHover={{ scale: 1.02 }}
              className="bg-gray-100 p-4 rounded shadow-md flex flex-col md:flex-row md:justify-between"
            >
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={section.header}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setExamContent((prev: ExamContent) => ({
                      ...prev,
                      exam_info_sections: prev.exam_info_sections.map((s: ExamInfoSection) =>
                        s.id === section.id
                          ? { ...s, header: e.target.value }
                          : s
                      ),
                    }));
                  }}
                  className="w-full border px-3 py-2 rounded"
                />
                <textarea
                  value={section.content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    setExamContent((prev: ExamContent) => ({
                      ...prev,
                      exam_info_sections: prev.exam_info_sections.map((s: ExamInfoSection) =>
                        s.id === section.id
                          ? { ...s, content: e.target.value }
                          : s
                      ),
                    }));
                  }}
                  className="w-full border px-3 py-2 rounded resize-none"
                />
              </div>
              <div className="flex items-start mt-2 md:mt-0 md:ml-4">
                <button
                  onClick={() => removeSection(section.id)}
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveContent}
            className="bg-[#2E4A3C] text-white px-6 py-2 rounded hover:bg-[#1a2821] transition cursor-pointer"
          >
            Save Content
          </button>
        </div>
      </div>
    </div>
  );
}
