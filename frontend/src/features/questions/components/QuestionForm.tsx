import React from 'react';
import { type Question } from '../types/question.types.ts';
import { Input, Button, Select, SelectItem, Textarea } from "@heroui/react";

interface QuestionFormProps {
  formData: Question;
  editingId: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const topics = ["Strings", "Arrays", "Stacks", "Queues", "Trees", "Graphs"];
const difficulties = ["easy", "medium", "hard"];

export default function QuestionForm({ formData, editingId, onChange, onSubmit, onCancel }: QuestionFormProps) {
  return (
    <div className="max-w-3xl w-full">
      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <Input
          label="Title"
          name="title"
          placeholder="e.g. Two Sum"
          value={formData.title}
          onChange={onChange}
          variant="bordered"
          labelPlacement="outside"
          classNames={{ 
            label : "font-semibold text-gray-700 text-base",
            inputWrapper: "py-2"
          }}
          isRequired
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mb-4">
          <Select
            label="Topic"
            name="category"
            placeholder="Select Topic"
            selectorIcon={<></>}
            selectedKeys={formData.category ? [formData.category] : []}
            onChange={onChange}
            variant="bordered"
            labelPlacement='outside'
            classNames={{ 
              label : "font-semibold text-gray-700 text-base",
              trigger: "py-2"
            }}
            isRequired
          >
            {topics.map((t) => (
              <SelectItem key={t.toLowerCase().replace(' ', '-')}>
                {t}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Difficulty"
            name="difficulty"
            placeholder="Select Difficulty"
            selectorIcon={<></>}
            selectedKeys={formData.difficulty ? [formData.difficulty] : []}
            onChange={onChange}
            variant="bordered"
            labelPlacement="outside"
            classNames={{ 
              label : "font-semibold text-gray-700 text-base",
              trigger: "py-2"
            }} 
            isRequired
          >
            {difficulties.map((d) => (
              <SelectItem key={d} className="capitalize">
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </SelectItem>
            ))}
          </Select>
        </div>

        <Textarea
          label="Question Description"
          name="question"
          placeholder="Describe the problem..."
          value={formData.question}
          onChange={onChange}
          minRows={5}
          labelPlacement='outside'
          classNames={{ 
            label: "font-semibold text-gray-700 text-base",
            input: "py-2"
          }}
          variant="bordered"
          isRequired
        />

        <Textarea
          label="Solution"
          name="answer"
          placeholder="Type the solution..."
          value={formData.answer}
          onChange={onChange}
          minRows={5}
          labelPlacement='outside'
          classNames={{ 
            label: "font-semibold text-gray-700 text-base",
            input: "py-2" 
          }}
          variant="bordered"
          isRequired
        />

        <div className="flex gap-4 mt-4 justify-end">
          <Button 
            type="button" 
            variant="flat"
            onPress={onCancel}
            className="font-medium px-6"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            color="warning" 
            variant="flat"
            className="text-black font-semibold px-8"
          >
            {editingId ? "Save Changes" : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
