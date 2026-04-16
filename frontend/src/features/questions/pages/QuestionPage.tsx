import React, { useState, useEffect } from 'react';
import { type Question } from '../types/question.types';
import { getAllQuestions, createQuestion, deleteQuestion, updateQuestion } from '../services/questionService';
import PageLayout from '../../../shared/components/PageLayout';
import QuestionTable from '../components/QuestionTable';
import QuestionForm from '../components/QuestionForm';
import { getUserProfile } from '../../user/services/userService';
import { Card, CardHeader, CardBody, Divider, Button } from "@heroui/react";

export default function QuestionPage() {
  // State variables
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const initialFormState: Question = { title: '', question: '', answer: '', difficulty: 'easy', category: '' };
  const [formData, setFormData] = useState<Question>(initialFormState);

  // Fetch API data 
  const fetchQuestions = async () => {
    try {
      const data = await getAllQuestions();
      setQuestions(data);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  }

  const fetchUserProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const userData = await getUserProfile();
      setIsAdmin(userData.isAdmin);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }

  useEffect(() => { 
    fetchQuestions();
    fetchUserProfile();
   }, []);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEditClick = (question: Question) => {
    if (!question._id) return;
    setFormData({ ...question });
    setEditingId(question._id);
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) await updateQuestion(editingId, formData);
      else await createQuestion(formData);

      setFormData(initialFormState);
      setEditingId(null);
      setIsAdding(false);
      fetchQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteQuestion(id);
      setQuestions(questions => questions.filter(q => q._id !== id));
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setIsAdding(false);
  };

  // Render the page
  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto w-full px-4 py-8">
        <Card className="shadow-sm border-none bg-white/90 backdrop-blur-sm">
          <CardHeader className="flex justify-between items-center px-8 py-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-800">
                {isAdding ? (editingId ? "Edit Question" : "Create New Question") : "Questions Bank"}
              </h1>
              <p className="text-small text-default-500">
                {isAdding ? "Update the details of your question" : "Browse and manage technical interview questions"}
              </p>
            </div>
            
            {!isAdding && isAdmin && (
              <Button 
                color="warning" 
                variant="bordered"
                className="text-black font-semibold hover: transition-all duration-200 hover:scale-105"
                onPress={() => setIsAdding(true)}
              >
                + Add New Question
              </Button>
            )}
          </CardHeader>

          <Divider />

          <CardBody className="px-8 py-8">
            {isAdding && isAdmin ? (
              <QuestionForm
                formData={formData}
                editingId={editingId}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            ) : (
              <QuestionTable
                questions={questions}
                isAdmin={isAdmin}
                onEdit={handleEditClick}
                onDelete={handleDelete}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </PageLayout>
  );
}
