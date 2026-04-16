import { useState } from "react";
import { getErrorMessage } from "../../../utils/error-handler";

export default function AdminUpgrade() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("You must be logged in to upgrade.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_USER_API_URL}/users/upgrade`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upgrade");
      }

      setMessage("Successfully upgraded to Admin!");
    } catch (error) {
      console.error("Error:", error);
      setMessage(getErrorMessage(error) || "Something went wrong");
    }
  };

  return (
    <div className="container">
      <div className="box">
        <h3>Upgrade to Admin</h3>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Admin Code:
            <input
              className="input"
              type="text"
              value={code}
              placeholder="Enter 8-character code"
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button className="button" type="submit">
            Submit Code
          </button>

          {message}
        </form>
      </div>
    </div>
  );
}
