const express = require('express');
const router = express.Router();

const { getAllQuestions, 
        getQuestionById, 
        getQuestionsByTitle, 
        getQuestionsByCategory, 
        getQuestionsByDifficulty, 
        searchQuestions,
        addQuestion, 
        updateQuestion, 
        deleteQuestion } 
        = require('../controllers/questionController');

router.route('/').get(getAllQuestions)
router.route('/search').get(searchQuestions)
router.route('/title/:title').get(getQuestionsByTitle)
router.route('/category/:category').get(getQuestionsByCategory)
router.route('/difficulty/:difficulty').get(getQuestionsByDifficulty)

router.route('/:id').get(getQuestionById) // get question by ID should be after the more specific routes to avoid conflicts

router.route('/').post(addQuestion)
router.route('/:id').put(updateQuestion)
router.route('/:id').delete(deleteQuestion)

module.exports = router;