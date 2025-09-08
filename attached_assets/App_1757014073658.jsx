import React, { useState } from "react";
import ReactConfetti from "react-confetti";
import Start from "./components/Start";
import Quiz from "./components/Quiz";
import "./App.css";

function App() {
  const [showMenu, changeMenu] = useState(true);
  const [userSelectedOptions, setUserSelectedOptions] = useState([
    "user0",
    "user1",
    "user2",
    "user3",
    "user4"
  ]);
  const [correctAnswers, setCorrectAnswers] = useState([
    "user10",
    "user11",
    "user12",
    "user13",
    "user14"
  ]);
  const [quiz, setQuiz] = useState([]);
  const [showAnswers, setIfShowTime] = useState(false);
  const [numOfCorrectAnswers, setNumberOfCorrectAnswers] = useState(0);
  const [showUi, setShowUi] = useState(false);
  const [errorState, setErrorState] = useState(false);
  const [resetGameState, setResetGame] = useState(false);
  const [disabledButtons, setDisabledButtons] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [backup, setBackUp] = useState([]);

  function getQuiz() {
    setShowUi(false);
    fetch("https://opentdb.com/api.php?amount=5&type=multiple&encode=url3986")
      .then((res) => res.json())
      .then((data) => setQuiz(data["results"]))
      .then(() =>
        setInterval(function x() {
          setShowUi(true);
        }, 3000)
      )
      .catch((err) => setErrorState(true));
    setDisabledButtons(false);
  }

  function RenderError() {
    return (
      <div>
        <center>
          <h1>An Error Occurred</h1>
          <p>Please check your network connection or try again later</p>
        </center>
      </div>
    );
  }

  function resetGame() {
    setShowUi(false);
    setIfShowTime((prevState) => !prevState);
    setUserSelectedOptions(["user0", "user1", "user2", "user3", "user4"]);
    setCorrectAnswers(["user10", "user11", "user12", "user13", "user14"]);
    setResetGame((prevState) => !prevState);
    setShowAnswerKey(false);
    setAllCorrect(false);
  }

  function testParentState(value, index, correctOption) {
    let target = value.target.value;
    let i = index;
    let prevState = [...userSelectedOptions];
    prevState[i] = target;
    setUserSelectedOptions(prevState);

    let option = correctOption;
    let answers = [...correctAnswers];
    answers[i] = option;
    setCorrectAnswers(answers);
  }

  function checkAnswers() {
    if (
      !userSelectedOptions.includes("user0") &&
      !userSelectedOptions.includes("user1") &&
      !userSelectedOptions.includes("user2") &&
      !userSelectedOptions.includes("user3") &&
      !userSelectedOptions.includes("user4")
    ) {
      let numberOfCorrect = 0;
      for (let i = 0; i < correctAnswers.length; i++) {
        if (correctAnswers[i] === userSelectedOptions[i]) {
          numberOfCorrect++;
        }
      }
      setNumberOfCorrectAnswers(numberOfCorrect);
      setIfShowTime((prevState) => !prevState);
      setDisabledButtons(true);
      setShowAnswerKey(true);
      if (numberOfCorrect === 5) {
        setAllCorrect(true);
      }
      return numberOfCorrect;
    }
  }

  React.useEffect(() => {
    getQuiz();
  }, [resetGameState]);

  const renderQuiz = quiz.map((val) => {
    let question = decodeURIComponent(val["question"]);
    let correctAnswer = decodeURIComponent(val["correct_answer"]);
    let wrongOptions = val["incorrect_answers"];
    let allOpt = [];
    allOpt.push(correctAnswer);
    wrongOptions.map((x) => allOpt.push(x));

    let determine = allOpt.every((val) => val.length >= 25);

    return (
      <Quiz
        question={question}
        options={wrongOptions}
        correctOption={correctAnswer}
        testState={testParentState}
        quizIndex={quiz.indexOf(val)}
        disabled={disabledButtons}
        showAnswerKey={showAnswerKey}
      />
    );
  });

  function toggleMenu() {
    changeMenu((prevState) => !prevState);
  }

  function RenderBottom() {
    if (!showAnswers) {
      if (
        !userSelectedOptions.includes("user0") &&
        !userSelectedOptions.includes("user1") &&
        !userSelectedOptions.includes("user2") &&
        !userSelectedOptions.includes("user3") &&
        !userSelectedOptions.includes("user4")
      ) {
        return (
          <button className="check-answers-btn" onClick={() => checkAnswers()}>
            Check Answers
          </button>
        );
      } else {
        return (
          <div className="urge-to-select">
            <p>{"Select The Options"}</p>
          </div>
        );
      }
    } else if (showAnswers) {
      return (
        <div className="results">
          You scored {numOfCorrectAnswers}/5 correct answers
          <button className="new-game-btn" onClick={() => resetGame()}>
            Play Again
          </button>
        </div>
      );
    }
  }

  return (
    <div className="app">
      <div className="top-blob">
        <img src="../src/assets/bottomblob.png" alt="blob" />
      </div>
      {!errorState && (
        <>
          {allCorrect && <ReactConfetti />}
          {showMenu && <Start toggleClick={toggleMenu} />}
          <center>
          {!showMenu && renderQuiz}
          {!showMenu && showUi && <RenderBottom />}
          </center>
        </>
      )}
      {errorState && <RenderError />}
      <div className="bottom-blob">
        <img src="./src/assets/topblob.png" alt="blob" />
      </div>
    </div>
  );
}

export default App;
