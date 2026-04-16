import axios from 'axios';
import { type Question } from '../types/question.types.ts';


const API_URL = 'http://localhost:8080/api/questions'; 

export const getAllQuestions = async (): Promise<Question[]> => {
    try {
        const response = await axios.get(API_URL);
        return response.data;
    } catch (error) {
        console.error("Error fetching questions:", error);
        throw error;
    }
};

export const createQuestion = async (questionData: Question): Promise<Question> => {
    try {
        const response = await axios.post(API_URL, questionData);
        return response.data;
    } catch (error) {
        console.error("Error creating question:", error);
        throw error;
    }
};

export const updateQuestion = async (id: string, questionData: Question): Promise<Question> => {
    try {
        const response = await axios.put(`${API_URL}/${id}`, questionData);
        return response.data;
    } catch (error) {
        console.error("Error updating question:", error);
        throw error;
    }
};

export const deleteQuestion = async (id: string): Promise<void> => {
    try {
        await axios.delete(`${API_URL}/${id}`);
    } catch (error) {
        console.error("Error deleting question:", error);
        throw error;
    }
};