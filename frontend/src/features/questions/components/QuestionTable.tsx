
import { type Question } from '../types/question.types';
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Chip
} from "@heroui/react";

interface QuestionTableProps {
  questions: Question[];
  isAdmin: boolean;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
}

const difficultyColor: Record<string, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

// Define the columns for the table
const allColumns = [
  {name: "TITLE", uid: "title"},
  {name: "TOPIC", uid: "category"},
  {name: "DIFFICULTY", uid: "difficulty"},
  {name: "ACTIONS", uid: "actions"},
]

// Function to render cell content based on column key
const renderCell = (question: Question, columnKey: string, onEdit: (question: Question) => void, onDelete: (id: string) => void) => {
  switch (columnKey) {
    case "title":
      return question.title;
    case "category":
      return (
        <Chip className="capitalize">
          {question.category}
        </Chip>
      );
    case "difficulty":
      return (
        <Chip color={difficultyColor[question.difficulty] ?? "default"} variant="flat" size="sm" className="capitalize">
          {question.difficulty}
        </Chip>
      );
    case "actions":
      return (
        <div className="flex gap-3 justify-center items-center">
          <Button 
            size="sm" 
            variant="flat" 
            color="primary" 
            className = "font-semibold hover:scale-105 transition-transform duration-200"
            onPress={() => onEdit(question)}>
            Edit  
          </Button>
          <Button 
            size="sm" 
            variant="flat"
            color="danger" 
            className = "font-semibold hover:scale-105 transition-transform duration-200"
            onPress={() => question._id && onDelete(question._id)}>
            Delete
          </Button>
        </div>
      );
    default:
      return null;
  }
}

export default function QuestionTable({ questions, isAdmin, onEdit, onDelete }: QuestionTableProps) {

  // Only admin should see the actions column, so we filter it out for non-admin users
  const headerColumns = isAdmin ? allColumns : allColumns.filter(col => col.uid !== "actions");

  return (
    <div>
      <Table 
        aria-label="Questions table" 
        className="mt-2"
        classNames={{
          base: "max-w-full",
          table: "min-w-full",
          tr: "hover:bg-gray-50 transition-colors duration-200 cursor-pointer text-base",
          td: "py-5 px-4",
          th: "text-sm font-semibold text-gray-600 bg-gray-100/50 uppercase tracking-wider py-4"
        }}
      >
        <TableHeader columns={headerColumns}>
          {(column) => (
            <TableColumn key={column.uid}>
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={questions} emptyContent="No questions found.">
          {(item) =>
            <TableRow key={item._id}>
              {(columnKey) => (
                <TableCell> 
                  {renderCell(item, columnKey as string, onEdit, onDelete)}
                </TableCell>
              )}
            </TableRow>
          }
        </TableBody>
      </Table>
    </div>
  );
}