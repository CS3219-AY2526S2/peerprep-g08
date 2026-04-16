export interface QuestionExample {
  input: string;
  output: string;
  explanation: string;
}

// ID is created by MongoDB, so it's optional when typing by crud
export interface Question {
  _id?: string; 
  title: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags?: string[];
  examples?: QuestionExample[];
}