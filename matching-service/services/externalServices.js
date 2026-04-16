const QUESTION_SERVICE_URL =
  process.env.QUESTION_SERVICE_URL || "http://localhost:8080";
const COLLAB_SERVICE_URL =
  process.env.COLLAB_SERVICE_URL || "http://localhost:3219";

async function fetchQuestion(category, difficulty) {
  // if no category provided, fetch all questions
  const url = category
    ? `${QUESTION_SERVICE_URL}/api/questions/category/${encodeURIComponent(category)}`
    : `${QUESTION_SERVICE_URL}/api/questions`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const questions = await res.json();

    // filter based on difficulty if provided
    const filtered = difficulty
      ? questions.filter(
          (q) => q.difficulty.toLowerCase() === difficulty.toLowerCase(),
        )
      : questions;

    if (filtered.length === 0) return null;
    // return random question from filtered list
    return filtered[Math.floor(Math.random() * filtered.length)];
  } catch (err) {
    console.error("fetchQuestion failed:", err.message);
    return null;
  }
}

async function createCollaborationRoom(question, allowedUsers = []) {
  try {
    const res = await fetch(`${COLLAB_SERVICE_URL}/rooms/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question?._id, allowedUsers }),
    });

    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error("createCollaborationRoom failed:", err.message);
    return null;
  }
}

module.exports = { fetchQuestion, createCollaborationRoom };
