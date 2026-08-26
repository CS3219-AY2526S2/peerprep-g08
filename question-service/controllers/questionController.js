const Question = require('../models/questionModel');

const REQUIRED_QUESTION_FIELDS = [
    'title',
    'question',
    'answer',
    'difficulty',
    'category'
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getQuestionData = ({
    title,
    question,
    answer,
    difficulty,
    category,
    tags,
    examples
}) => ({
    title,
    question,
    answer,
    difficulty,
    category,
    tags,
    examples
});

const hasMissingRequiredField = (questionData) =>
    REQUIRED_QUESTION_FIELDS.some((field) => !questionData[field]);

// @desc    Get all questions
// @route   GET /api/questions
// @access  Public  
const getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.find({})
        return res.status(200).json(questions)
    } catch (err) {
        console.error("[QUESTION-SERVICE] Error getting all questions:", err);
        return res.status(500).json({ message: "Internal server error" })
    }
}

// @desc    Get question by ID
// @route   GET /api/questions/:id
// @access  Public
const getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)

        if (!question) {
            return res.status(404).json({ message: "Question not found" })
        }

        return res.status(200).json(question)
    } catch (err) {
        console.error("[QUESTION-SERVICE] Error getting question by ID:", err);
        return res.status(400).json({ message: "Invalid question ID" })
    }
}

// @desc    Get questions by title. The regex is case-insensitive and matches any question whose title contains the search term.
// @route   GET /api/questions/title/:title
// @access  Public
const getQuestionsByTitle = async (req, res) => {
    try {
        const questions = await Question.find({
            title: { $regex: escapeRegex(req.params.title), $options: "i" }
        })

        return res.status(200).json(questions)
    } catch (err) {
        console.error("[QUESTION-SERVICE] Error searching questions by title:", err);
        return res.status(400).json({ message: "No questions found for this title" })
    }
}

// @desc    Get questions by category
// @route   GET /api/questions/category/:category
// @access  Public
const getQuestionsByCategory = async (req, res) => {
    try {
        const questions = await Question.find({ category: req.params.category })
            .collation({ locale: 'en', strength: 2 })

        if (questions.length === 0) {
            return res.status(404).json({ message: "No questions found for this category" })
        }

        return res.status(200).json(questions)
    } catch (err) {
        console.error("[QUESTION-SERVICE] Error searching questions by category:", err);
        return res.status(400).json({ message: "Invalid category" })
    }
}

// @desc    Get questions by difficulty
// @route   GET /api/questions/difficulty/:difficulty
// @access  Public
const getQuestionsByDifficulty = async (req, res) => {
    try {
        const questions = await Question.find({ difficulty: req.params.difficulty })

        if (!questions || questions.length === 0) {
            return res.status(404).json({ message: "No questions found for this difficulty" })
        }

        return res.status(200).json(questions)
    } catch (err) {
        console.error("[QUESTION-SERVICE] Error searching questions by difficulty:", err);
        return res.status(400).json({ message: "Invalid difficulty" })
    }
}

// @desc    Search questions by title, description, or tags with optional filters for difficulty, category, and tags. 
// Uses MongoDB Atlas Search for full-text search and relevance scoring.
// @route   GET /api/questions/search
// @access  Public
const searchQuestions = async (req, res) => {
    try {
        const { q, difficulty, category, tags } = req.query

        const mustFilters = []

        if (difficulty) {
            mustFilters.push({
                equals: {
                    path: "difficulty",
                    value: difficulty
                }
            })
        }

        if (category) {
            const categories = category.split(",")

            mustFilters.push({
                text: {
                    path: "category",
                    query: categories
                }
            })
        }

        if (tags) {
            const tagList = tags.split(",")

            mustFilters.push({
                text: {
                    path: "tags",
                    query: tagList
                }
            })
        }

        const pipeline = [
            {
                $search: {
                    index: "question_search",
                    compound: {
                        must: q
                            ? [{
                                text: {
                                    query: q,
                                    path: ["title", "question", "tags"],
                                    fuzzy: {
                                        maxEdits: 2,
                                        prefixLength: 1
                                    }
                                }
                            }]
                            : [],
                        filter: mustFilters
                    }
                }
            },
            {
                $addFields: {
                    score: { $meta: "searchScore" }
                }
            },
            {
                $sort: { score: -1 }
            },
            {
                $limit: 20
            }
        ]

        const questions = await Question.aggregate(pipeline)

        return res.status(200).json(questions)

    } catch (err) {
        console.error("[QUESTION-SERVICE] Search failed:", err);
        return res.status(500).json({ message: "Search failed", error: err.message })
    }
}

// @desc    Add a new question
// @route   POST /api/questions
// @access  Public
const addQuestion = async (req, res) => {
    const questionData = getQuestionData(req.body)

    if (hasMissingRequiredField(questionData)) {
        return res.status(400).json({ message: 'Please provide all required fields' })
    }   

    try {
        const newQuestion = await Question.create(questionData)
        return res.status(201).json(newQuestion)
    } catch (err) {
        console.error("[QUESTION-SERVICE] Error adding question:", err);
        return res.status(400).json({ message: err.message })
    }   
}

// @desc    Update a question
// @route   PUT /api/questions/:id
// @access  Public
const updateQuestion = async (req, res) => {
    const questionData = getQuestionData(req.body)

    if (hasMissingRequiredField(questionData)) {
        return res.status(400).json({ message: 'Please provide all required fields' })
    }   

    try {
        const updatedQuestion = await Question.findById(req.params.id)
        
        // Refatorado: Adicionado verificação para evitar manipulação de null pointer
        if (!updatedQuestion) {
            return res.status(404).json({ message: "Question not found" });
        }

        Object.assign(updatedQuestion, questionData)

        await updatedQuestion.save()

        return res.status(200).json(updatedQuestion)
    } catch (err) {
        console.error("[QUESTION-SERVICE] Error updating question:", err);
        return res.status(400).json({ message: "Invalid question data" })
    }
}

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Public
const deleteQuestion = async (req, res) => {
    try {
        const deletedQuestion = await Question.findById(req.params.id)
        
        // Refatorado: Adicionado verificação para evitar manipulação de null pointer
        if (!deletedQuestion) {
            return res.status(404).json({ message: "Question not found" });
        }

        await deletedQuestion.deleteOne()
        return res.status(200).json({ message: "Question deleted successfully" })
    } catch (err) {
        console.error("[QUESTION-SERVICE] Error deleting question:", err);
        return res.status(400).json({ message: "Invalid question ID" })
    }
}

module.exports = {
    getAllQuestions,
    getQuestionById,
    getQuestionsByTitle,
    getQuestionsByCategory,
    getQuestionsByDifficulty,
    searchQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
}
